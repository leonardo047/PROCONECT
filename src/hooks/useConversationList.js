import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QuoteMessageService } from '@/lib/entities';
import { useSupabaseSubscription } from './useSupabaseSubscription';

/**
 * Hook para lista de conversas com realtime
 *
 * @param {Object} options - Opcoes de configuracao
 * @param {string} options.userId - ID do usuario atual
 * @param {string} options.userType - Tipo do usuario ('cliente' ou 'profissional')
 * @param {boolean} options.enabled - Se a query esta habilitada (default: true)
 */
export function useConversationList({
  userId,
  userType,
  enabled = true
}) {
  const queryClient = useQueryClient();

  // Query key para cache
  const queryKey = useMemo(
    () => ['user-conversations', userId, userType],
    [userId, userType]
  );

  // Buscar conversas
  const {
    data: conversations = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey,
    queryFn: async () => {
      return await QuoteMessageService.getConversationsForUser(userId, userType);
    },
    enabled: enabled && !!userId,
    staleTime: 1000 * 30, // 30 segundos
    refetchOnWindowFocus: true
  });

  // Handler para novas mensagens - invalida o cache para refetch
  const handleNewMessage = useCallback(() => {
    // Invalidar lista de conversas para atualizar previews e ordenacao
    queryClient.invalidateQueries({ queryKey });
    // Invalidar contagem de nao lidas
    queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
  }, [queryClient, queryKey]);

  // Handler para mensagens atualizadas (ex: marcadas como lidas)
  const handleUpdatedMessage = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
  }, [queryClient, queryKey]);

  // Subscription para mensagens de cotacao (quote_messages)
  useSupabaseSubscription({
    table: 'quote_messages',
    event: '*',
    onInsert: handleNewMessage,
    onUpdate: handleUpdatedMessage,
    enabled: enabled && !!userId
  });

  // Subscription para conversas diretas (direct_conversations)
  useSupabaseSubscription({
    table: 'direct_conversations',
    event: '*',
    onChange: handleNewMessage,
    enabled: enabled && !!userId
  });

  // Calcular total de nao lidas
  const totalUnread = useMemo(() => {
    return conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
  }, [conversations]);

  // Funcao para atualizar contagem de nao lidas de uma conversa
  const updateUnreadCount = useCallback((conversationId, count) => {
    queryClient.setQueryData(queryKey, (oldData) => {
      if (!oldData) return oldData;

      return oldData.map((conv) =>
        conv.id === conversationId
          ? { ...conv, unread_count: count }
          : conv
      );
    });
  }, [queryClient, queryKey]);

  // Funcao para marcar conversa como lida localmente
  const markAsRead = useCallback((conversationId) => {
    updateUnreadCount(conversationId, 0);
  }, [updateUnreadCount]);

  return {
    conversations,
    isLoading,
    isError,
    error,
    totalUnread,
    refetch,
    markAsRead,
    updateUnreadCount
  };
}

export default useConversationList;
