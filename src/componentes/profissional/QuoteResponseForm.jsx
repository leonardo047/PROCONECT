import React, { useState, useEffect } from 'react';
import { QuoteRequest, QuoteResponse, Professional, Notification } from "@/lib/entities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Label } from "@/componentes/interface do usuário/label";
import { Textarea } from "@/componentes/interface do usuário/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/interface do usuário/card";
import { Badge } from "@/componentes/interface do usuário/badge";
import { DollarSign, Clock, Send, AlertCircle } from "lucide-react";
import { KirvanoCheckoutButton } from "@/componentes/pagamento/KirvanoCheckout";

export default function QuoteResponseForm({ quoteRequest, professional, onSuccess }) {
  const [needsPayment, setNeedsPayment] = useState(false);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    checkQuoteLimit();
  }, []);

  const checkQuoteLimit = async () => {
    // Check if professional has free quotes available
    const isFree = professional.plan_type === 'free' || professional.plan_type === 'pay_per_quote';

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
      if (onSuccess) onSuccess();
      alert('Orçamento enviado com sucesso!');
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (needsPayment) {
      alert('Você atingiu o limite de 3 orçamentos gratuitos. Assine um plano ou pague por este orçamento individual.');
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
      is_paid_response: needsPayment
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
              <p className="font-medium mb-1">Limite de orçamentos gratuitos atingido</p>
              <p>Você já respondeu 3 orçamentos este mês. Para continuar, assine um plano ou pague R$ 5,00 por este orçamento.</p>
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

          {!needsPayment ? (
            <Button
              type="submit"
              className="w-full bg-green-500 hover:bg-green-600"
              disabled={responseQuoteMutation.isLoading}
            >
              <Send className="w-4 h-4 mr-2" />
              {responseQuoteMutation.isLoading ? 'Enviando...' : 'Enviar Orçamento'}
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 text-center">
                Para continuar respondendo orcamentos, assine um plano:
              </p>
              <KirvanoCheckoutButton
                planKey="profissional_mensal"
                className="w-full bg-orange-500 hover:bg-orange-600"
                showPrice={true}
              >
                Assinar Plano Profissional
              </KirvanoCheckoutButton>
              <KirvanoCheckoutButton
                planKey="profissional_orcamento"
                className="w-full"
                variant="outline"
                showPrice={true}
              >
                Pagar por Este Orcamento
              </KirvanoCheckoutButton>
              <p className="text-xs text-slate-500 text-center">
                Apos o pagamento, volte aqui para enviar seu orcamento
              </p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
