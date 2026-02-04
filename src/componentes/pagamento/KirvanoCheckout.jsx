import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/componentes/interface do usuário/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/componentes/interface do usuário/dialog';
import {
  CreditCard,
  Shield,
  CheckCircle,
  Loader2,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/componentes/interface do usuário/alert';

// =============================================
// CONFIGURAÇÃO DOS LINKS DE CHECKOUT DA KIRVANO
// =============================================
const KIRVANO_CHECKOUTS = {
  // Planos para Clientes
  cliente_diario: {
    url: 'https://pay.kirvano.com/00a4b740-de7a-44a5-bfd9-424a6d47eb52',
    name: 'Acesso Diário',
    price: 3.69,
    description: 'Acesso ilimitado por 24 horas'
  },
  cliente_vitalicio: {
    url: 'https://pay.kirvano.com/00a4b740-de7a-44a5-bfd9-424a6d47eb52',
    name: 'Acesso Vitalício',
    price: 49.90,
    description: 'Acesso ilimitado para sempre'
  },

  // Planos para Profissionais
  profissional_starter: {
    url: 'https://pay.kirvano.com/8c225b37-671c-4ff6-94dd-bef332f6dfcf',
    name: 'Plano Iniciante',
    price: 93.69,
    description: '3 meses de acesso'
  },
  profissional_mensal: {
    url: 'https://pay.kirvano.com/8c225b37-671c-4ff6-94dd-bef332f6dfcf',
    name: 'Plano Profissional Mensal',
    price: 69.90,
    description: 'Renovação automática mensal'
  },
  profissional_semestral: {
    url: 'https://pay.kirvano.com/8c225b37-671c-4ff6-94dd-bef332f6dfcf',
    name: 'Plano Profissional Semestral',
    price: 349.90,
    description: '6 meses com desconto'
  },
  profissional_anual: {
    url: 'https://pay.kirvano.com/8c225b37-671c-4ff6-94dd-bef332f6dfcf',
    name: 'Plano Profissional Anual',
    price: 599.90,
    description: '12 meses com maior desconto'
  },

  // Pagar por orçamento
  profissional_orcamento: {
    url: 'https://pay.kirvano.com/8c225b37-671c-4ff6-94dd-bef332f6dfcf',
    name: 'Responder Orçamento',
    price: 5.00,
    description: 'Pagamento único para responder'
  }
};

/**
 * Gera a URL de checkout com os parâmetros do usuário
 * Isso garante que o webhook identifique corretamente quem pagou
 */
function generateCheckoutUrl(baseUrl, user) {
  const params = new URLSearchParams();

  // IMPORTANTE: Passamos o user_id via utm_content
  // Isso é retornado no webhook e garante 100% de identificação
  if (user?.id) {
    params.set('utm_content', user.id);
  }

  // Também pré-preenchemos email e telefone para facilitar
  if (user?.email) {
    params.set('email', user.email);
  }

  if (user?.phone) {
    // Remove o 55 do início para o formato da Kirvano
    const phone = user.phone?.startsWith('55')
      ? user.phone.substring(2)
      : user.phone;
    params.set('phone', phone);
  }

  if (user?.full_name) {
    params.set('name', user.full_name);
  }

  // UTM adicional para tracking
  params.set('utm_source', 'proobra');
  params.set('utm_medium', 'app');

  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${params.toString()}`;
}

/**
 * Componente de botão de checkout
 */
export function KirvanoCheckoutButton({
  planKey,
  children,
  className = '',
  variant = 'default',
  size = 'default',
  showPrice = true,
  onBeforeCheckout,
  disabled = false
}) {
  const { user, isAuthenticated, navigateToLogin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const plan = KIRVANO_CHECKOUTS[planKey];

  if (!plan) {
    console.error(`Plano não encontrado: ${planKey}`);
    return null;
  }

  const handleCheckout = async () => {
    // Verificar se está autenticado
    if (!isAuthenticated || !user) {
      navigateToLogin();
      return;
    }

    setIsLoading(true);

    try {
      // Callback antes de redirecionar (opcional)
      if (onBeforeCheckout) {
        await onBeforeCheckout();
      }

      // Gerar URL com parâmetros do usuário
      const checkoutUrl = generateCheckoutUrl(plan.url, user);

      // Abrir em nova aba
      window.open(checkoutUrl, '_blank');
    } catch (error) {
      console.error('Erro ao iniciar checkout:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCheckout}
      disabled={disabled || isLoading}
      className={className}
      variant={variant}
      size={size}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <CreditCard className="w-4 h-4 mr-2" />
      )}
      {children || plan.name}
      {showPrice && (
        <span className="ml-2 font-bold">
          R$ {plan.price.toFixed(2).replace('.', ',')}
        </span>
      )}
      <ExternalLink className="w-3 h-3 ml-2" />
    </Button>
  );
}

/**
 * Modal de checkout com mais detalhes
 */
export function KirvanoCheckoutModal({
  planKey,
  open,
  onOpenChange,
  title,
  description
}) {
  const { user, isAuthenticated, navigateToLogin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const plan = KIRVANO_CHECKOUTS[planKey];

  if (!plan) return null;

  const handleCheckout = async () => {
    if (!isAuthenticated || !user) {
      navigateToLogin();
      return;
    }

    setIsLoading(true);

    try {
      const checkoutUrl = generateCheckoutUrl(plan.url, user);
      window.open(checkoutUrl, '_blank');
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao iniciar checkout:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title || plan.name}</DialogTitle>
          <DialogDescription>
            {description || plan.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preço */}
          <div className="text-center p-4 bg-orange-50 rounded-xl">
            <p className="text-3xl font-bold text-orange-600">
              R$ {plan.price.toFixed(2).replace('.', ',')}
            </p>
            <p className="text-sm text-slate-600 mt-1">{plan.description}</p>
          </div>

          {/* Benefícios */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Pagamento 100% seguro</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Ativação imediata após confirmação</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Shield className="w-4 h-4 text-green-500" />
              <span>Seus dados protegidos</span>
            </div>
          </div>

          {/* Aviso sobre dados */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Use o mesmo email ou telefone cadastrado no ProObra para garantir a ativação automática do seu plano.
            </AlertDescription>
          </Alert>

          {/* Info do usuário */}
          {user && (
            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
              <p><strong>Email:</strong> {user.email}</p>
              {user.phone && <p><strong>Telefone:</strong> {user.phone}</p>}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCheckout}
            disabled={isLoading}
            className="flex-1 bg-orange-500 hover:bg-orange-600"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CreditCard className="w-4 h-4 mr-2" />
            )}
            Pagar Agora
            <ExternalLink className="w-3 h-3 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook para usar o checkout programaticamente
 */
export function useKirvanoCheckout() {
  const { user, isAuthenticated, navigateToLogin } = useAuth();

  const openCheckout = (planKey) => {
    if (!isAuthenticated || !user) {
      navigateToLogin();
      return;
    }

    const plan = KIRVANO_CHECKOUTS[planKey];
    if (!plan) {
      console.error(`Plano não encontrado: ${planKey}`);
      return;
    }

    const checkoutUrl = generateCheckoutUrl(plan.url, user);
    window.open(checkoutUrl, '_blank');
  };

  return { openCheckout, plans: KIRVANO_CHECKOUTS };
}

export default KirvanoCheckoutButton;
