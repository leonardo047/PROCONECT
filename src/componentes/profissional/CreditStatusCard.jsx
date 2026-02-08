import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { CreditsService } from "@/lib/entities";
import { Card, CardContent } from "@/componentes/interface do usuário/card";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Button } from "@/componentes/interface do usuário/button";
import {
  Coins, Infinity, Clock, ShoppingCart,
  CheckCircle, AlertCircle, Loader2, Sparkles
} from "lucide-react";

export default function CreditStatusCard({
  professionalId,
  onBuyCredits,
  compact = false,
  showBuyButton = true
}) {
  const { data: creditStatus, isLoading } = useQuery({
    queryKey: ['credit-status', professionalId],
    queryFn: () => CreditsService.getStatus(professionalId),
    enabled: !!professionalId,
    staleTime: 30000, // 30 segundos
    refetchInterval: 60000, // Atualiza a cada 1 minuto
  });

  if (isLoading) {
    return (
      <Card className="border-slate-200">
        <CardContent className={compact ? "p-3" : "p-4"}>
          <div className="flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Carregando créditos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasUnlimited = creditStatus?.has_unlimited;
  const creditsBalance = creditStatus?.credits_balance || 0;
  const referralCredits = creditStatus?.referral_credits || 0;
  const canRespond = creditStatus?.can_respond;
  const expiresAt = creditStatus?.unlimited_expires_at;

  // Formatar data de expiração
  const formatExpirationDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'Expirado';
    if (diffDays === 1) return 'Expira amanha';
    if (diffDays <= 7) return `Expira em ${diffDays} dias`;
    return `Valido até ${date.toLocaleDateString('pt-BR')}`;
  };

  // Versao compacta para barra lateral ou header
  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
        hasUnlimited
          ? 'bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200'
          : canRespond
            ? 'bg-green-50 border border-green-200'
            : 'bg-orange-50 border border-orange-200'
      }`}>
        {hasUnlimited ? (
          <>
            <Infinity className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Créditos Infinitos</span>
          </>
        ) : (
          <>
            <Coins className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-slate-700">
              {creditsBalance + referralCredits} crédito{creditsBalance + referralCredits !== 1 ? 's' : ''}
            </span>
          </>
        )}
      </div>
    );
  }

  // Versao completa para dashboard
  return (
    <Card className={`border-2 ${
      hasUnlimited
        ? 'border-purple-300 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50'
        : canRespond
          ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50'
          : 'border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50'
    }`}>
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Status Principal */}
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
              hasUnlimited
                ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                : canRespond
                  ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                  : 'bg-gradient-to-br from-orange-400 to-orange-500'
            }`}>
              {hasUnlimited ? (
                <Infinity className="w-6 h-6 md:w-7 md:h-7 text-white" />
              ) : (
                <Coins className="w-6 h-6 md:w-7 md:h-7 text-white" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg md:text-xl font-bold text-slate-900">
                  {hasUnlimited ? 'Créditos Infinitos' : 'Meus Créditos'}
                </h3>
                {hasUnlimited && (
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Premium
                  </Badge>
                )}
              </div>

              {hasUnlimited ? (
                <div className="space-y-1">
                  <p className="text-purple-700 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Responda quantas cotações quiser!
                  </p>
                  {expiresAt && (
                    <p className="text-sm text-purple-600 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatExpirationDate(expiresAt)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-slate-600">
                    <span className="text-2xl font-bold text-slate-900">{creditsBalance}</span>
                    {' '}crédito{creditsBalance !== 1 ? 's' : ''} avulso{creditsBalance !== 1 ? 's' : ''}
                    {referralCredits > 0 && (
                      <span className="text-green-600 ml-2">
                        +{referralCredits} de indicação
                      </span>
                    )}
                  </p>
                  {!canRespond && (
                    <p className="text-sm text-orange-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Compre créditos para responder cotações
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Botao de Comprar */}
          {showBuyButton && !hasUnlimited && (
            <div className="flex flex-col gap-2">
              <Button
                onClick={onBuyCredits}
                className={`${
                  canRespond
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Comprar Créditos
              </Button>
              <p className="text-xs text-slate-500 text-center">
                A partir de R$ 3,69 cada
              </p>
            </div>
          )}
        </div>

        {/* Info adicional para quem tem créditos */}
        {!hasUnlimited && creditsBalance > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              <strong>Como funciona:</strong> Cada crédito permite responder 1 pedido de orçamento.
              Assine um plano para ter créditos infinitos!
            </p>
          </div>
        )}

        {/* Info para quem tem créditos infinitos */}
        {hasUnlimited && creditsBalance > 0 && (
          <div className="mt-4 pt-4 border-t border-purple-200">
            <p className="text-sm text-purple-700">
              Você também tem <strong>{creditsBalance} crédito{creditsBalance !== 1 ? 's' : ''} avulso{creditsBalance !== 1 ? 's' : ''}</strong> guardado{creditsBalance !== 1 ? 's' : ''} para quando seu plano expirar.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
