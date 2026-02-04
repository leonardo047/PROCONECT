import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      // Não refetch ao focar na janela - reduz requisições desnecessárias
      refetchOnWindowFocus: false,
      // Não refetch ao reconectar
      refetchOnReconnect: false,
      // Retry apenas 1 vez em caso de erro
      retry: 1,
      // Dados são considerados "frescos" por 5 minutos
      staleTime: 5 * 60 * 1000,
      // Manter cache por 30 minutos
      gcTime: 30 * 60 * 1000,
    },
    mutations: {
      // Retry apenas 1 vez para mutations
      retry: 1,
    },
  },
});
