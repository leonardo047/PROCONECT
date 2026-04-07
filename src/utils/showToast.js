import { toast } from '@/componentes/interface do usuário/use-toast';

/**
 * Utilitário para exibir toasts de forma simples
 * Substitui o uso de alert() nativo do browser
 */

export const showToast = {
  success: (message, description = '') => {
    toast({
      title: message,
      description,
      variant: 'default',
    });
  },

  error: (message, description = '') => {
    toast({
      title: message,
      description,
      variant: 'destructive',
    });
  },

  info: (message, description = '') => {
    toast({
      title: message,
      description,
      variant: 'default',
    });
  },

  warning: (message, description = '') => {
    toast({
      title: message,
      description,
      variant: 'default',
    });
  },
};

export default showToast;
