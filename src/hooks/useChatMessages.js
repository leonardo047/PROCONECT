import { useCallback, useMemo, useRef, useEffect } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { MessageService, QuoteMessageService } from '@/lib/entities';
import { useSupabaseSubscription } from './useSupabaseSubscription';

/**
 * Hook que combina paginacao + realtime para mensagens de chat
 *
 * @param {Object} options - Opcoes de configuracao
 * @param {string} options.type - Tipo de conversa ('appointment', 'quote', 'direct')
 * @param {string} options.conversationId - ID da conversa (appointmentId, quoteResponseId, ou directConversationId)
 * @param {string} options.currentUserId - ID do usuario atual (para marcar como lido)
 * @param {number} options.pageSize - Quantidade de mensagens por pagina (default: 30)
 * @param {boolean} options.enabled - Se a query esta habilitada (default: true)
 */
export function useChatMessages({
  type = 'quote',
  conversationId,
  currentUserId,
  pageSize = 30,
  enabled = true
}) {
  const queryClient = useQueryClient();
  const scrollPositionRef = useRef(null);
  const containerRef = useRef(null);

  // Determinar a coluna de filtro baseado no tipo
  const filterColumn = useMemo(() => {
    switch (type) {
      case 'appointment':
        return 'appointment_id';
      case 'quote':
        return 'quote_response_id';
      case 'direct':
        return 'direct_conversation_id';
      default:
        return 'quote_response_id';
    }
  }, [type]);

  // Determinar tabela para realtime
  const tableName = type === 'appointment' ? 'messages' : 'quote_messages';

  // Query key para cache
  const queryKey = useMemo(
    () => ['chat-messages', type, conversationId],
    [type, conversationId]
  );

  // Funcao para buscar mensagens paginadas
  const fetchMessages = useCallback(
    async ({ pageParam = null }) => {
      if (!conversationId) {
        return { messages: [], hasMore: false, nextCursor: null };
      }

      const options = { limit: pageSize, cursor: pageParam };

      switch (type) {
        case 'appointment':
          return MessageService.getByAppointmentPaginated(conversationId, options);
        case 'quote':
          return QuoteMessageService.getByQuoteResponsePaginated(conversationId, options);
        case 'direct':
          return QuoteMessageService.getByDirectConversationPaginated(conversationId, options);
        default:
          return QuoteMessageService.getByQuoteResponsePaginated(conversationId, options);
      }
    },
    [type, conversationId, pageSize]
  );

  // Infinite query para paginacao
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch
  } = useInfiniteQuery({
    queryKey,
    queryFn: fetchMessages,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: enabled && !!conversationId,
    staleTime: 1000 * 60, // 1 minuto
    refetchOnWindowFocus: false
  });

  // Combinar todas as mensagens de todas as paginas
  const messages = useMemo(() => {
    if (!data?.pages) return [];
    // pages[0] = mensagens mais recentes, pages[1] = mais antigas, etc.
    // Precisamos reverter para que as mais antigas venham primeiro (ordem cronologica)
    const reversedPages = [...data.pages].reverse();
    return reversedPages.flatMap((page) => page.messages);
  }, [data?.pages]);

  // Handler para novas mensagens via realtime
  const handleNewMessage = useCallback(
    (newMessage) => {
      // Verificar se a mensagem pertence a esta conversa
      if (newMessage[filterColumn] !== conversationId) return;

      // Atualizar cache do React Query
      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData?.pages) return oldData;

        // Verificar se a mensagem ja existe (pelo ID real)
        const allMessages = oldData.pages.flatMap((p) => p.messages);
        if (allMessages.some((m) => m.id === newMessage.id)) {
          return oldData;
        }

        // Verificar se existe uma mensagem otimistica correspondente
        // (mesmo sender_id e mensagem enviada recentemente)
        const optimisticIndex = allMessages.findIndex(
          (m) =>
            m._isOptimistic &&
            m.sender_id === newMessage.sender_id &&
            m.message === newMessage.message
        );

        if (optimisticIndex >= 0) {
          // Substituir mensagem otimistica pela real
          const newPages = oldData.pages.map((page) => ({
            ...page,
            messages: page.messages.map((msg) =>
              msg._isOptimistic &&
              msg.sender_id === newMessage.sender_id &&
              msg.message === newMessage.message
                ? newMessage
                : msg
            )
          }));
          return { ...oldData, pages: newPages };
        }

        // Adicionar ao final da primeira pagina (pages[0] = mensagens mais recentes)
        const newPages = [...oldData.pages];

        newPages[0] = {
          ...newPages[0],
          messages: [...newPages[0].messages, newMessage]
        };

        return { ...oldData, pages: newPages };
      });

      // Invalidar query da lista de conversas para atualizar preview
      queryClient.invalidateQueries({ queryKey: ['user-conversations'] });
    },
    [queryClient, queryKey, conversationId, filterColumn]
  );

  // Handler para mensagens atualizadas (ex: marcadas como lidas)
  const handleUpdatedMessage = useCallback(
    (updatedMessage) => {
      if (updatedMessage[filterColumn] !== conversationId) return;

      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData?.pages) return oldData;

        const newPages = oldData.pages.map((page) => ({
          ...page,
          messages: page.messages.map((msg) =>
            msg.id === updatedMessage.id ? updatedMessage : msg
          )
        }));

        return { ...oldData, pages: newPages };
      });
    },
    [queryClient, queryKey, conversationId, filterColumn]
  );

  // Subscription para realtime
  useSupabaseSubscription({
    table: tableName,
    event: '*',
    filter: {
      column: filterColumn,
      value: conversationId
    },
    onInsert: handleNewMessage,
    onUpdate: handleUpdatedMessage,
    enabled: enabled && !!conversationId
  });

  // Funcao para carregar mensagens mais antigas
  const loadOlderMessages = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage) return;

    // Salvar posicao do scroll antes de carregar
    if (containerRef.current) {
      scrollPositionRef.current = {
        scrollHeight: containerRef.current.scrollHeight,
        scrollTop: containerRef.current.scrollTop
      };
    }

    await fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Restaurar posicao do scroll apos carregar mensagens antigas
  useEffect(() => {
    if (
      scrollPositionRef.current &&
      containerRef.current &&
      isFetchingNextPage === false
    ) {
      const { scrollHeight: oldHeight, scrollTop: oldScrollTop } =
        scrollPositionRef.current;
      const newHeight = containerRef.current.scrollHeight;
      const heightDiff = newHeight - oldHeight;

      // Manter a mesma posicao relativa
      containerRef.current.scrollTop = oldScrollTop + heightDiff;
      scrollPositionRef.current = null;
    }
  }, [isFetchingNextPage, data?.pages?.length]);

  // Funcao para scroll ate o final (novas mensagens)
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);

  // Funcao para adicionar mensagem otimisticamente
  const addOptimisticMessage = useCallback(
    (messageData) => {
      const optimisticMessage = {
        ...messageData,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
        is_read: false,
        _isOptimistic: true
      };

      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData?.pages) {
          return {
            pages: [{ messages: [optimisticMessage], hasMore: false, nextCursor: null }],
            pageParams: [undefined]
          };
        }

        // Adicionar ao final da primeira pagina (pages[0] = mensagens mais recentes)
        const newPages = [...oldData.pages];

        newPages[0] = {
          ...newPages[0],
          messages: [...newPages[0].messages, optimisticMessage]
        };

        return { ...oldData, pages: newPages };
      });

      return optimisticMessage;
    },
    [queryClient, queryKey]
  );

  // Funcao para remover mensagem otimistica (em caso de erro)
  const removeOptimisticMessage = useCallback(
    (tempId) => {
      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData?.pages) return oldData;

        const newPages = oldData.pages.map((page) => ({
          ...page,
          messages: page.messages.filter((msg) => msg.id !== tempId)
        }));

        return { ...oldData, pages: newPages };
      });
    },
    [queryClient, queryKey]
  );

  return {
    messages,
    isLoading,
    isError,
    error,
    hasOlderMessages: hasNextPage,
    isLoadingOlder: isFetchingNextPage,
    loadOlderMessages,
    scrollToBottom,
    containerRef,
    addOptimisticMessage,
    removeOptimisticMessage,
    refetch
  };
}

export default useChatMessages;
