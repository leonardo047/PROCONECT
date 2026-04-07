import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from "@/lib/AuthContext";
import { Professional, QuoteRequest, QuoteResponse, Profile } from "@/lib/entities";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/componentes/interface do usuário/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentes/interface do usuário/tabs";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Button } from "@/componentes/interface do usuário/button";
import { Search, TrendingUp, Clock, CheckCircle, Loader2, ChevronDown, MessageSquare } from "lucide-react";
import QuoteCard from "@/componentes/citações/QuoteCard";
import QuoteResponseForm from "@/componentes/profissional/QuoteResponseForm";
import QuoteChat from "@/componentes/bater papo/QuoteChat";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/componentes/interface do usuário/dialog";

const ITEMS_PER_PAGE = 9;

export default function ProfessionalQuotes() {
  const { user, isLoadingAuth, isAuthenticated, navigateToLogin, professional: authProfessional } = useAuth();
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [visibleAvailable, setVisibleAvailable] = useState(ITEMS_PER_PAGE);
  const [visibleResponded, setVisibleResponded] = useState(ITEMS_PER_PAGE);
  const [redirecting, setRedirecting] = useState(false);
  const [chatResponse, setChatResponse] = useState(null);
  const [chatClient, setChatClient] = useState(null);
  const [chatQuoteRequest, setChatQuoteRequest] = useState(null);

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated && !redirecting) {
      setRedirecting(true);
      const timer = setTimeout(() => {
        navigateToLogin();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoadingAuth, isAuthenticated, navigateToLogin, redirecting]);

  // Usar React Query para carregar professional, com fallback para o authProfessional
  const { data: queriedProfessional, isLoading: loadingProfessional, isError: errorProfessional } = useQuery({
    queryKey: ['my-professional', user?.id],
    queryFn: async () => {
      try {
        const profs = await Professional.filter({
          filters: { user_id: user.id },
          limit: 1
        });
        return profs[0] || null;
      } catch (error) {
        return null;
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const professional = queriedProfessional ?? authProfessional ?? null;

  const { data: availableQuotes = [], isLoading: loadingAvailable } = useQuery({
    queryKey: ['available-quotes', professional?.id, professional?.profession, professional?.city],
    queryFn: async () => {
      try {
        // Garantir que temos os dados necessários
        if (!professional?.profession || !professional?.city) {
          return [];
        }
        const quotes = await QuoteRequest.filter({
          filters: {
            profession: professional.profession,
            city: professional.city,
            status: 'open'
          },
          orderBy: { field: 'created_at', direction: 'desc' },
          limit: 50
        });
        return quotes;
      } catch (error) {
        return [];
      }
    },
    enabled: !!professional?.id && !!professional?.profession && !!professional?.city,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: myResponses = [], isLoading: loadingResponses } = useQuery({
    queryKey: ['my-responses', professional?.id],
    queryFn: async () => {
      try {
        const responses = await QuoteResponse.filter({
          filters: { professional_id: professional.id },
          orderBy: { field: 'created_at', direction: 'desc' },
          limit: 100
        });
        return responses;
      } catch (error) {
        return [];
      }
    },
    enabled: !!professional,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const visibleAvailableQuotes = useMemo(() =>
    availableQuotes.slice(0, visibleAvailable),
    [availableQuotes, visibleAvailable]
  );

  const visibleRespondedQuotes = useMemo(() =>
    myResponses.slice(0, visibleResponded),
    [myResponses, visibleResponded]
  );

  // Abrir chat com cliente
  const openChat = async (response) => {
    try {
      // Buscar dados do quote_request para obter client_id
      const quoteRequests = await QuoteRequest.filter({
        filters: { id: response.quote_request_id },
        limit: 1
      });
      const quoteRequest = quoteRequests[0];

      if (quoteRequest) {
        setChatQuoteRequest(quoteRequest);
        // Buscar dados do cliente
        const clientProfile = await Profile.get(quoteRequest.client_id);
        setChatClient({
          id: quoteRequest.client_id,
          name: quoteRequest.client_name || clientProfile?.full_name || 'Cliente',
          full_name: quoteRequest.client_name || clientProfile?.full_name || 'Cliente'
        });
      } else {
        setChatQuoteRequest({ title: 'Orçamento', id: response.quote_request_id });
        setChatClient({ id: null, name: 'Cliente', full_name: 'Cliente' });
      }
      setChatResponse(response);
    } catch (error) {
      setChatQuoteRequest({ title: 'Orçamento', id: response.quote_request_id });
      setChatClient({ id: null, name: 'Cliente', full_name: 'Cliente' });
      setChatResponse(response);
    }
  };

  // Mostrar loading APENAS enquanto verifica autenticação inicial
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  // Se não está autenticado, redirecionar (o useEffect cuida disso)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  const freeQuotesLeft = 3 - (professional?.free_quotes_used || 0);

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Pedidos de Orçamento</h1>
          <p className="text-slate-600">Responda pedidos e ganhe mais clientes</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Orçamentos Gratuitos</p>
                  <p className="text-3xl font-bold text-green-600">{freeQuotesLeft}</p>
                </div>
                <TrendingUp className="w-12 h-12 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Respondidos</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {professional?.total_quotes_responded || 0}
                  </p>
                </div>
                <CheckCircle className="w-12 h-12 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Taxa de Resposta</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {professional?.response_rate || 0}%
                  </p>
                </div>
                <Clock className="w-12 h-12 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="available">
          <TabsList className="mb-6">
            <TabsTrigger value="available">
              Disponíveis ({availableQuotes.length})
            </TabsTrigger>
            <TabsTrigger value="responded">
              Respondidos ({myResponses.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available">
            {freeQuotesLeft === 0 && professional?.plan_type === 'free' && (
              <Card className="mb-6 border-orange-200 bg-orange-50">
                <CardContent className="p-6">
                  <h3 className="font-bold text-orange-900 mb-2">
                    Você atingiu o limite de orçamentos gratuitos
                  </h3>
                  <p className="text-orange-800 text-sm mb-4">
                    Assine um plano para continuar respondendo ilimitadamente ou pague R$ 5,00 por orçamento individual.
                  </p>
                  <Badge className="bg-orange-500">Plano Gratuito: 3 orçamentos/mês</Badge>
                </CardContent>
              </Card>
            )}

            {loadingAvailable ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {visibleAvailableQuotes.map((quote) => (
                    <QuoteCard
                      key={quote.id}
                      quote={quote}
                      onView={() => setSelectedQuote(quote)}
                      userType="professional"
                    />
                  ))}
                </div>

                {visibleAvailable < availableQuotes.length && (
                  <div className="mt-6 text-center">
                    <Button
                      variant="outline"
                      onClick={() => setVisibleAvailable(v => v + ITEMS_PER_PAGE)}
                    >
                      <ChevronDown className="w-4 h-4 mr-2" />
                      Carregar Mais ({availableQuotes.length - visibleAvailable} restantes)
                    </Button>
                  </div>
                )}

                {availableQuotes.length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-slate-900 mb-2">
                        Nenhum pedido disponível no momento
                      </h3>
                      <p className="text-slate-600">
                        Novos pedidos aparecerão aqui quando clientes solicitarem orçamentos na sua região.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="responded">
            {loadingResponses ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {visibleRespondedQuotes.map((response) => (
                    <Card key={response.id}>
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg">Orçamento enviado</h3>
                            <p className="text-2xl font-bold text-green-600 mt-2">
                              R$ {response.estimated_price?.toFixed(2)}
                            </p>
                            <p className="text-sm text-slate-600 mt-2 line-clamp-2">{response.message}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge className={response.status === 'hired' ? 'bg-purple-500' : 'bg-blue-500'}>
                              {response.status === 'hired' ? 'Contratado!' : 'Aguardando'}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openChat(response)}
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Conversar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {visibleResponded < myResponses.length && (
                  <div className="mt-6 text-center">
                    <Button
                      variant="outline"
                      onClick={() => setVisibleResponded(v => v + ITEMS_PER_PAGE)}
                    >
                      <ChevronDown className="w-4 h-4 mr-2" />
                      Carregar Mais ({myResponses.length - visibleResponded} restantes)
                    </Button>
                  </div>
                )}

                {myResponses.length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-slate-900 mb-2">
                        Nenhum orçamento enviado ainda
                      </h3>
                      <p className="text-slate-600">
                        Responda pedidos disponíveis para aparecer aqui.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialog for responding to quote */}
        <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="sr-only">
              <DialogTitle>Responder Orçamento</DialogTitle>
              <DialogDescription>Envie sua proposta</DialogDescription>
            </DialogHeader>
            {selectedQuote && professional && (
              <QuoteResponseForm
                quoteRequest={selectedQuote}
                professional={professional}
                onSuccess={() => setSelectedQuote(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog for chat with client */}
        <Dialog open={!!chatResponse} onOpenChange={() => { setChatResponse(null); setChatClient(null); setChatQuoteRequest(null); }}>
          <DialogContent className="max-w-2xl p-0">
            <DialogHeader className="sr-only">
              <DialogTitle>Chat com {chatClient?.name}</DialogTitle>
              <DialogDescription>Converse sobre o orçamento</DialogDescription>
            </DialogHeader>
            {chatResponse && chatClient && professional && (
              <QuoteChat
                quoteResponseId={chatResponse.id}
                quoteRequest={chatQuoteRequest}
                quoteResponse={chatResponse}
                currentUser={{
                  ...user,
                  name: professional.name,
                  full_name: professional.name
                }}
                otherUser={chatClient}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
