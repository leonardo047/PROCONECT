import React, { useState, useMemo } from 'react';
import { useAuth } from "@/lib/AuthContext";
import { QuoteRequest, QuoteResponse } from "@/lib/entities";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/componentes/interface do usuário/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/interface do usuário/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentes/interface do usuário/tabs";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Plus, Search, MessageSquare, CheckCircle, Loader2, ChevronDown } from "lucide-react";
import QuoteRequestForm from "@/componentes/profissional/QuoteRequestForm";
import QuoteCard from "@/componentes/citações/QuoteCard";
import { Dialog, DialogContent } from "@/componentes/interface do usuário/dialog";

const ITEMS_PER_PAGE = 9;

export default function ClientQuotes() {
  const { user, isLoadingAuth } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [visibleOpen, setVisibleOpen] = useState(ITEMS_PER_PAGE);
  const [visibleClosed, setVisibleClosed] = useState(ITEMS_PER_PAGE);

  const { data: myQuotes = [], isLoading } = useQuery({
    queryKey: ['client-quotes', user?.id],
    queryFn: () => QuoteRequest.filter({
      filters: { client_id: user.id },
      orderBy: { field: 'created_date', direction: 'desc' },
      limit: 100
    }),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: responses = [] } = useQuery({
    queryKey: ['quote-responses', selectedQuote?.id],
    queryFn: () => QuoteResponse.filter({
      filters: { quote_request_id: selectedQuote.id },
      orderBy: { field: 'created_date', direction: 'desc' },
      limit: 50
    }),
    enabled: !!selectedQuote
  });

  const openQuotes = useMemo(() =>
    myQuotes.filter(q => q.status === 'open' || q.status === 'quotes_received'),
    [myQuotes]
  );

  const closedQuotes = useMemo(() =>
    myQuotes.filter(q => ['hired', 'completed', 'cancelled'].includes(q.status)),
    [myQuotes]
  );

  const visibleOpenQuotes = openQuotes.slice(0, visibleOpen);
  const visibleClosedQuotes = closedQuotes.slice(0, visibleClosed);

  if (isLoadingAuth || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Meus Pedidos de Orçamento</h1>
            <p className="text-slate-600">Gerencie suas solicitações e orçamentos recebidos</p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Pedido
          </Button>
        </div>

        <Tabs defaultValue="open">
          <TabsList className="mb-6">
            <TabsTrigger value="open">
              Abertos ({openQuotes.length})
            </TabsTrigger>
            <TabsTrigger value="closed">
              Finalizados ({closedQuotes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="open">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleOpenQuotes.map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  onView={() => setSelectedQuote(quote)}
                  userType="client"
                />
              ))}
            </div>

            {visibleOpen < openQuotes.length && (
              <div className="mt-6 text-center">
                <Button
                  variant="outline"
                  onClick={() => setVisibleOpen(v => v + ITEMS_PER_PAGE)}
                >
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Carregar Mais ({openQuotes.length - visibleOpen} restantes)
                </Button>
              </div>
            )}

            {openQuotes.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Nenhum pedido aberto</h3>
                  <p className="text-slate-600 mb-4">Crie seu primeiro pedido de orçamento</p>
                  <Button onClick={() => setShowForm(true)}>
                    Criar Pedido
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="closed">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleClosedQuotes.map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  onView={() => setSelectedQuote(quote)}
                  userType="client"
                />
              ))}
            </div>

            {visibleClosed < closedQuotes.length && (
              <div className="mt-6 text-center">
                <Button
                  variant="outline"
                  onClick={() => setVisibleClosed(v => v + ITEMS_PER_PAGE)}
                >
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Carregar Mais ({closedQuotes.length - visibleClosed} restantes)
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialog for creating new quote */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <QuoteRequestForm />
          </DialogContent>
        </Dialog>

        {/* Dialog for viewing quote responses */}
        <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{selectedQuote?.title}</CardTitle>
                  <p className="text-sm text-slate-600 mt-2">{selectedQuote?.description}</p>
                </div>
                <Badge>
                  {selectedQuote?.responses_count || 0} orçamentos
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="font-bold text-lg mb-4">Orçamentos Recebidos</h3>
              <div className="space-y-4">
                {responses.map((response) => (
                  <Card key={response.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold">{response.professional_name}</h4>
                          <p className="text-2xl font-bold text-green-600 mt-1">
                            R$ {response.estimated_price?.toFixed(2)}
                          </p>
                        </div>
                        <Badge className="bg-blue-500">
                          {response.estimated_time}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-700 mb-3">{response.message}</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {response.includes_materials && (
                          <Badge variant="outline">Inclui materiais</Badge>
                        )}
                        {response.warranty && (
                          <Badge variant="outline">{response.warranty}</Badge>
                        )}
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button className="flex-1 bg-green-500 hover:bg-green-600">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Contratar
                        </Button>
                        <Button variant="outline" className="flex-1">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Conversar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {responses.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    Aguardando orçamentos...
                  </div>
                )}
              </div>
            </CardContent>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
