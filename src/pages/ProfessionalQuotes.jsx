import React, { useState, useEffect } from 'react';
import { useAuth } from "@/lib/AuthContext";
import { Professional, QuoteRequest, QuoteResponse } from "@/lib/entities";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/interface do usuário/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentes/interface do usuário/tabs";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Search, TrendingUp, Clock, CheckCircle, Loader2 } from "lucide-react";
import QuoteCard from "@/componentes/citações/QuoteCard";
import QuoteResponseForm from "@/componentes/profissional/QuoteResponseForm";
import { Dialog, DialogContent } from "@/componentes/interface do usuário/dialog";

export default function ProfessionalQuotes() {
  const { user, isLoadingAuth, isAuthenticated, navigateToLogin } = useAuth();
  const [professional, setProfessional] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      navigateToLogin();
    }
  }, [isLoadingAuth, isAuthenticated, navigateToLogin]);

  // Load professional profile
  useEffect(() => {
    const loadProfessional = async () => {
      if (user) {
        try {
          const profs = await Professional.filter({
            filters: { user_id: user.id },
            limit: 1
          });
          if (profs[0]) setProfessional(profs[0]);
        } catch (e) {
          console.error(e);
        }
      }
    };
    loadProfessional();
  }, [user]);

  // Available quotes for this professional
  const { data: availableQuotes = [] } = useQuery({
    queryKey: ['available-quotes', professional?.id],
    queryFn: async () => {
      const quotes = await QuoteRequest.filter({
        filters: {
          profession: professional.profession,
          city: professional.city,
          status: 'open'
        },
        orderBy: { field: 'created_date', direction: 'desc' },
        limit: 50
      });
      return quotes;
    },
    enabled: !!professional
  });

  // Quotes I've responded to
  const { data: myResponses = [] } = useQuery({
    queryKey: ['my-responses', professional?.id],
    queryFn: async () => {
      const responses = await QuoteResponse.filter({
        filters: { professional_id: professional.id },
        orderBy: { field: 'created_date', direction: 'desc' },
        limit: 100
      });
      return responses;
    },
    enabled: !!professional
  });

  if (isLoadingAuth || !user) {
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Pedidos de Orcamento</h1>
          <p className="text-slate-600">Responda pedidos e ganhe mais clientes</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Orcamentos Gratuitos</p>
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
              Disponiveis ({availableQuotes.length})
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
                    Voce atingiu o limite de orcamentos gratuitos
                  </h3>
                  <p className="text-orange-800 text-sm mb-4">
                    Assine um plano para continuar respondendo ilimitadamente ou pague R$ 5,00 por orcamento individual.
                  </p>
                  <Badge className="bg-orange-500">Plano Gratuito: 3 orcamentos/mes</Badge>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableQuotes.map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  onView={() => setSelectedQuote(quote)}
                  userType="professional"
                />
              ))}
            </div>

            {availableQuotes.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Nenhum pedido disponivel no momento
                  </h3>
                  <p className="text-slate-600">
                    Novos pedidos aparecerao aqui quando clientes solicitarem orcamentos na sua regiao.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="responded">
            <div className="space-y-4">
              {myResponses.map((response) => (
                <Card key={response.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg">Orcamento enviado</h3>
                        <p className="text-2xl font-bold text-green-600 mt-2">
                          R$ {response.estimated_price?.toFixed(2)}
                        </p>
                        <p className="text-sm text-slate-600 mt-2">{response.message}</p>
                      </div>
                      <Badge className={response.status === 'hired' ? 'bg-purple-500' : 'bg-blue-500'}>
                        {response.status === 'hired' ? 'Contratado!' : 'Aguardando'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialog for responding to quote */}
        <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {selectedQuote && professional && (
              <QuoteResponseForm
                quoteRequest={selectedQuote}
                professional={professional}
                onSuccess={() => setSelectedQuote(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
