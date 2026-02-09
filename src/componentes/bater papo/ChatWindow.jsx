import React, { useState, useEffect, useRef } from 'react';
import { Message, Notification } from "@/lib/entities";
import { uploadFile } from "@/lib/storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Textarea } from "@/componentes/interface do usuário/textarea";
import { ScrollArea } from "@/componentes/interface do usuário/scroll-area";
import { Send, Paperclip, Loader2, X, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { showToast } from "@/utils/showToast";

export default function ChatWindow({ appointmentId, currentUser, otherUser }) {
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', appointmentId],
    queryFn: async () => {
      const results = await Message.filter(
        { appointment_id: appointmentId },
        'created_date',
        100
      );
      return results;
    },
    refetchInterval: 3000, // Atualiza a cada 3 segundos
    enabled: !!appointmentId
  });

  const sendMutation = useMutation({
    mutationFn: async (data) => {
      const newMessage = await Message.create(data);

      // Criar notificação para o outro usuário
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
          console.error('Erro ao criar notificação:', notifError);
        }
      }

      return newMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', appointmentId] });
      setMessage('');
    },
    onError: (error) => {
      showToast.error('Erro ao enviar mensagem', 'Tente novamente.');
    }
  });

  const handleSend = () => {
    if (!message.trim()) return;

    const senderType = currentUser.user_type === 'profissional' ? 'professional' : 'client';

    sendMutation.mutate({
      appointment_id: appointmentId,
      sender_id: currentUser.id,
      sender_name: currentUser.full_name,
      sender_type: senderType,
      message: message.trim()
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
        appointment_id: appointmentId,
        sender_id: currentUser.id,
        sender_name: currentUser.full_name,
        sender_type: senderType,
        message: 'Arquivo anexado',
        attachment_url: file_url
      });
    } catch (error) {
      showToast.error('Erro ao enviar arquivo', error.message || 'Tente novamente.');
    }
    setUploading(false);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Marcar mensagens como lidas
  useEffect(() => {
    const unreadMessages = messages.filter(
      m => m.sender_id !== currentUser.id && !m.is_read
    );

    unreadMessages.forEach(async (msg) => {
      await Message.update(msg.id, { is_read: true });
    });
  }, [messages, currentUser.id]);

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
      <ScrollArea className="flex-1 p-4">
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
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
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
                      {format(new Date(msg.created_date), 'dd/MM HH:mm', { locale: ptBR })}
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
            onKeyPress={(e) => {
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
