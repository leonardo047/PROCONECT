import React, { useState, useEffect } from 'react';
import { QuoteRequest, QuoteResponse, Professional, Notification, ProfessionalService } from "@/lib/entities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Label } from "@/componentes/interface do usuário/label";
import { Textarea } from "@/componentes/interface do usuário/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/interface do usuário/card";
import { Badge } from "@/componentes/interface do usuário/badge";
import { DollarSign, Clock, Send, AlertCircle, CreditCard, Gift } from "lucide-react";
import MercadoPagoCheckout from "@/componentes/pagamento/MercadoPagoCheckout";

export default function QuoteResponseForm({ quoteRequest, professional, onSuccess }) {
  const [needsPayment, setNeedsPayment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [useReferralCredit, setUseReferralCredit] = useState(false);
  const [referralCredits, setReferralCredits] = useState(professional?.referral_credits || 0);
  const queryClient = useQueryClient();

  useEffect(() => {
    checkQuoteLimit();
  }, []);

  const checkQuoteLimit = async () => {
    // Check if professional has free quotes available
    const isFree = professional.plan_type === 'free' || professional.plan_type === 'pay_per_quote';

    // Update referral credits from professional data
    setReferralCredits(professional?.referral_credits || 0);

    if (isFree) {
      const freeUsed = professional.free_quotes_used || 0;

      if (freeUsed >= 3) {
        // Check if it's construction category - requires payment
        const constructionCategories = ['construcao', 'reforma', 'manutencao'];
        if (constructionCategories.includes(quoteRequest.category)) {
          setNeedsPayment(true);
        }
      }
    }

    setLoading(false);
  };

  const responseQuoteMutation = useMutation({
    mutationFn: async (data) => {
      // If using referral credit, deduct it first
      if (data.used_referral_credit) {
        await ProfessionalService.useReferralCredit(professional.id);
        setReferralCredits(prev => prev - 1);
      }

      const response = await QuoteResponse.create(data);

      // Update quote request
      await QuoteRequest.update(quoteRequest.id, {
        responses_count: (quoteRequest.responses_count || 0) + 1,
        status: 'quotes_received'
      });

      // Update professional counters
      const freeUsed = professional.free_quotes_used || 0;
      await Professional.update(professional.id, {
        free_quotes_used: freeUsed + 1,
        total_quotes_responded: (professional.total_quotes_responded || 0) + 1,
        last_active_date: new Date().toISOString()
      });

      // Notify client
      await Notification.create({
        user_id: quoteRequest.client_id,
        type: 'quote_response',
        title: 'Novo Orçamento Recebido',
        message: `${professional.name} enviou um orçamento para "${quoteRequest.title}"`,
        link: `/client-quotes?quote=${quoteRequest.id}`,
        priority: 'high'
      });

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['professional-quotes']);
      queryClient.invalidateQueries(['my-professional']);
      if (onSuccess) onSuccess();
      alert('Orçamento enviado com sucesso!');
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if needs payment but not using referral credit
    if (needsPayment && !useReferralCredit) {
      alert('Você atingiu o limite de 3 orçamentos gratuitos. Use um credito de indicacao, assine um plano ou pague por este orçamento individual.');
      return;
    }

    const formData = new FormData(e.target);
    const requestCreatedAt = new Date(quoteRequest.created_date);
    const now = new Date();
    const responseTimeMinutes = Math.floor((now - requestCreatedAt) / 1000 / 60);

    const data = {
      quote_request_id: quoteRequest.id,
      professional_id: professional.id,
      professional_name: professional.name,
      estimated_price: parseFloat(formData.get('estimated_price')),
      estimated_time: formData.get('estimated_time'),
      message: formData.get('message'),
      includes_materials: formData.get('includes_materials') === 'on',
      warranty: formData.get('warranty'),
      payment_methods: formData.get('payment_methods').split(',').map(s => s.trim()),
      status: 'pending',
      response_time_minutes: responseTimeMinutes,
      is_paid_response: needsPayment && !useReferralCredit,
      used_referral_credit: useReferralCredit
    };

    responseQuoteMutation.mutate(data);
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enviar Orçamento</CardTitle>
        {needsPayment && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-orange-800">
              <p className="font-medium mb-1">Limite de orcamentos gratuitos atingido</p>
              <p>Voce ja respondeu 3 orcamentos este mes. Para continuar, use um credito de indicacao, assine um plano ou pague R$ 5,00 por este orcamento.</p>
            </div>
          </div>
        )}

        {/* Referral credit option */}
        {needsPayment && referralCredits > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Gift className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="font-medium text-purple-900">Usar Credito de Indicacao</p>
                  <p className="text-sm text-purple-700">Voce tem {referralCredits} credito{referralCredits > 1 ? 's' : ''} disponivel{referralCredits > 1 ? 'is' : ''}</p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useReferralCredit}
                  onChange={(e) => setUseReferralCredit(e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded border-purple-300 focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-purple-800">Usar 1 credito</span>
              </label>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Valor do Orçamento (R$) *
            </Label>
            <Input
              name="estimated_price"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="1500.00"
            />
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Prazo Estimado *
            </Label>
            <Input
              name="estimated_time"
              required
              placeholder="Ex: 2-3 dias, 1 semana"
            />
          </div>

          <div>
            <Label>Mensagem para o Cliente *</Label>
            <Textarea
              name="message"
              required
              rows={4}
              placeholder="Descreva como você realizará o trabalho, materiais, garantias..."
            />
          </div>

          <div>
            <Label>Garantia Oferecida</Label>
            <Input
              name="warranty"
              placeholder="Ex: 90 dias de garantia"
            />
          </div>

          <div>
            <Label>Formas de Pagamento (separadas por vírgula)</Label>
            <Input
              name="payment_methods"
              placeholder="Pix, Dinheiro, Cartão"
              defaultValue="Pix, Dinheiro"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="includes_materials"
              className="w-4 h-4"
            />
            <Label className="text-sm">O valor inclui materiais</Label>
          </div>

          {!needsPayment || useReferralCredit ? (
            <Button
              type="submit"
              className={`w-full ${useReferralCredit ? 'bg-purple-500 hover:bg-purple-600' : 'bg-green-500 hover:bg-green-600'}`}
              disabled={responseQuoteMutation.isLoading}
            >
              {useReferralCredit ? (
                <>
                  <Gift className="w-4 h-4 mr-2" />
                  {responseQuoteMutation.isLoading ? 'Enviando...' : 'Enviar com Credito de Indicacao'}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {responseQuoteMutation.isLoading ? 'Enviando...' : 'Enviar Orcamento'}
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 text-center">
                Para continuar respondendo orcamentos, assine um plano:
              </p>
              <Button
                type="button"
                className="w-full bg-orange-500 hover:bg-orange-600"
                onClick={() => {
                  setSelectedPlan({
                    key: 'profissional_monthly',
                    name: 'Plano Profissional - Mensal',
                    price: 69.90
                  });
                  setCheckoutOpen(true);
                }}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Assinar Plano Profissional - R$ 69,90/mes
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSelectedPlan({
                    key: 'profissional_per_contact',
                    name: 'Pagamento por Orcamento',
                    price: 5.00
                  });
                  setCheckoutOpen(true);
                }}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Pagar por Este Orcamento - R$ 5,00
              </Button>
            </div>
          )}
        </form>

        {/* Checkout Modal */}
        {selectedPlan && (
          <MercadoPagoCheckout
            isOpen={checkoutOpen}
            onClose={() => {
              setCheckoutOpen(false);
              setSelectedPlan(null);
            }}
            planKey={selectedPlan.key}
            planName={selectedPlan.name}
            planPrice={selectedPlan.price}
            professionalId={professional?.id}
            onSuccess={() => {
              queryClient.invalidateQueries(['professional-quotes']);
              setNeedsPayment(false);
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
