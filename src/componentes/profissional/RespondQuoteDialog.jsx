import React, { useState, useEffect } from 'react';
import { QuoteRequest, QuoteResponse, Professional, Notification } from "@/lib/entities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/componentes/interface do usuário/dialog";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Label } from "@/componentes/interface do usuário/label";
import { Textarea } from "@/componentes/interface do usuário/textarea";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Alert, AlertDescription } from "@/componentes/interface do usuário/alert";
import { Loader2, Send, DollarSign, AlertCircle, Lock, CheckCircle } from "lucide-react";

export default function RespondQuoteDialog({ quoteRequest, professional, isOpen, onClose }) {
  const [formData, setFormData] = useState({
    message: '',
    estimated_price: '',
    estimated_duration: '',
    available_date: ''
  });
  const [needsPayment, setNeedsPayment] = useState(false);
  const [paymentAmount] = useState(10); // R$ 10 por orçamento
  const queryClient = useQueryClient();

  useEffect(() => {
    if (professional && isOpen) {
      checkPaymentRequired();
    }
  }, [professional, isOpen]);

  const checkPaymentRequired = () => {
    const isFree = professional.plan_type === 'free';
    const hasUsedFreeQuotes = professional.free_quote_responses_used >= 3;
    const isConstruction = ['pedreiro', 'pintor', 'eletricista_residencial', 'encanador',
                            'marceneiro', 'gesseiro_drywall', 'azulejista'].includes(quoteRequest.category);

    setNeedsPayment(isFree && hasUsedFreeQuotes && isConstruction);
  };

  const respondQuoteMutation = useMutation({
    mutationFn: async (data) => {
      const response = await QuoteResponse.create(data);

      // Atualizar contador de respostas do pedido
      await QuoteRequest.update(quoteRequest.id, {
        responses_count: (quoteRequest.responses_count || 0) + 1
      });

      // Atualizar estatísticas do profissional
      await Professional.update(professional.id, {
        total_quote_responses: (professional.total_quote_responses || 0) + 1,
        free_quote_responses_used: needsPayment
          ? professional.free_quote_responses_used
          : (professional.free_quote_responses_used || 0) + 1,
        last_active_date: new Date().toISOString()
      });

      // Notificar cliente
      await Notification.create({
        user_id: quoteRequest.client_id,
        type: 'quote_response',
        title: 'Nova Proposta Recebida',
        message: `${professional.name} respondeu seu pedido: ${quoteRequest.title}`,
        link: `/client-dashboard?tab=quotes`,
        priority: 'high'
      });

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['quote-requests']);
      queryClient.invalidateQueries(['quote-responses']);
      onClose();
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (needsPayment) {
      alert('Pagamento necessário. Integração com gateway em desenvolvimento.');
      return;
    }

    const responseData = {
      quote_request_id: quoteRequest.id,
      professional_id: professional.id,
      professional_name: professional.name,
      ...formData,
      estimated_price: formData.estimated_price ? parseFloat(formData.estimated_price) : null,
      payment_required: needsPayment,
      payment_amount: needsPayment ? paymentAmount : null,
      response_time_minutes: Math.round((Date.now() - new Date(quoteRequest.created_date).getTime()) / 60000),
      is_featured: professional.plan_type !== 'free'
    };

    await respondQuoteMutation.mutateAsync(responseData);
  };

  const freeQuotesLeft = 3 - (professional?.free_quote_responses_used || 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Responder Pedido de Orçamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quote Request Info */}
          <div className="bg-slate-50 p-4 rounded-lg">
            <h3 className="font-bold text-slate-900 mb-2">{quoteRequest.title}</h3>
            <p className="text-sm text-slate-600 mb-3">{quoteRequest.description}</p>
            <div className="flex gap-2 text-sm text-slate-600">
              <Badge variant="outline">{quoteRequest.city}, {quoteRequest.state}</Badge>
              {quoteRequest.budget_range && (
                <Badge variant="outline">{quoteRequest.budget_range.replace(/_/g, ' ')}</Badge>
              )}
            </div>
          </div>

          {/* Payment Warning */}
          {needsPayment ? (
            <Alert className="border-orange-500 bg-orange-50">
              <Lock className="w-4 h-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Resposta Paga</strong>
                <p className="text-sm mt-1">
                  Você utilizou suas 3 respostas gratuitas. Para responder este orçamento, é necessário o pagamento de <strong>R$ {paymentAmount},00</strong> ou assinar um plano mensal ilimitado.
                </p>
              </AlertDescription>
            </Alert>
          ) : professional?.plan_type === 'free' && (
            <Alert className="border-blue-500 bg-blue-50">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Respostas Gratuitas Restantes: {freeQuotesLeft}</strong>
                <p className="text-sm mt-1">
                  Após usar suas 3 respostas gratuitas, será necessário pagamento por resposta ou assinatura de plano.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Response Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Sua Proposta *</Label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Descreva como você pode ajudar, sua experiência com este tipo de serviço..."
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Preço Estimado (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.estimated_price}
                  onChange={(e) => setFormData({ ...formData, estimated_price: e.target.value })}
                  placeholder="1000.00"
                />
              </div>
              <div>
                <Label>Duração Estimada</Label>
                <Input
                  value={formData.estimated_duration}
                  onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value })}
                  placeholder="Ex: 2 dias, 1 semana"
                />
              </div>
            </div>

            <div>
              <Label>Data Disponível para Iniciar</Label>
              <Input
                type="date"
                value={formData.available_date}
                onChange={(e) => setFormData({ ...formData, available_date: e.target.value })}
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600"
                disabled={respondQuoteMutation.isPending || (needsPayment && true)}
              >
                {respondQuoteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : needsPayment ? (
                  <>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Pagar e Enviar (R$ {paymentAmount})
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Proposta
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
