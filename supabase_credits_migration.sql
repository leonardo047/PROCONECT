-- =====================================================
-- MIGRACAO: Sistema de Creditos para Profissionais
-- =====================================================
-- Este script adiciona suporte para:
-- 1. Creditos avulsos (comprados pelo profissional)
-- 2. Creditos infinitos (liberados pelo admin ou assinatura)
-- 3. Historico completo de transacoes de creditos
-- =====================================================

-- =====================================================
-- PARTE 1: Novos campos na tabela professionals
-- =====================================================

-- Creditos avulsos disponiveis
ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS credits_balance INTEGER DEFAULT 0;

-- Creditos infinitos (liberados pelo admin ou por assinatura)
ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS unlimited_credits BOOLEAN DEFAULT FALSE;

-- Data de expiracao dos creditos infinitos (NULL = permanente)
ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS unlimited_credits_expires_at TIMESTAMPTZ NULL;

-- Admin que concedeu os creditos infinitos
ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS unlimited_credits_granted_by UUID NULL;

-- Data em que os creditos infinitos foram concedidos
ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS unlimited_credits_granted_at TIMESTAMPTZ NULL;

-- Comentarios para documentacao
COMMENT ON COLUMN professionals.credits_balance IS 'Saldo de creditos avulsos disponiveis para responder cotacoes';
COMMENT ON COLUMN professionals.unlimited_credits IS 'Se true, profissional tem creditos infinitos (pode responder sem limite)';
COMMENT ON COLUMN professionals.unlimited_credits_expires_at IS 'Data de expiracao dos creditos infinitos. NULL significa permanente';
COMMENT ON COLUMN professionals.unlimited_credits_granted_by IS 'UUID do admin que concedeu os creditos infinitos';
COMMENT ON COLUMN professionals.unlimited_credits_granted_at IS 'Data em que os creditos infinitos foram concedidos';

-- =====================================================
-- PARTE 2: Tabela de historico de transacoes
-- =====================================================

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,

  -- Tipo de transacao
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'grant_unlimited',    -- Admin liberou creditos infinitos
    'revoke_unlimited',   -- Admin revogou creditos infinitos
    'add_credits',        -- Adicao de creditos avulsos (admin ou bonus)
    'use_credit',         -- Uso de 1 credito (responder cotacao)
    'purchase_credits',   -- Compra de creditos via pagamento
    'expire_unlimited',   -- Creditos infinitos expiraram automaticamente
    'refund_credit'       -- Estorno de credito (ex: cotacao cancelada)
  )),

  -- Detalhes da transacao
  amount INTEGER DEFAULT 0,              -- Quantidade de creditos (+ ou -)
  balance_after INTEGER,                 -- Saldo de creditos apos transacao
  unlimited_after BOOLEAN DEFAULT FALSE, -- Status de infinito apos transacao
  expires_at TIMESTAMPTZ,                -- Data de expiracao (se aplicavel)

  -- Contexto da transacao
  reason TEXT,                           -- Motivo/descricao (ex: "Teste gratis por 30 dias")
  performed_by UUID,                     -- Admin que executou (se aplicavel)
  quote_response_id UUID,                -- ID da resposta de cotacao (se foi uso)
  payment_id UUID,                       -- ID do pagamento (se foi compra)

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_credit_transactions_professional
  ON credit_transactions(professional_id);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_created
  ON credit_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_type
  ON credit_transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_performed_by
  ON credit_transactions(performed_by);

-- Comentarios para documentacao
COMMENT ON TABLE credit_transactions IS 'Historico de todas as transacoes de creditos dos profissionais';
COMMENT ON COLUMN credit_transactions.transaction_type IS 'Tipo da transacao: grant_unlimited, revoke_unlimited, add_credits, use_credit, purchase_credits, expire_unlimited, refund_credit';
COMMENT ON COLUMN credit_transactions.amount IS 'Quantidade de creditos adicionados (+) ou removidos (-). Para unlimited, usar 0';
COMMENT ON COLUMN credit_transactions.balance_after IS 'Saldo de creditos avulsos apos esta transacao';
COMMENT ON COLUMN credit_transactions.unlimited_after IS 'Status de creditos infinitos apos esta transacao';
COMMENT ON COLUMN credit_transactions.reason IS 'Motivo ou descricao da transacao (ex: "Promocao 30 dias", "Compra de 10 creditos")';
COMMENT ON COLUMN credit_transactions.performed_by IS 'UUID do admin que executou a acao, se aplicavel';
COMMENT ON COLUMN credit_transactions.quote_response_id IS 'UUID da quote_response quando a transacao foi uso de credito';
COMMENT ON COLUMN credit_transactions.payment_id IS 'UUID do payment quando a transacao foi uma compra';

-- =====================================================
-- PARTE 3: RLS (Row Level Security) para credit_transactions
-- =====================================================

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Profissionais podem ver apenas suas proprias transacoes
CREATE POLICY "Professionals can view own transactions"
  ON credit_transactions
  FOR SELECT
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );

-- Admins podem ver todas as transacoes
CREATE POLICY "Admins can view all transactions"
  ON credit_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins podem inserir transacoes
CREATE POLICY "Admins can insert transactions"
  ON credit_transactions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Sistema pode inserir transacoes (para uso automatico)
CREATE POLICY "Service role can insert transactions"
  ON credit_transactions
  FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- PARTE 4: Funcao para verificar creditos disponiveis
-- =====================================================

CREATE OR REPLACE FUNCTION check_professional_credits(professional_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prof RECORD;
  result JSON;
BEGIN
  -- Buscar dados do profissional
  SELECT
    credits_balance,
    unlimited_credits,
    unlimited_credits_expires_at,
    plan_type,
    plan_active
  INTO prof
  FROM professionals
  WHERE id = professional_uuid;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'can_respond', false,
      'reason', 'Profissional nao encontrado',
      'credits_balance', 0,
      'has_unlimited', false
    );
  END IF;

  -- Verificar se tem creditos infinitos validos
  IF prof.unlimited_credits = true THEN
    -- Verificar se nao expirou
    IF prof.unlimited_credits_expires_at IS NULL
       OR prof.unlimited_credits_expires_at > now() THEN
      RETURN json_build_object(
        'can_respond', true,
        'reason', 'Creditos infinitos ativos',
        'credits_balance', prof.credits_balance,
        'has_unlimited', true,
        'unlimited_expires_at', prof.unlimited_credits_expires_at
      );
    ELSE
      -- Creditos infinitos expiraram - atualizar status
      UPDATE professionals
      SET unlimited_credits = false,
          unlimited_credits_expires_at = NULL
      WHERE id = professional_uuid;

      -- Registrar expiracao
      INSERT INTO credit_transactions (
        professional_id,
        transaction_type,
        amount,
        balance_after,
        unlimited_after,
        reason
      ) VALUES (
        professional_uuid,
        'expire_unlimited',
        0,
        prof.credits_balance,
        false,
        'Creditos infinitos expiraram automaticamente'
      );
    END IF;
  END IF;

  -- Verificar creditos avulsos
  IF prof.credits_balance > 0 THEN
    RETURN json_build_object(
      'can_respond', true,
      'reason', 'Creditos avulsos disponiveis',
      'credits_balance', prof.credits_balance,
      'has_unlimited', false
    );
  END IF;

  -- Sem creditos disponiveis
  RETURN json_build_object(
    'can_respond', false,
    'reason', 'Sem creditos disponiveis. Compre creditos ou assine um plano.',
    'credits_balance', 0,
    'has_unlimited', false
  );
END;
$$;

-- =====================================================
-- PARTE 5: Funcao para usar 1 credito
-- =====================================================

CREATE OR REPLACE FUNCTION use_professional_credit(
  professional_uuid UUID,
  quote_response_uuid UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prof RECORD;
  new_balance INTEGER;
BEGIN
  -- Buscar dados do profissional com lock para evitar race condition
  SELECT
    credits_balance,
    unlimited_credits,
    unlimited_credits_expires_at
  INTO prof
  FROM professionals
  WHERE id = professional_uuid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Profissional nao encontrado'
    );
  END IF;

  -- Verificar se tem creditos infinitos validos
  IF prof.unlimited_credits = true AND
     (prof.unlimited_credits_expires_at IS NULL OR prof.unlimited_credits_expires_at > now()) THEN

    -- Registrar uso (sem debitar)
    INSERT INTO credit_transactions (
      professional_id,
      transaction_type,
      amount,
      balance_after,
      unlimited_after,
      quote_response_id,
      reason
    ) VALUES (
      professional_uuid,
      'use_credit',
      0, -- Nao debita quando tem infinito
      prof.credits_balance,
      true,
      quote_response_uuid,
      'Uso com creditos infinitos'
    );

    RETURN json_build_object(
      'success', true,
      'used_unlimited', true,
      'credits_balance', prof.credits_balance
    );
  END IF;

  -- Verificar se tem creditos avulsos
  IF prof.credits_balance <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Sem creditos disponiveis'
    );
  END IF;

  -- Debitar 1 credito
  new_balance := prof.credits_balance - 1;

  UPDATE professionals
  SET credits_balance = new_balance
  WHERE id = professional_uuid;

  -- Registrar transacao
  INSERT INTO credit_transactions (
    professional_id,
    transaction_type,
    amount,
    balance_after,
    unlimited_after,
    quote_response_id,
    reason
  ) VALUES (
    professional_uuid,
    'use_credit',
    -1,
    new_balance,
    false,
    quote_response_uuid,
    'Uso de credito avulso para responder cotacao'
  );

  RETURN json_build_object(
    'success', true,
    'used_unlimited', false,
    'credits_balance', new_balance
  );
END;
$$;

-- =====================================================
-- PARTE 6: Funcao para admin adicionar creditos
-- =====================================================

CREATE OR REPLACE FUNCTION admin_add_credits(
  professional_uuid UUID,
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
  FROM professionals
  WHERE id = professional_uuid;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Profissional nao encontrado'
    );
  END IF;

  -- Calcular novo saldo
  new_balance := COALESCE(current_balance, 0) + credit_amount;

  -- Atualizar saldo
  UPDATE professionals
  SET credits_balance = new_balance
  WHERE id = professional_uuid;

  -- Registrar transacao
  INSERT INTO credit_transactions (
    professional_id,
    transaction_type,
    amount,
    balance_after,
    unlimited_after,
    performed_by,
    reason
  ) VALUES (
    professional_uuid,
    'add_credits',
    credit_amount,
    new_balance,
    (SELECT unlimited_credits FROM professionals WHERE id = professional_uuid),
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
-- PARTE 7: Funcao para admin liberar creditos infinitos
-- =====================================================

CREATE OR REPLACE FUNCTION admin_grant_unlimited_credits(
  professional_uuid UUID,
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
  FROM professionals
  WHERE id = professional_uuid;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Profissional nao encontrado'
    );
  END IF;

  -- Atualizar para creditos infinitos
  UPDATE professionals
  SET
    unlimited_credits = true,
    unlimited_credits_expires_at = expires_at_date,
    unlimited_credits_granted_by = admin_uuid,
    unlimited_credits_granted_at = now()
  WHERE id = professional_uuid;

  -- Registrar transacao
  INSERT INTO credit_transactions (
    professional_id,
    transaction_type,
    amount,
    balance_after,
    unlimited_after,
    expires_at,
    performed_by,
    reason
  ) VALUES (
    professional_uuid,
    'grant_unlimited',
    0,
    current_balance,
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
-- PARTE 8: Funcao para admin revogar creditos infinitos
-- =====================================================

CREATE OR REPLACE FUNCTION admin_revoke_unlimited_credits(
  professional_uuid UUID,
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
  FROM professionals
  WHERE id = professional_uuid;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Profissional nao encontrado'
    );
  END IF;

  -- Remover creditos infinitos
  UPDATE professionals
  SET
    unlimited_credits = false,
    unlimited_credits_expires_at = NULL,
    unlimited_credits_granted_by = NULL,
    unlimited_credits_granted_at = NULL
  WHERE id = professional_uuid;

  -- Registrar transacao
  INSERT INTO credit_transactions (
    professional_id,
    transaction_type,
    amount,
    balance_after,
    unlimited_after,
    performed_by,
    reason
  ) VALUES (
    professional_uuid,
    'revoke_unlimited',
    0,
    current_balance,
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
-- PARTE 9: Atualizar funcao can_professional_respond_quote
-- =====================================================

CREATE OR REPLACE FUNCTION can_professional_respond_quote(professional_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prof RECORD;
  result JSON;
BEGIN
  -- Buscar dados do profissional
  SELECT
    p.credits_balance,
    p.unlimited_credits,
    p.unlimited_credits_expires_at,
    p.plan_type,
    p.plan_active,
    p.plan_expires_at,
    p.free_quotes_used,
    p.referral_credits
  INTO prof
  FROM professionals p
  WHERE p.id = professional_uuid;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'can_respond', false,
      'reason', 'Profissional nao encontrado',
      'credits_balance', 0,
      'has_unlimited', false,
      'quotes_left', 0
    );
  END IF;

  -- 1. Verificar creditos infinitos
  IF prof.unlimited_credits = true THEN
    IF prof.unlimited_credits_expires_at IS NULL OR prof.unlimited_credits_expires_at > now() THEN
      RETURN json_build_object(
        'can_respond', true,
        'reason', 'Creditos infinitos ativos',
        'credits_balance', COALESCE(prof.credits_balance, 0),
        'has_unlimited', true,
        'unlimited_expires_at', prof.unlimited_credits_expires_at,
        'quotes_left', 999999
      );
    END IF;
  END IF;

  -- 2. Verificar creditos avulsos
  IF COALESCE(prof.credits_balance, 0) > 0 THEN
    RETURN json_build_object(
      'can_respond', true,
      'reason', 'Creditos avulsos disponiveis',
      'credits_balance', prof.credits_balance,
      'has_unlimited', false,
      'quotes_left', prof.credits_balance
    );
  END IF;

  -- 3. Verificar creditos de indicacao (fallback)
  IF COALESCE(prof.referral_credits, 0) > 0 THEN
    RETURN json_build_object(
      'can_respond', true,
      'reason', 'Creditos de indicacao disponiveis',
      'credits_balance', 0,
      'has_unlimited', false,
      'referral_credits', prof.referral_credits,
      'quotes_left', prof.referral_credits
    );
  END IF;

  -- 4. Sem creditos - precisa comprar
  RETURN json_build_object(
    'can_respond', false,
    'reason', 'Sem creditos disponiveis. Compre creditos ou assine um plano para responder cotacoes.',
    'credits_balance', 0,
    'has_unlimited', false,
    'quotes_left', 0
  );
END;
$$;

-- =====================================================
-- FINALIZACAO
-- =====================================================

-- Garantir que todos os profissionais tenham valores padrao
UPDATE professionals
SET
  credits_balance = COALESCE(credits_balance, 0),
  unlimited_credits = COALESCE(unlimited_credits, false)
WHERE credits_balance IS NULL OR unlimited_credits IS NULL;

-- Log de sucesso
DO $$
BEGIN
  RAISE NOTICE 'Migracao de creditos concluida com sucesso!';
  RAISE NOTICE 'Novos campos adicionados em professionals: credits_balance, unlimited_credits, unlimited_credits_expires_at, unlimited_credits_granted_by, unlimited_credits_granted_at';
  RAISE NOTICE 'Nova tabela criada: credit_transactions';
  RAISE NOTICE 'Funcoes criadas: check_professional_credits, use_professional_credit, admin_add_credits, admin_grant_unlimited_credits, admin_revoke_unlimited_credits';
  RAISE NOTICE 'Funcao atualizada: can_professional_respond_quote';
END $$;
