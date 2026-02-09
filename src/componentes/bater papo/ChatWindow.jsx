import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Message, Notification } from "@/lib/entities";
import { uploadFile } from "@/lib/storage";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useChatMessages } from "@/hooks/useChatMessages";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Send, Paperclip, Loader2, MessageCircle, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { showToast } from "@/utils/showToast";

export default function ChatWindow({ appointmentId, currentUser, otherUser }) {
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
    type: 'appointment',
    conversationId: appointmentId,
    currentUserId: currentUser?.id,
    enabled: !!appointmentId
  });

  const sendMutation = useMutation({
    mutationFn: async (data) => {
      const newMessage = await Message.create(data);

      // Criar notificacao para o outro usuario
      if (otherUser?.id) {
        try {
          await Notification.create({
            user_id: otherUser.id,
            type: 'message',
            title: 'Nova Mensagem',
            message: `${currentUser.full_name} enviou uma mensagem`,
            link: `/ClientAppointments?id=${appointmentId}`,
            priority: 'high'
          });
        } catch (notifError) {
          console.error('Erro ao criar notificacao:', notifError);
        }
      }

      return newMessage;
    },
    onError: (error, variables, context) => {
      // Remover mensagem otimistica em caso de erro
      if (context?.tempId) {
        removeOptimisticMessage(context.tempId);
      }
      showToast.error('Erro ao enviar mensagem', 'Tente novamente.');
    }
  });

  const handleSend = useCallback(() => {
    if (!message.trim()) return;

    const senderType = currentUser.user_type === 'profissional' ? 'professional' : 'client';

    const messageData = {
      appointment_id: appointmentId,
      sender_id: currentUser.id,
      sender_name: currentUser.full_name,
      sender_type: senderType,
      message: message.trim()
    };

    // Adicionar mensagem otimistica
    const optimisticMsg = addOptimisticMessage(messageData);

    setMessage('');

    // Scroll para o final
    setTimeout(() => scrollToBottom(), 50);

    sendMutation.mutate(messageData, {
      context: { tempId: optimisticMsg.id }
    });
  }, [message, currentUser, appointmentId, addOptimisticMessage, scrollToBottom, sendMutation]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await uploadFile(file);

      const senderType = currentUser.user_type === 'profissional' ? 'professional' : 'client';

      const messageData = {
        appointment_id: appointmentId,
        sender_id: currentUser.id,
        sender_name: currentUser.full_name,
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
      showToast.error('Erro ao enviar arquivo', error.message || 'Tente novamente.');
    }
    setUploading(false);
  };

  // Scroll para o final quando mudar de conversa ou quando mensagens carregarem
  const prevAppointmentId = useRef(null);
  useEffect(() => {
    if (
      appointmentId &&
      messages.length > 0 &&
      !isLoading &&
      prevAppointmentId.current !== appointmentId
    ) {
      scrollToBottom('auto');
      prevAppointmentId.current = appointmentId;
    }
  }, [appointmentId, messages.length, isLoading, scrollToBottom]);

  // Marcar mensagens como lidas
  useEffect(() => {
    const unreadMessages = messages.filter(
      m => m.sender_id !== currentUser.id && !m.is_read && !m._isOptimistic
    );

    unreadMessages.forEach(async (msg) => {
      await Message.update(msg.id, { is_read: true });
    });
  }, [messages, currentUser.id]);

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
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-xl border shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 rounded-t-xl">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-6 h-6 text-white" />
          <div>
            <h3 className="font-semibold text-white">{otherUser.full_name || otherUser.name}</h3>
            <p className="text-xs text-orange-100">Chat do Agendamento</p>
          </div>
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
              <p className="text-sm">Inicie a conversa!</p>
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
                          ? 'bg-orange-500 text-white'
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
                            isMe ? 'text-orange-100' : 'text-orange-600'
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
                        format(new Date(msg.created_date || msg.created_at), 'dd/MM HH:mm', { locale: ptBR })
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
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1"
          />

          <Button
            onClick={handleSend}
            disabled={!message.trim() || sendMutation.isPending}
            className="bg-orange-500 hover:bg-orange-600 flex-shrink-0"
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
