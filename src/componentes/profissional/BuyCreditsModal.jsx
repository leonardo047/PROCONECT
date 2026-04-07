import React, { useState } from 'react';
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/componentes/interface do usuário/dialog";
import { Button } from "@/componentes/interface do usuário/button";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Card, CardContent } from "@/componentes/interface do usuário/card";
import {
  Coins, Infinity, Check, Sparkles, TrendingUp,
  CreditCard, ShoppingCart, Star, Zap, Gift, Loader2
} from "lucide-react";
import MercadoPagoCheckout from "@/componentes/pagamento/MercadoPagoCheckout";
import { PricingPlanService } from "@/lib/entities";

// Fallback - Pacotes de créditos disponíveis (caso o banco falhe)
const FALLBACK_CREDIT_PACKAGES = [
  {
    id: 'credits_5',
    plan_key: 'credits_5',
    credits: 5,
    price: 18.45,
    price_per_credit: 3.69,
    is_popular: false,
    discount_percentage: null
  },
  {
    id: 'credits_10',
    plan_key: 'credits_10',
    credits: 10,
    price: 34.90,
    price_per_credit: 3.49,
    is_popular: true,
    discount_percentage: 5
  },
  {
    id: 'credits_20',
    plan_key: 'credits_20',
    credits: 20,
    price: 65.80,
    price_per_credit: 3.29,
    is_popular: false,
    discount_percentage: 11
  }
];

// Fallback - Plano de assinatura (créditos infinitos)
const FALLBACK_SUBSCRIPTION_PLAN = {
  id: 'unlimited_monthly',
  plan_key: 'unlimited_monthly',
  name: 'Plano Ilimitado',
  price: 3.69,
  period: 'mes',
  features: [
    'Créditos infinitos',
    'Responda quantas cotações quiser',
    'Sem limite de respostas',
    'Cancele quando quiser'
  ]
};

export default function BuyCreditsModal({
  isOpen,
  onClose,
  professionalId,
  currentBalance = 0
}) {
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [purchaseType, setPurchaseType] = useState(null); // 'credits' ou 'subscription'
  const queryClient = useQueryClient();

  // Buscar pacotes de créditos do banco
  const { data: creditPackages = [], isLoading: loadingPackages } = useQuery({
    queryKey: ['pricing-credit-packages'],
    queryFn: () => PricingPlanService.getCreditPackages(),
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 1
  });

  // Buscar plano de assinatura do banco
  const { data: subscriptionPlan, isLoading: loadingSubscription } = useQuery({
    queryKey: ['pricing-subscription-plan'],
    queryFn: () => PricingPlanService.getSubscriptionPlan(),
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 1
  });

  // Usar dados do banco ou fallback
  const CREDIT_PACKAGES = creditPackages.length > 0 ? creditPackages : FALLBACK_CREDIT_PACKAGES;
  const SUBSCRIPTION_PLAN = subscriptionPlan || FALLBACK_SUBSCRIPTION_PLAN;

  const isLoading = loadingPackages || loadingSubscription;

  const handleSelectPackage = (pkg) => {
    setSelectedPackage(pkg);
    setPurchaseType('credits');
  };

  const handleSelectSubscription = () => {
    setSelectedPackage(SUBSCRIPTION_PLAN);
    setPurchaseType('subscription');
  };

  const handleProceedToCheckout = () => {
    if (selectedPackage) {
      setCheckoutOpen(true);
    }
  };

  const handlePaymentSuccess = () => {
    setCheckoutOpen(false);
    setSelectedPackage(null);
    queryClient.invalidateQueries(['credit-status', professionalId]);
    queryClient.invalidateQueries(['my-professional']);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen && !checkoutOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ShoppingCart className="w-6 h-6 text-orange-500" />
              Comprar Créditos
            </DialogTitle>
            <DialogDescription>
              Escolha um pacote de créditos ou assine para ter créditos ilimitados
            </DialogDescription>
          </DialogHeader>

          {/* Saldo atual */}
          <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-between">
            <span className="text-slate-600">Seu saldo atual:</span>
            <Badge variant="outline" className="text-lg px-3 py-1">
              <Coins className="w-4 h-4 mr-1" />
              {currentBalance} crédito{currentBalance !== 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-2" />
              <p className="text-slate-500">Carregando planos...</p>
            </div>
          )}

          {/* Secao: Plano Ilimitado */}
          {!isLoading && SUBSCRIPTION_PLAN && (
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Infinity className="w-5 h-5 text-purple-500" />
              Melhor Opcao: Plano Ilimitado
            </h3>

            <Card
              className={`cursor-pointer transition-all border-2 ${
                purchaseType === 'subscription'
                  ? 'border-purple-500 bg-purple-50 shadow-lg'
                  : 'border-purple-200 hover:border-purple-400 hover:shadow-md'
              }`}
              onClick={handleSelectSubscription}
            >
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Infinity className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-lg text-slate-900">{SUBSCRIPTION_PLAN.name}</h4>
                        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Recomendado
                        </Badge>
                      </div>
                      <ul className="text-sm text-slate-600 space-y-1 mt-2">
                        {(Array.isArray(SUBSCRIPTION_PLAN.features) ? SUBSCRIPTION_PLAN.features : []).map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-3xl font-bold text-purple-600">
                      R$ {parseFloat(SUBSCRIPTION_PLAN.price).toFixed(2).replace('.', ',')}
                    </div>
                    <div className="text-sm text-slate-500">por {SUBSCRIPTION_PLAN.period || 'mes'}</div>
                    {purchaseType === 'subscription' && (
                      <Badge className="mt-2 bg-purple-500">
                        <Check className="w-3 h-3 mr-1" />
                        Selecionado
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          )}

          {/* Divisor */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-slate-500">ou compre créditos avulsos</span>
            </div>
          </div>

          {/* Secao: Pacotes de Créditos */}
          {!isLoading && (
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Coins className="w-5 h-5 text-green-500" />
              Pacotes de Créditos
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {CREDIT_PACKAGES.map((pkg) => {
                const pkgId = pkg.plan_key || pkg.id;
                const pkgIsPopular = pkg.is_popular || pkg.popular;
                const pkgDiscount = pkg.discount_percentage || pkg.discount;
                const pkgPricePerCredit = pkg.price_per_credit || pkg.pricePerCredit || (pkg.credits > 0 ? pkg.price / pkg.credits : 0);

                return (
                <Card
                  key={pkgId}
                  className={`cursor-pointer transition-all border-2 relative ${
                    (selectedPackage?.plan_key || selectedPackage?.id) === pkgId && purchaseType === 'credits'
                      ? 'border-green-500 bg-green-50 shadow-lg'
                      : pkgIsPopular
                        ? 'border-orange-300 hover:border-orange-500 hover:shadow-md'
                        : 'border-slate-200 hover:border-slate-400 hover:shadow-md'
                  }`}
                  onClick={() => handleSelectPackage(pkg)}
                >
                  {pkgIsPopular && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-orange-500 text-white">
                      <Star className="w-3 h-3 mr-1" />
                      Popular
                    </Badge>
                  )}
                  {pkgDiscount && (
                    <Badge className="absolute -top-2 -right-2 bg-green-500 text-white">
                      -{typeof pkgDiscount === 'number' ? `${pkgDiscount}%` : pkgDiscount}
                    </Badge>
                  )}

                  <CardContent className="p-4 text-center">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Coins className="w-5 h-5 text-green-600" />
                    </div>

                    <div className="text-3xl font-bold text-slate-900 mb-1">
                      {pkg.credits}
                    </div>
                    <div className="text-sm text-slate-500 mb-3">créditos</div>

                    <div className="text-xl font-bold text-green-600">
                      R$ {parseFloat(pkg.price).toFixed(2).replace('.', ',')}
                    </div>
                    <div className="text-xs text-slate-500">
                      R$ {parseFloat(pkgPricePerCredit).toFixed(2).replace('.', ',')} por crédito
                    </div>

                    {(selectedPackage?.plan_key || selectedPackage?.id) === pkgId && purchaseType === 'credits' && (
                      <Badge className="mt-3 bg-green-500">
                        <Check className="w-3 h-3 mr-1" />
                        Selecionado
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
              })}
            </div>
          </div>
          )}

          {/* Info sobre créditos */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <div className="flex items-start gap-3">
              <Gift className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-800 mb-1">Como funcionam os créditos?</p>
                <ul className="text-blue-700 space-y-1">
                  <li>1 crédito = 1 resposta a pedido de orçamento</li>
                  <li>Créditos não expiram enquanto você tiver conta ativa</li>
                  <li>Use créditos de indicação junto com os avulsos</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Botao de Acao */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleProceedToCheckout}
              disabled={!selectedPackage}
              className={`flex-1 ${
                purchaseType === 'subscription'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                  : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {purchaseType === 'subscription'
                ? `Assinar por R$ ${parseFloat(SUBSCRIPTION_PLAN.price).toFixed(2).replace('.', ',')}/mes`
                : selectedPackage
                  ? `Comprar ${selectedPackage.credits} Créditos`
                  : 'Selecione uma opção'
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Checkout Mercado Pago */}
      {selectedPackage && (
        <MercadoPagoCheckout
          isOpen={checkoutOpen}
          onClose={() => {
            setCheckoutOpen(false);
            setSelectedPackage(null);
          }}
          planKey={purchaseType === 'subscription' ? (SUBSCRIPTION_PLAN.plan_key || 'unlimited_monthly') : (selectedPackage.plan_key || selectedPackage.id)}
          planName={
            purchaseType === 'subscription'
              ? SUBSCRIPTION_PLAN.name
              : `${selectedPackage.credits} Créditos`
          }
          planPrice={parseFloat(selectedPackage.price)}
          professionalId={professionalId}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}
