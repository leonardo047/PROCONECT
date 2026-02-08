import React, { useEffect, useState } from 'react';
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/componentes/interface do usuário/card";
import { Button } from "@/componentes/interface do usuário/button";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Loader2, Calendar, MapPin, Clock, MessageSquare, Plus, Eye, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ITEMS_PER_PAGE = 10;

const statusLabels = {
  open: { label: 'Aberto', color: 'bg-blue-500' },
  quotes_received: { label: 'Orçamentos Recebidos', color: 'bg-green-500' },
  hired: { label: 'Contratado', color: 'bg-purple-500' },
  completed: { label: 'Concluído', color: 'bg-slate-500' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500' }
};

export default function ClientAppointments() {
  const { user, navigateToLogin, isLoadingAuth, isAuthenticated } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated && !redirecting) {
      setRedirecting(true);
      setTimeout(() => navigateToLogin(), 100);
    }
  }, [isLoadingAuth, isAuthenticated, navigateToLogin, redirecting]);

  const { data: quoteRequests = [], isLoading } = useQuery({
    queryKey: ['client-quote-requests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const { data, error } = await supabase
          .from('quote_requests')
          .select('*')
          .eq('client_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) {
          console.error('Erro ao buscar solicitações:', error);
          return [];
        }

        return data || [];
      } catch (error) {
        console.error('Erro ao buscar solicitações:', error);
        return [];
      }
    },
    enabled: !!user?.id,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const visibleRequests = quoteRequests.slice(0, visibleCount);

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Minhas Solicitações</h1>
            <p className="text-slate-600">Acompanhe seus pedidos de orçamento</p>
          </div>
          <Link to={createPageUrl("RequestQuote")}>
            <Button className="bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4 mr-2" />
              Nova Solicitação
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          </div>
        ) : quoteRequests.length > 0 ? (
          <>
            <div className="space-y-4">
              {visibleRequests.map(request => {
                const status = statusLabels[request.status] || statusLabels.open;
                return (
                  <Card key={request.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-slate-900 mb-1">
                            {request.title}
                          </h3>
                          <p className="text-sm text-slate-600 line-clamp-2">
                            {request.description}
                          </p>
                        </div>
                        <Badge className={`${status.color} text-white ml-4`}>
                          {status.label}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-4">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{request.city}, {request.state}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>
                            {format(new Date(request.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        {request.responses_count > 0 && (
                          <div className="flex items-center gap-1 text-green-600">
                            <MessageSquare className="w-4 h-4" />
                            <span>{request.responses_count} orçamento(s) recebido(s)</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Link to={createPageUrl("ClientQuotes")} className="flex-1">
                          <Button variant="outline" className="w-full">
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Detalhes
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {visibleCount < quoteRequests.length && (
              <div className="mt-6 text-center">
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount(v => v + ITEMS_PER_PAGE)}
                >
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Carregar Mais ({quoteRequests.length - visibleCount} restantes)
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium text-lg mb-2">Nenhuma solicitação ainda</p>
              <p className="text-sm text-slate-400 mb-6">
                Solicite um orçamento e profissionais da sua região poderão entrar em contato.
              </p>
              <Link to={createPageUrl("RequestQuote")}>
                <Button className="bg-orange-500 hover:bg-orange-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Solicitar Orçamento
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
