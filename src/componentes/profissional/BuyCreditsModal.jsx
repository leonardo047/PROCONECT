import React, { useState } from 'react';
import { useQueryClient } from "@tanstack/react-query";
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
  CreditCard, ShoppingCart, Star, Zap, Gift
} from "lucide-react";
import MercadoPagoCheckout from "@/componentes/pagamento/MercadoPagoCheckout";

// Pacotes de créditos disponíveis
const CREDIT_PACKAGES = [
  {
    id: 'credits_5',
    credits: 5,
    price: 18.45,
    pricePerCredit: 3.69,
    popular: false,
    discount: null
  },
  {
    id: 'credits_10',
    credits: 10,
    price: 34.90,
    pricePerCredit: 3.49,
    popular: true,
    discount: '5%'
  },
  {
    id: 'credits_20',
    credits: 20,
    price: 65.80,
    pricePerCredit: 3.29,
    popular: false,
    discount: '11%'
  }
];

// Plano de assinatura (créditos infinitos)
const SUBSCRIPTION_PLAN = {
  id: 'unlimited_monthly',
  name: 'Plano Ilimitado',
  price: 36.93,
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

          {/* Secao: Plano Ilimitado */}
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
                        {SUBSCRIPTION_PLAN.features.map((feature, idx) => (
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
                      R$ {SUBSCRIPTION_PLAN.price.toFixed(2).replace('.', ',')}
                    </div>
                    <div className="text-sm text-slate-500">por {SUBSCRIPTION_PLAN.period}</div>
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
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Coins className="w-5 h-5 text-green-500" />
              Pacotes de Créditos
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {CREDIT_PACKAGES.map((pkg) => (
                <Card
                  key={pkg.id}
                  className={`cursor-pointer transition-all border-2 relative ${
                    selectedPackage?.id === pkg.id && purchaseType === 'credits'
                      ? 'border-green-500 bg-green-50 shadow-lg'
                      : pkg.popular
                        ? 'border-orange-300 hover:border-orange-500 hover:shadow-md'
                        : 'border-slate-200 hover:border-slate-400 hover:shadow-md'
                  }`}
                  onClick={() => handleSelectPackage(pkg)}
                >
                  {pkg.popular && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-orange-500 text-white">
                      <Star className="w-3 h-3 mr-1" />
                      Popular
                    </Badge>
                  )}
                  {pkg.discount && (
                    <Badge className="absolute -top-2 -right-2 bg-green-500 text-white">
                      -{pkg.discount}
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
                      R$ {pkg.price.toFixed(2).replace('.', ',')}
                    </div>
                    <div className="text-xs text-slate-500">
                      R$ {pkg.pricePerCredit.toFixed(2).replace('.', ',')} por crédito
                    </div>

                    {selectedPackage?.id === pkg.id && purchaseType === 'credits' && (
                      <Badge className="mt-3 bg-green-500">
                        <Check className="w-3 h-3 mr-1" />
                        Selecionado
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

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
                ? `Assinar por R$ ${SUBSCRIPTION_PLAN.price.toFixed(2).replace('.', ',')}/mes`
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
          planKey={purchaseType === 'subscription' ? 'unlimited_monthly' : selectedPackage.id}
          planName={
            purchaseType === 'subscription'
              ? SUBSCRIPTION_PLAN.name
              : `${selectedPackage.credits} Créditos`
          }
          planPrice={selectedPackage.price}
          professionalId={professionalId}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}
