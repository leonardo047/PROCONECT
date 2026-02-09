import React, { useState, useEffect, useRef } from 'react';
import { QuoteMessage, QuoteMessageService, Notification } from "@/lib/entities";
import { uploadFile } from "@/lib/storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { ScrollArea } from "@/componentes/interface do usuário/scroll-area";
import { Send, Paperclip, Loader2, MessageCircle, DollarSign } from "lucide-react";
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
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  // Buscar mensagens
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['quote-messages', quoteResponseId],
    queryFn: async () => {
      return await QuoteMessageService.getByQuoteResponse(quoteResponseId);
    },
    refetchInterval: 3000,
    enabled: !!quoteResponseId
  });

  // Mutation para enviar mensagem
  const sendMutation = useMutation({
    mutationFn: async (data) => {
      const newMessage = await QuoteMessage.create(data);

      // Criar notificação para o outro usuário
      if (otherUser?.id) {
        try {
          await Notification.create({
            user_id: otherUser.id,
            type: 'quote_message',
            title: 'Nova Mensagem no Orçamento',
            message: `${currentUser.full_name || currentUser.name} enviou uma mensagem sobre "${quoteRequest?.title}"`,
            link: currentUser.user_type === 'profissional'
              ? `/ClientQuotes?response=${quoteResponseId}`
              : `/ProfessionalQuotes?response=${quoteResponseId}`,
            priority: 'high'
          });
        } catch (err) {
          console.error('Erro ao criar notificação:', err);
        }
      }

      return newMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-messages', quoteResponseId] });
    }
  });

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || sendMutation.isPending) return;

    // Limpar input imediatamente
    setMessage('');

    const senderType = currentUser.user_type === 'profissional' ? 'professional' : 'client';

    sendMutation.mutate({
      quote_response_id: quoteResponseId,
      sender_id: currentUser.id,
      sender_name: currentUser.full_name || currentUser.name,
      sender_type: senderType,
      message: trimmedMessage
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await uploadFile(file);

      const senderType = currentUser.user_type === 'profissional' ? 'professional' : 'client';

      await sendMutation.mutateAsync({
        quote_response_id: quoteResponseId,
        sender_id: currentUser.id,
        sender_name: currentUser.full_name || currentUser.name,
        sender_type: senderType,
        message: 'Arquivo anexado',
        attachment_url: file_url
      });
    } catch (error) {
      // Ignorar erro
    }
    setUploading(false);
  };

  // Scroll para a ultima mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Marcar mensagens como lidas
  useEffect(() => {
    const markAsRead = async () => {
      const unreadMessages = messages.filter(
        m => m.sender_id !== currentUser.id && !m.is_read
      );

      if (unreadMessages.length > 0) {
        await QuoteMessageService.markAsRead(quoteResponseId, currentUser.id);
        queryClient.invalidateQueries({ queryKey: ['quote-messages', quoteResponseId] });
      }
    };

    markAsRead();
  }, [messages, currentUser.id, quoteResponseId, queryClient]);

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
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma mensagem ainda</p>
              <p className="text-sm">Inicie a conversa sobre este orçamento!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === currentUser.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
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
                      {format(new Date(msg.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

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
