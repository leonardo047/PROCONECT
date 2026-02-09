import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QuoteMessage, QuoteMessageService, Notification } from "@/lib/entities";
import { uploadFile } from "@/lib/storage";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useChatMessages } from "@/hooks/useChatMessages";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Send, Paperclip, Loader2, MessageCircle, DollarSign, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function QuoteChat({
  quoteResponseId,
  quoteRequest,
  quoteResponse,
  currentUser,
  otherUser
}) {
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  // Usar o novo hook com paginacao e realtime
  const {
    messages,
    isLoading,
    hasOlderMessages,
    isLoadingOlder,
    loadOlderMessages,
    scrollToBottom,
    containerRef,
    addOptimisticMessage,
    removeOptimisticMessage
  } = useChatMessages({
    type: 'quote',
    conversationId: quoteResponseId,
    currentUserId: currentUser?.id,
    enabled: !!quoteResponseId
  });

  // Mutation para enviar mensagem
  const sendMutation = useMutation({
    mutationFn: async (data) => {
      const newMessage = await QuoteMessage.create(data);

      // Criar notificacao para o outro usuario
      if (otherUser?.id) {
        try {
          await Notification.create({
            user_id: otherUser.id,
            type: 'quote_message',
            title: 'Nova Mensagem no Orcamento',
            message: `${currentUser.full_name || currentUser.name} enviou uma mensagem sobre "${quoteRequest?.title}"`,
            link: currentUser.user_type === 'profissional'
              ? `/ClientQuotes?response=${quoteResponseId}`
              : `/ProfessionalQuotes?response=${quoteResponseId}`,
            priority: 'high'
          });
        } catch (err) {
          console.error('Erro ao criar notificacao:', err);
        }
      }

      return newMessage;
    },
    onError: (error, variables, context) => {
      // Remover mensagem otimistica em caso de erro
      if (context?.tempId) {
        removeOptimisticMessage(context.tempId);
      }
    }
  });

  const handleSend = useCallback(() => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || sendMutation.isPending) return;

    const senderType = currentUser.user_type === 'profissional' ? 'professional' : 'client';

    const messageData = {
      quote_response_id: quoteResponseId,
      sender_id: currentUser.id,
      sender_name: currentUser.full_name || currentUser.name,
      sender_type: senderType,
      message: trimmedMessage
    };

    // Adicionar mensagem otimistica
    const optimisticMsg = addOptimisticMessage(messageData);

    // Limpar input imediatamente
    setMessage('');

    // Scroll para o final
    setTimeout(() => scrollToBottom(), 50);

    sendMutation.mutate(messageData, {
      context: { tempId: optimisticMsg.id }
    });
  }, [message, currentUser, quoteResponseId, addOptimisticMessage, scrollToBottom, sendMutation]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await uploadFile(file);

      const senderType = currentUser.user_type === 'profissional' ? 'professional' : 'client';

      const messageData = {
        quote_response_id: quoteResponseId,
        sender_id: currentUser.id,
        sender_name: currentUser.full_name || currentUser.name,
        sender_type: senderType,
        message: 'Arquivo anexado',
        attachment_url: file_url
      };

      const optimisticMsg = addOptimisticMessage(messageData);

      await sendMutation.mutateAsync(messageData, {
        context: { tempId: optimisticMsg.id }
      });

      setTimeout(() => scrollToBottom(), 50);
    } catch (error) {
      // Ignorar erro
    }
    setUploading(false);
  };

  // Scroll para o final quando mudar de conversa ou quando mensagens carregarem
  const prevQuoteResponseId = useRef(null);
  useEffect(() => {
    if (
      quoteResponseId &&
      messages.length > 0 &&
      !isLoading &&
      prevQuoteResponseId.current !== quoteResponseId
    ) {
      scrollToBottom('auto');
      prevQuoteResponseId.current = quoteResponseId;
    }
  }, [quoteResponseId, messages.length, isLoading, scrollToBottom]);

  // Marcar mensagens como lidas
  useEffect(() => {
    const markAsRead = async () => {
      const unreadMessages = messages.filter(
        m => m.sender_id !== currentUser.id && !m.is_read && !m._isOptimistic
      );

      if (unreadMessages.length > 0) {
        await QuoteMessageService.markAsRead(quoteResponseId, currentUser.id);
        queryClient.invalidateQueries({ queryKey: ['user-conversations'] });
      }
    };

    markAsRead();
  }, [messages, currentUser.id, quoteResponseId, queryClient]);

  // Handler para scroll - carregar mensagens antigas
  const handleScroll = useCallback((e) => {
    const { scrollTop } = e.target;

    // Se esta proximo do topo, carregar mensagens antigas
    if (scrollTop < 100 && hasOlderMessages && !isLoadingOlder) {
      loadOlderMessages();
    }
  }, [hasOlderMessages, isLoadingOlder, loadOlderMessages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-xl border shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-t-xl">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-6 h-6 text-white" />
          <div className="flex-1">
            <h3 className="font-semibold text-white">{otherUser?.full_name || otherUser?.name || 'Usuario'}</h3>
            <p className="text-xs text-green-100">Chat sobre: {quoteRequest?.title}</p>
          </div>
          {quoteResponse?.estimated_price && (
            <div className="bg-white/20 rounded-lg px-3 py-1">
              <div className="flex items-center gap-1 text-white">
                <DollarSign className="w-4 h-4" />
                <span className="font-semibold">
                  R$ {quoteResponse.estimated_price.toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4"
        onScroll={handleScroll}
      >
        {/* Botao para carregar mais */}
        {hasOlderMessages && (
          <div className="flex justify-center mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadOlderMessages}
              disabled={isLoadingOlder}
              className="text-slate-500 hover:text-slate-700"
            >
              {isLoadingOlder ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ChevronUp className="w-4 h-4 mr-2" />
              )}
              Carregar mensagens anteriores
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma mensagem ainda</p>
              <p className="text-sm">Inicie a conversa sobre este orcamento!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === currentUser.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${
                    msg._isOptimistic ? 'opacity-70' : ''
                  }`}
                >
                  <div className={`max-w-[70%] ${isMe ? 'order-2' : 'order-1'}`}>
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        isMe
                          ? 'bg-green-500 text-white'
                          : 'bg-slate-100 text-slate-900'
                      }`}
                    >
                      {!isMe && (
                        <p className="text-xs font-semibold mb-1 opacity-70">
                          {msg.sender_name}
                        </p>
                      )}
                      <p className="text-sm break-words">{msg.message}</p>
                      {msg.attachment_url && (
                        <a
                          href={msg.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-xs underline mt-2 block ${
                            isMe ? 'text-green-100' : 'text-green-600'
                          }`}
                        >
                          Ver anexo
                        </a>
                      )}
                    </div>
                    <p
                      className={`text-xs text-slate-400 mt-1 ${
                        isMe ? 'text-right' : 'text-left'
                      }`}
                    >
                      {msg._isOptimistic ? (
                        'Enviando...'
                      ) : (
                        format(new Date(msg.created_at), 'dd/MM HH:mm', { locale: ptBR })
                      )}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={uploading}
              className="flex-shrink-0"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
            </Button>
          </label>

          <Input
            placeholder="Digite sua mensagem..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !sendMutation.isPending) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1"
          />

          <Button
            onClick={handleSend}
            disabled={!message.trim() || sendMutation.isPending}
            className="bg-green-500 hover:bg-green-600 flex-shrink-0"
          >
            {sendMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
