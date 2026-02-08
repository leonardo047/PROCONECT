import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from "@/lib/AuthContext";
import { QuoteMessageService, QuoteMessage, Notification, DirectConversationService, ProfessionalService } from "@/lib/entities";
import { supabase } from "@/lib/supabase";
import { uploadFile } from "@/lib/storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Badge } from "@/componentes/interface do usuário/badge";
import {
  MessageCircle, Loader2, User, Search, Send, Paperclip,
  ArrowLeft, Check, CheckCheck, Phone, MoreVertical
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Conversations() {
  const { user, isLoadingAuth, isAuthenticated, navigateToLogin } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'unread'
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [startChatPending, setStartChatPending] = useState(false);
  const messagesContainerRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated && !redirecting) {
      setRedirecting(true);
      setTimeout(() => navigateToLogin(), 100);
    }
  }, [isLoadingAuth, isAuthenticated, navigateToLogin, redirecting]);

  // Detectar mobile
  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Detectar parametro start_chat_with na URL (para iniciar conversa direta)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const professionalId = params.get('start_chat_with');

    if (professionalId && user?.id && !startChatPending) {
      setStartChatPending(true);
      startDirectChat(professionalId);
    }
  }, [user?.id, startChatPending]);

  // Funcao para iniciar chat direto com profissional
  const startDirectChat = async (professionalId) => {
    try {
      // Buscar dados do profissional
      const professional = await ProfessionalService.get(professionalId);
      if (!professional) {
        setStartChatPending(false);
        return;
      }

      // Criar ou buscar conversa direta
      const conversation = await DirectConversationService.getOrCreate(
        user.id,
        professionalId,
        professional.user_id
      );

      // Selecionar a conversa
      setSelectedConversation({
        id: conversation.id,
        conversation_type: 'direct',
        other_user_name: professional.name,
        other_user_id: professional.user_id,
        professional_id: professionalId
      });

      // Limpar URL
      window.history.replaceState({}, '', '/Conversations');

      // Recarregar lista de conversas
      queryClient.invalidateQueries({ queryKey: ['user-conversations'] });
    } catch (error) {
      // Ignorar erro
    }
    setStartChatPending(false);
  };

  // Buscar conversas
  const { data: conversations = [], isLoading: loadingConversations, refetch } = useQuery({
    queryKey: ['user-conversations', user?.id, user?.user_type],
    queryFn: async () => {
      return await QuoteMessageService.getConversationsForUser(user.id, user.user_type);
    },
    enabled: !!user?.id,
    refetchInterval: 10000,
    staleTime: 5000
  });

  // Buscar mensagens da conversa selecionada (suporta quote e direct)
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['conversation-messages', selectedConversation?.id, selectedConversation?.conversation_type],
    queryFn: async () => {
      if (selectedConversation.conversation_type === 'direct') {
        return await QuoteMessageService.getByDirectConversation(selectedConversation.id);
      }
      return await QuoteMessageService.getByQuoteResponse(selectedConversation.id);
    },
    refetchInterval: 3000,
    enabled: !!selectedConversation?.id
  });

  // Mutation para enviar mensagem (suporta quote e direct)
  const sendMutation = useMutation({
    mutationFn: async (data) => {
      const newMessage = await QuoteMessage.create(data);

      // Atualizar last_message_at para conversas diretas
      if (selectedConversation?.conversation_type === 'direct') {
        await DirectConversationService.updateLastMessage(selectedConversation.id);
      }

      try {
        await Notification.create({
          user_id: selectedConversation.other_user_id,
          type: 'quote_message',
          title: 'Nova Mensagem',
          message: `${user.full_name || user.email} enviou uma mensagem`,
          link: `/Conversations`,
          priority: 'high'
        });
      } catch (err) {
        // Ignorar erro de notificação
      }

      return newMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-conversations'] });
    }
  });

  // Marcar como lido (suporta quote e direct)
  useEffect(() => {
    if (selectedConversation && messages.length > 0) {
      const unread = messages.filter(m => m.sender_id !== user?.id && !m.is_read);
      if (unread.length > 0) {
        const isDirect = selectedConversation.conversation_type === 'direct';
        QuoteMessageService.markAsRead(selectedConversation.id, user.id, isDirect);
        queryClient.invalidateQueries({ queryKey: ['user-conversations'] });
        queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
      }
    }
  }, [messages, selectedConversation, user?.id, queryClient]);

  // Scroll para ultima mensagem - usando scrollTop no container (nao afeta a pagina)
  const shouldScrollRef = useRef(false);

  // Marcar para scroll quando mudar de conversa
  useEffect(() => {
    if (selectedConversation?.id) {
      shouldScrollRef.current = true;
    }
  }, [selectedConversation?.id]);

  // Executar scroll apenas quando marcado - usando scrollTop ao inves de scrollIntoView
  useEffect(() => {
    if (shouldScrollRef.current && messagesContainerRef.current && messages.length > 0) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
      shouldScrollRef.current = false;
    }
  }, [messages]);

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || sendMutation.isPending || !selectedConversation) return;

    setMessage('');
    shouldScrollRef.current = true; // Marcar para scroll após enviar
    const senderType = user.user_type === 'profissional' ? 'professional' : 'client';
    const isDirect = selectedConversation.conversation_type === 'direct';

    const messageData = {
      sender_id: user.id,
      sender_name: user.full_name || user.email,
      sender_type: senderType,
      message: trimmedMessage
    };

    // Adicionar o ID correto dependendo do tipo de conversa
    if (isDirect) {
      messageData.direct_conversation_id = selectedConversation.id;
    } else {
      messageData.quote_response_id = selectedConversation.id;
    }

    sendMutation.mutate(messageData);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedConversation) return;

    setUploading(true);
    try {
      const { file_url } = await uploadFile(file);
      const senderType = user.user_type === 'profissional' ? 'professional' : 'client';
      const isDirect = selectedConversation.conversation_type === 'direct';

      const messageData = {
        sender_id: user.id,
        sender_name: user.full_name || user.email,
        sender_type: senderType,
        message: 'Arquivo anexado',
        attachment_url: file_url
      };

      if (isDirect) {
        messageData.direct_conversation_id = selectedConversation.id;
      } else {
        messageData.quote_response_id = selectedConversation.id;
      }

      await sendMutation.mutateAsync(messageData);
    } catch (error) {
      // Ignorar erro
    }
    setUploading(false);
  };

  // Filtrar conversas
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.other_user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.quote_request_title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterTab === 'all' || (filterTab === 'unread' && conv.unread_count > 0);
    return matchesSearch && matchesFilter;
  });

  const formatMessageDate = (dateStr) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Ontem';
    return format(date, 'dd/MM/yy');
  };

  const formatChatDate = (dateStr) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isYesterday(date)) return 'Ontem';
    return format(date, "dd 'de' MMMM", { locale: ptBR });
  };

  // Agrupar mensagens por data
  const groupMessagesByDate = (msgs) => {
    const groups = {};
    msgs.forEach(msg => {
      const dateKey = format(new Date(msg.created_at), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(msg);
    });
    return groups;
  };

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111b21]">
        <Loader2 className="w-10 h-10 text-[#00a884] animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111b21]">
        <Loader2 className="w-10 h-10 text-[#00a884] animate-spin" />
      </div>
    );
  }

  const showChatPanel = selectedConversation && (!isMobileView || selectedConversation);
  const showListPanel = !isMobileView || !selectedConversation;

  return (
    <div className="h-[calc(100vh-64px)] flex bg-[#111b21] overflow-hidden">
      {/* Lista de Conversas */}
      {showListPanel && (
        <div className={`${isMobileView ? 'w-full' : 'w-[400px]'} flex flex-col border-r border-[#222d34] bg-[#111b21]`}>
          {/* Header */}
          <div className="p-4 bg-[#202c33]">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-semibold text-[#e9edef]">Conversas</h1>
              {totalUnread > 0 && (
                <Badge className="bg-[#00a884] text-white">
                  {totalUnread}
                </Badge>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8696a0]" />
              <Input
                placeholder="Pesquisar conversa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#2a3942] border-0 text-[#e9edef] placeholder:text-[#8696a0] focus-visible:ring-0"
              />
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filterTab === 'all'
                    ? 'bg-[#00a884] text-white'
                    : 'bg-[#2a3942] text-[#8696a0] hover:bg-[#3b4a54]'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setFilterTab('unread')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filterTab === 'unread'
                    ? 'bg-[#00a884] text-white'
                    : 'bg-[#2a3942] text-[#8696a0] hover:bg-[#3b4a54]'
                }`}
              >
                Não lidas
              </button>
            </div>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto">
            {loadingConversations ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-[#00a884] animate-spin" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle className="w-16 h-16 text-[#3b4a54] mx-auto mb-4" />
                <p className="text-[#8696a0]">
                  {searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#202c33] transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-[#2a3942]' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-[#6b7c85] flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-[#cfd9df]" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-[#e9edef] truncate">
                        {conv.other_user_name || 'Usuario'}
                      </h3>
                      <span className={`text-xs flex-shrink-0 ${
                        conv.unread_count > 0 ? 'text-[#00a884]' : 'text-[#8696a0]'
                      }`}>
                        {conv.last_message?.created_at
                          ? formatMessageDate(conv.last_message.created_at)
                          : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-sm text-[#8696a0] truncate">
                        {conv.last_message?.message ||
                         (conv.conversation_type === 'direct' ? 'Conversa direta' : conv.quote_request_title) ||
                         'Iniciar conversa'}
                      </p>
                      {conv.unread_count > 0 && (
                        <Badge className="bg-[#00a884] text-white text-xs min-w-[20px] h-5 flex items-center justify-center">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Painel do Chat */}
      {showChatPanel ? (
        <div className="flex-1 flex flex-col bg-[#0b141a]">
          {/* Header do Chat */}
          <div className="flex items-center gap-3 px-4 py-2 bg-[#202c33]">
            {isMobileView && (
              <button
                onClick={() => setSelectedConversation(null)}
                className="p-2 -ml-2 hover:bg-[#2a3942] rounded-full"
              >
                <ArrowLeft className="w-5 h-5 text-[#8696a0]" />
              </button>
            )}
            <div className="w-10 h-10 rounded-full bg-[#6b7c85] flex items-center justify-center">
              <User className="w-5 h-5 text-[#cfd9df]" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-[#e9edef]">
                {selectedConversation?.other_user_name || 'Usuario'}
              </h3>
              <p className="text-xs text-[#8696a0]">
                {selectedConversation?.conversation_type === 'direct'
                  ? 'Conversa direta'
                  : selectedConversation?.quote_request_title || 'Orçamento'}
              </p>
            </div>
            <button className="p-2 hover:bg-[#2a3942] rounded-full">
              <MoreVertical className="w-5 h-5 text-[#8696a0]" />
            </button>
          </div>

          {/* Mensagens */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23182229' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundColor: '#0b141a'
            }}
          >
            {loadingMessages ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-[#00a884] animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="bg-[#182229] rounded-lg p-6 max-w-sm">
                  <MessageCircle className="w-12 h-12 text-[#00a884] mx-auto mb-3" />
                  <p className="text-[#e9edef] font-medium mb-1">Inicie a conversa!</p>
                  <p className="text-sm text-[#8696a0]">
                    Envie uma mensagem para {selectedConversation?.other_user_name}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {Object.entries(groupMessagesByDate(messages)).map(([dateKey, dayMessages]) => (
                  <div key={dateKey}>
                    {/* Separador de data */}
                    <div className="flex justify-center my-4">
                      <span className="px-3 py-1 bg-[#182229] rounded-lg text-xs text-[#8696a0]">
                        {formatChatDate(dayMessages[0].created_at)}
                      </span>
                    </div>

                    {/* Mensagens do dia */}
                    {dayMessages.map((msg) => {
                      const isMe = msg.sender_id === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[65%] rounded-lg px-3 py-2 ${
                              isMe
                                ? 'bg-[#005c4b] text-[#e9edef]'
                                : 'bg-[#202c33] text-[#e9edef]'
                            }`}
                          >
                            <p className="text-sm break-words whitespace-pre-wrap">{msg.message}</p>
                            {msg.attachment_url && (
                              <a
                                href={msg.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[#53bdeb] underline mt-1 block"
                              >
                                Ver anexo
                              </a>
                            )}
                            <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? '' : 'text-right'}`}>
                              <span className="text-[10px] text-[#8696a0]">
                                {format(new Date(msg.created_at), 'HH:mm')}
                              </span>
                              {isMe && (
                                msg.is_read
                                  ? <CheckCheck className="w-4 h-4 text-[#53bdeb]" />
                                  : <Check className="w-4 h-4 text-[#8696a0]" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Input */}
          <div className="p-3 bg-[#202c33]">
            <div className="flex items-center gap-2">
              <label className="cursor-pointer p-2 hover:bg-[#2a3942] rounded-full">
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                {uploading ? (
                  <Loader2 className="w-6 h-6 text-[#8696a0] animate-spin" />
                ) : (
                  <Paperclip className="w-6 h-6 text-[#8696a0]" />
                )}
              </label>

              <Input
                placeholder="Mensagem"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !sendMutation.isPending) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="flex-1 bg-[#2a3942] border-0 text-[#e9edef] placeholder:text-[#8696a0] focus-visible:ring-0 rounded-lg"
              />

              <button
                onClick={handleSend}
                disabled={!message.trim() || sendMutation.isPending}
                className="p-2 hover:bg-[#2a3942] rounded-full disabled:opacity-50"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="w-6 h-6 text-[#8696a0] animate-spin" />
                ) : (
                  <Send className="w-6 h-6 text-[#8696a0]" />
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Estado vazio - sem conversa selecionada */
        !isMobileView && (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#222e35]">
            <div className="text-center max-w-md">
              <div className="w-64 h-64 mx-auto mb-6 bg-[#2a3942] rounded-full flex items-center justify-center">
                <MessageCircle className="w-32 h-32 text-[#3b4a54]" />
              </div>
              <h2 className="text-3xl font-light text-[#e9edef] mb-3">
                ConectPro Chat
              </h2>
              <p className="text-[#8696a0]">
                Converse com profissionais e clientes sobre orçamentos.
                Selecione uma conversa para começar.
              </p>
            </div>
          </div>
        )
      )}
    </div>
  );
}
