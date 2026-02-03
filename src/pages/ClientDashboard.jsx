import React from 'react';
import { useAuth } from "@/lib/AuthContext";
import { ClientSubscription, PlanConfig } from "@/lib/entities";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/componentes/interface do usuário/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/interface do usuário/card";
import { Badge } from "@/componentes/interface do usuário/badge";
import {
  CreditCard, CheckCircle, Clock, Search,
  Loader2, Star, Calendar
} from "lucide-react";

export default function ClientDashboard() {
  const { user, isLoadingAuth, isAuthenticated, navigateToLogin } = useAuth();

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      navigateToLogin();
    }
  }, [isLoadingAuth, isAuthenticated, navigateToLogin]);

  const { data: subscription, isLoading: loadingSub } = useQuery({
    queryKey: ['my-subscription', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const results = await ClientSubscription.filter({
        filters: { user_id: user.id, is_active: true }
      });
      return results[0] || null;
    },
    enabled: !!user
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => PlanConfig.list()
  });

  const isSubscriptionValid = () => {
    if (!subscription) return false;
    if (subscription.plan_type === 'vitalicio') return true;
    if (subscription.expires_at && new Date(subscription.expires_at) > new Date()) return true;
    return false;
  };

  if (isLoadingAuth || !user || loadingSub) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  const clientDailyPlan = plans.find(p => p.plan_key === 'cliente_diario');
  const clientLifetimePlan = plans.find(p => p.plan_key === 'cliente_vitalicio');

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Minha Conta</h1>
          <p className="text-slate-600">Gerencie sua assinatura e acesso aos profissionais</p>
        </div>

        {/* Free Contacts Status */}
        <Card className="mb-8 border-2 border-green-300 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center bg-green-100">
                  <Star className="w-7 h-7 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Contatos Gratuitos</p>
                  <p className="text-3xl font-bold text-green-700">
                    {(user?.free_contacts_limit || 3) - (user?.free_contacts_used || 0)} / {user?.free_contacts_limit || 3}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    {(user?.free_contacts_used || 0) >= (user?.free_contacts_limit || 3)
                      ? 'Contatos gratuitos esgotados'
                      : 'Restantes para usar'}
                  </p>
                </div>
              </div>
              <Badge className="bg-green-500">Gratis</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Current Status */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  isSubscriptionValid() ? 'bg-green-100' : 'bg-slate-100'
                }`}>
                  {isSubscriptionValid() ? (
                    <CheckCircle className="w-7 h-7 text-green-600" />
                  ) : (
                    <Clock className="w-7 h-7 text-slate-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-600">Plano Pago Ativo</p>
                  <p className="text-xl font-bold text-slate-900">
                    {isSubscriptionValid() ? 'Acesso Ilimitado' : 'Nenhum'}
                  </p>
                  {subscription?.plan_type === 'diario' && subscription?.expires_at && (
                    <p className="text-sm text-slate-500 mt-1">
                      Expira em: {new Date(subscription.expires_at).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>

              {isSubscriptionValid() && (
                <Badge className="bg-green-500">Ativo</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card className="mb-8 border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-3">Como Funciona</h3>
            <ul className="space-y-2 text-slate-700">
              <li className="flex items-start gap-2">
                <span className="font-bold text-green-600 mt-1">1.</span>
                <span>Voce tem <strong>3 contatos gratuitos</strong> para testar</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-orange-600 mt-1">2.</span>
                <span>Depois, pague <strong>R$ 3,69 por 24 horas</strong> de acesso ilimitado</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600 mt-1">3.</span>
                <span>Busque, compare e entre em contato com quantos profissionais quiser!</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Plans */}
        <h2 className="text-xl font-bold text-slate-900 mb-4">Planos Disponiveis</h2>
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8">
          {/* Daily Plan */}
          <Card className="border-2 border-orange-300 hover:border-orange-500 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Acesso de 1 Dia</h3>
                  <p className="text-slate-600">Contatos ilimitados por 24 horas</p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold text-orange-600">R$ 3,69</p>
                  <p className="text-sm text-slate-500">por 24 horas</p>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-slate-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Contatos ilimitados por 24h
                </li>
                <li className="flex items-center gap-2 text-slate-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  WhatsApp direto dos profissionais
                </li>
                <li className="flex items-center gap-2 text-slate-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Sem compromisso ou renovacao automatica
                </li>
                <li className="flex items-center gap-2 text-slate-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Acesso imediato apos pagamento
                </li>
              </ul>

              <Button className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-lg font-semibold">
                <CreditCard className="w-5 h-5 mr-2" />
                Ativar Acesso
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Acoes Rapidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link to={createPageUrl("SearchProfessionals")}>
                <Button variant="outline" className="w-full h-auto py-4 justify-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Search className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">Buscar Profissionais</p>
                    <p className="text-sm text-slate-500">Encontre o profissional ideal</p>
                  </div>
                </Button>
              </Link>

              <Link to={createPageUrl("Home")}>
                <Button variant="outline" className="w-full h-auto py-4 justify-start gap-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">Ver Categorias</p>
                    <p className="text-sm text-slate-500">Explore todas as categorias</p>
                  </div>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
