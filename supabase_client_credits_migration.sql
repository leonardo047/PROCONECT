-- =====================================================
-- MIGRACAO: Sistema de Creditos para CLIENTES
-- =====================================================
-- Este script adiciona suporte para:
-- 1. Creditos avulsos para clientes
-- 2. Creditos infinitos liberados pelo admin
-- 3. Historico de transacoes de creditos para clientes
-- =====================================================

-- =====================================================
-- PARTE 1: Novos campos na tabela profiles (clientes)
-- =====================================================

-- Creditos avulsos disponiveis
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS credits_balance INTEGER DEFAULT 0;

-- Creditos infinitos (liberados pelo admin)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS unlimited_credits BOOLEAN DEFAULT FALSE;

-- Data de expiracao dos creditos infinitos (NULL = permanente)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS unlimited_credits_expires_at TIMESTAMPTZ NULL;

-- Admin que concedeu os creditos infinitos
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS unlimited_credits_granted_by UUID NULL;

-- Data em que os creditos infinitos foram concedidos
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS unlimited_credits_granted_at TIMESTAMPTZ NULL;

-- Comentarios para documentacao
COMMENT ON COLUMN profiles.credits_balance IS 'Saldo de creditos avulsos do cliente';
COMMENT ON COLUMN profiles.unlimited_credits IS 'Se true, cliente tem creditos infinitos';
COMMENT ON COLUMN profiles.unlimited_credits_expires_at IS 'Data de expiracao dos creditos infinitos. NULL significa permanente';
COMMENT ON COLUMN profiles.unlimited_credits_granted_by IS 'UUID do admin que concedeu os creditos infinitos';
COMMENT ON COLUMN profiles.unlimited_credits_granted_at IS 'Data em que os creditos infinitos foram concedidos';

-- =====================================================
-- PARTE 2: Adicionar suporte a clientes na tabela credit_transactions
-- =====================================================

-- Adicionar coluna para ID do cliente (user_id da tabela profiles)
ALTER TABLE credit_transactions
ADD COLUMN IF NOT EXISTS user_id UUID NULL;

-- Adicionar coluna para tipo de usuario (professional ou client)
ALTER TABLE credit_transactions
ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'professional' CHECK (user_type IN ('professional', 'client'));

-- Tornar professional_id opcional (pode ser null para transacoes de clientes)
ALTER TABLE credit_transactions
ALTER COLUMN professional_id DROP NOT NULL;

-- Indice para consultas de clientes
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user
  ON credit_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_type
  ON credit_transactions(user_type);

-- =====================================================
-- PARTE 3: RLS para transacoes de clientes
-- =====================================================

-- Clientes podem ver suas proprias transacoes
DROP POLICY IF EXISTS "Clients can view own transactions" ON credit_transactions;
CREATE POLICY "Clients can view own transactions"
  ON credit_transactions
  FOR SELECT
  USING (
    user_id = auth.uid() AND user_type = 'client'
  );

-- =====================================================
-- PARTE 4: Funcao para verificar creditos de cliente
-- =====================================================

CREATE OR REPLACE FUNCTION check_client_credits(client_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  client RECORD;
BEGIN
  -- Buscar dados do cliente
  SELECT
    credits_balance,
    unlimited_credits,
    unlimited_credits_expires_at,
    referral_credits
  INTO client
  FROM profiles
  WHERE id = client_uuid;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'can_use', false,
      'reason', 'Cliente nao encontrado',
      'credits_balance', 0,
      'has_unlimited', false
    );
  END IF;

  -- Verificar se tem creditos infinitos validos
  IF client.unlimited_credits = true THEN
    IF client.unlimited_credits_expires_at IS NULL OR client.unlimited_credits_expires_at > now() THEN
      RETURN json_build_object(
        'can_use', true,
        'reason', 'Creditos infinitos ativos',
        'credits_balance', COALESCE(client.credits_balance, 0),
        'has_unlimited', true,
        'unlimited_expires_at', client.unlimited_credits_expires_at,
        'referral_credits', COALESCE(client.referral_credits, 0)
      );
    ELSE
      -- Creditos infinitos expiraram - atualizar status
      UPDATE profiles
      SET unlimited_credits = false,
          unlimited_credits_expires_at = NULL
      WHERE id = client_uuid;

      -- Registrar expiracao
      INSERT INTO credit_transactions (
        user_id,
        user_type,
        transaction_type,
        amount,
        balance_after,
        unlimited_after,
        reason
      ) VALUES (
        client_uuid,
        'client',
        'expire_unlimited',
        0,
        COALESCE(client.credits_balance, 0),
        false,
        'Creditos infinitos expiraram automaticamente'
      );
    END IF;
  END IF;

  -- Verificar creditos avulsos
  IF COALESCE(client.credits_balance, 0) > 0 THEN
    RETURN json_build_object(
      'can_use', true,
      'reason', 'Creditos avulsos disponiveis',
      'credits_balance', client.credits_balance,
      'has_unlimited', false,
      'referral_credits', COALESCE(client.referral_credits, 0)
    );
  END IF;

  -- Verificar creditos de indicacao
  IF COALESCE(client.referral_credits, 0) > 0 THEN
    RETURN json_build_object(
      'can_use', true,
      'reason', 'Creditos de indicacao disponiveis',
      'credits_balance', 0,
      'has_unlimited', false,
      'referral_credits', client.referral_credits
    );
  END IF;

  -- Sem creditos
  RETURN json_build_object(
    'can_use', false,
    'reason', 'Sem creditos disponiveis',
    'credits_balance', 0,
    'has_unlimited', false,
    'referral_credits', 0
  );
END;
$$;

-- =====================================================
-- PARTE 5: Funcao para admin adicionar creditos a cliente
-- =====================================================

CREATE OR REPLACE FUNCTION admin_add_client_credits(
  client_uuid UUID,
  credit_amount INTEGER,
  reason_text TEXT,
  admin_uuid UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance INTEGER;
  new_balance INTEGER;
BEGIN
  -- Verificar se e admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = admin_uuid AND role = 'admin') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Permissao negada. Apenas admins podem adicionar creditos.'
    );
  END IF;

  -- Buscar saldo atual
  SELECT credits_balance INTO current_balance
  FROM profiles
  WHERE id = client_uuid;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cliente nao encontrado'
    );
  END IF;

  -- Calcular novo saldo
  new_balance := COALESCE(current_balance, 0) + credit_amount;

  -- Atualizar saldo
  UPDATE profiles
  SET credits_balance = new_balance
  WHERE id = client_uuid;

  -- Registrar transacao
  INSERT INTO credit_transactions (
    user_id,
    user_type,
    transaction_type,
    amount,
    balance_after,
    unlimited_after,
    performed_by,
    reason
  ) VALUES (
    client_uuid,
    'client',
    'add_credits',
    credit_amount,
    new_balance,
    (SELECT unlimited_credits FROM profiles WHERE id = client_uuid),
    admin_uuid,
    reason_text
  );

  RETURN json_build_object(
    'success', true,
    'previous_balance', current_balance,
    'new_balance', new_balance,
    'amount_added', credit_amount
  );
END;
$$;

-- =====================================================
-- PARTE 6: Funcao para admin liberar creditos infinitos a cliente
-- =====================================================

CREATE OR REPLACE FUNCTION admin_grant_client_unlimited(
  client_uuid UUID,
  expires_at_date TIMESTAMPTZ,
  reason_text TEXT,
  admin_uuid UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  -- Verificar se e admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = admin_uuid AND role = 'admin') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Permissao negada. Apenas admins podem liberar creditos infinitos.'
    );
  END IF;

  -- Buscar saldo atual
  SELECT credits_balance INTO current_balance
  FROM profiles
  WHERE id = client_uuid;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cliente nao encontrado'
    );
  END IF;

  -- Atualizar para creditos infinitos
  UPDATE profiles
  SET
    unlimited_credits = true,
    unlimited_credits_expires_at = expires_at_date,
    unlimited_credits_granted_by = admin_uuid,
    unlimited_credits_granted_at = now()
  WHERE id = client_uuid;

  -- Registrar transacao
  INSERT INTO credit_transactions (
    user_id,
    user_type,
    transaction_type,
    amount,
    balance_after,
    unlimited_after,
    expires_at,
    performed_by,
    reason
  ) VALUES (
    client_uuid,
    'client',
    'grant_unlimited',
    0,
    COALESCE(current_balance, 0),
    true,
    expires_at_date,
    admin_uuid,
    reason_text
  );

  RETURN json_build_object(
    'success', true,
    'unlimited_credits', true,
    'expires_at', expires_at_date
  );
END;
$$;

-- =====================================================
-- PARTE 7: Funcao para admin revogar creditos infinitos de cliente
-- =====================================================

CREATE OR REPLACE FUNCTION admin_revoke_client_unlimited(
  client_uuid UUID,
  reason_text TEXT,
  admin_uuid UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  -- Verificar se e admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = admin_uuid AND role = 'admin') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Permissao negada. Apenas admins podem revogar creditos infinitos.'
    );
  END IF;

  -- Buscar saldo atual
  SELECT credits_balance INTO current_balance
  FROM profiles
  WHERE id = client_uuid;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cliente nao encontrado'
    );
  END IF;

  -- Remover creditos infinitos
  UPDATE profiles
  SET
    unlimited_credits = false,
    unlimited_credits_expires_at = NULL,
    unlimited_credits_granted_by = NULL,
    unlimited_credits_granted_at = NULL
  WHERE id = client_uuid;

  -- Registrar transacao
  INSERT INTO credit_transactions (
    user_id,
    user_type,
    transaction_type,
    amount,
    balance_after,
    unlimited_after,
    performed_by,
    reason
  ) VALUES (
    client_uuid,
    'client',
    'revoke_unlimited',
    0,
    COALESCE(current_balance, 0),
    false,
    admin_uuid,
    reason_text
  );

  RETURN json_build_object(
    'success', true,
    'unlimited_credits', false,
    'credits_balance', current_balance
  );
END;
$$;

-- =====================================================
-- FINALIZACAO
-- =====================================================

-- Garantir valores padrao para todos os clientes
UPDATE profiles
SET
  credits_balance = COALESCE(credits_balance, 0),
  unlimited_credits = COALESCE(unlimited_credits, false)
WHERE credits_balance IS NULL OR unlimited_credits IS NULL;

-- Log de sucesso
DO $$
BEGIN
  RAISE NOTICE 'Migracao de creditos para CLIENTES concluida com sucesso!';
  RAISE NOTICE 'Novos campos adicionados em profiles: credits_balance, unlimited_credits, unlimited_credits_expires_at, unlimited_credits_granted_by, unlimited_credits_granted_at';
  RAISE NOTICE 'Funcoes criadas: check_client_credits, admin_add_client_credits, admin_grant_client_unlimited, admin_revoke_client_unlimited';
END $$;
