import React, { useState, useEffect } from 'react';
import { QuoteRequest, QuoteResponse, Notification, ProfessionalService } from "@/lib/entities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/componentes/interface do usuário/dialog";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Label } from "@/componentes/interface do usuário/label";
import { Textarea } from "@/componentes/interface do usuário/textarea";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Alert, AlertDescription } from "@/componentes/interface do usuário/alert";
import {
  Loader2, Send, DollarSign, Lock, CheckCircle, Gift,
  MapPin, Clock, Calendar, User, FileText, ArrowLeft,
  Image, AlertCircle
} from "lucide-react";

export default function RespondQuoteDialog({ quoteRequest, professional, isOpen, onClose }) {
  const [step, setStep] = useState('details'); // 'details' ou 'form'
  const [formData, setFormData] = useState({
    message: '',
    estimated_price: '',
    estimated_time: '',
    warranty: '',
    includes_materials: false
  });
  const [canRespond, setCanRespond] = useState(false);
  const [needsPayment, setNeedsPayment] = useState(false);
  const [quotesLeft, setQuotesLeft] = useState(0);
  const [referralCredits, setReferralCredits] = useState(0);
  const [useReferralCredit, setUseReferralCredit] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [paymentAmount] = useState(5);
  const queryClient = useQueryClient();

  // Reset step when dialog opens
  useEffect(() => {
    if (isOpen) {
      setStep('details');
      setFormData({
        message: '',
        estimated_price: '',
        estimated_time: '',
        warranty: '',
        includes_materials: false
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (professional && isOpen) {
      checkPaymentRequired();
    }
  }, [professional, isOpen]);

  const checkPaymentRequired = async () => {
    setLoading(true);
    try {
      const result = await ProfessionalService.canRespondQuote(professional.id);
      setCanRespond(result.can_respond);
      setQuotesLeft(result.quotes_left || 0);
      setReferralCredits(result.referral_credits || 0);
      setStatusMessage(result.reason || '');

      if (!result.can_respond) {
        setNeedsPayment(true);
      } else if (result.plan_type === 'free' && result.quotes_left === 0) {
        setNeedsPayment(result.referral_credits <= 0);
      } else {
        setNeedsPayment(false);
      }
    } catch (error) {
      const isFree = professional.plan_type === 'free';
      const freeUsed = professional.free_quotes_used || 0;
      setQuotesLeft(Math.max(0, 3 - freeUsed));
      setReferralCredits(professional.referral_credits || 0);
      setNeedsPayment(isFree && freeUsed >= 3 && (professional.referral_credits || 0) <= 0);
      setCanRespond(!needsPayment);
    }
    setLoading(false);
  };

  const respondQuoteMutation = useMutation({
    mutationFn: async (data) => {
      const response = await QuoteResponse.create(data);

      // Tentar atualizar contador (pode falhar por RLS, nao e critico)
      try {
        await QuoteRequest.update(quoteRequest.id, {
          responses_count: (quoteRequest.responses_count || 0) + 1
        });
      } catch (err) {
        // Ignorar erro
      }

      // Tentar criar notificacao (pode falhar, nao e critico)
      try {
        await Notification.create({
          user_id: quoteRequest.client_id,
          type: 'quote_response',
          title: 'Nova Proposta Recebida',
          message: `${professional.name} respondeu seu pedido: ${quoteRequest.title}`,
          link: `/client-dashboard?tab=quotes`,
          priority: 'high'
        });
      } catch (err) {
        // Ignorar erro de notificação
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['quote-requests']);
      queryClient.invalidateQueries(['quote-responses']);
      queryClient.invalidateQueries(['my-professional']);
      queryClient.invalidateQueries(['marketplace-quotes']);
      onClose();
    },
    onError: (error) => {
      if (error.message?.includes('policy') || error.message?.includes('credit')) {
        alert('Voce nao tem creditos suficientes para responder este orcamento.');
      } else {
        alert('Erro ao enviar proposta. Tente novamente.');
      }
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (needsPayment && !useReferralCredit) {
      alert('Voce precisa de creditos ou pagamento para responder este orcamento.');
      return;
    }

    const responseData = {
      quote_request_id: quoteRequest.id,
      professional_id: professional.id,
      professional_name: professional.name,
      message: formData.message,
      estimated_price: formData.estimated_price ? parseFloat(formData.estimated_price) : null,
      estimated_time: formData.estimated_time || null,
      warranty: formData.warranty || null,
      includes_materials: formData.includes_materials,
      status: 'pending'
    };

    await respondQuoteMutation.mutateAsync(responseData);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Nao informada';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const urgencyLabels = {
    urgente: { label: 'Urgente', color: 'bg-red-100 text-red-700 border-red-200' },
    esta_semana: { label: 'Esta semana', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    este_mes: { label: 'Este mes', color: 'bg-green-100 text-green-700 border-green-200' },
    flexivel: { label: 'Flexivel', color: 'bg-slate-100 text-slate-700 border-slate-200' }
  };

  const budgetLabels = {
    ate_500: 'Ate R$ 500',
    '500_1000': 'R$ 500 - R$ 1.000',
    '1000_3000': 'R$ 1.000 - R$ 3.000',
    '3000_5000': 'R$ 3.000 - R$ 5.000',
    acima_5000: 'Acima de R$ 5.000',
    a_negociar: 'A negociar'
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'details' ? 'Detalhes da Oportunidade' : 'Enviar Proposta'}
          </DialogTitle>
          <DialogDescription>
            {step === 'details'
              ? 'Veja todos os detalhes antes de enviar sua proposta'
              : 'Preencha os dados da sua proposta para o cliente'
            }
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-green-500 mr-2" />
            <span>Carregando...</span>
          </div>
        ) : step === 'details' ? (
          /* ========== ETAPA 1: DETALHES DA OPORTUNIDADE ========== */
          <div className="space-y-4">
            {/* Titulo e Status */}
            <div className="border-b pb-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-bold text-slate-900">{quoteRequest.title}</h2>
                <Badge className="bg-blue-500 text-white shrink-0">
                  {quoteRequest.status === 'open' ? 'Aberto' : 'Recebendo Orcamentos'}
                </Badge>
              </div>
            </div>

            {/* Descricao Completa */}
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-slate-600" />
                <span className="font-semibold text-slate-700">Descricao do Servico</span>
              </div>
              <p className="text-slate-600 whitespace-pre-wrap">
                {quoteRequest.description || 'Sem descricao detalhada.'}
              </p>
            </div>

            {/* Grid de Informacoes */}
            <div className="grid grid-cols-2 gap-4">
              {/* Localizacao */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-slate-700">Localizacao</span>
                </div>
                <p className="text-slate-600">{quoteRequest.city}, {quoteRequest.state}</p>
                {quoteRequest.address && (
                  <p className="text-sm text-slate-500 mt-1">{quoteRequest.address}</p>
                )}
              </div>

              {/* Data de Criacao */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-slate-700">Data do Pedido</span>
                </div>
                <p className="text-slate-600">{formatDate(quoteRequest.created_date || quoteRequest.created_at)}</p>
              </div>

              {/* Urgencia */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span className="font-semibold text-slate-700">Urgencia</span>
                </div>
                {quoteRequest.urgency ? (
                  <Badge variant="outline" className={urgencyLabels[quoteRequest.urgency]?.color}>
                    {urgencyLabels[quoteRequest.urgency]?.label || quoteRequest.urgency}
                  </Badge>
                ) : (
                  <p className="text-slate-500">Nao especificada</p>
                )}
              </div>

              {/* Orcamento Estimado */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-slate-700">Orcamento do Cliente</span>
                </div>
                <p className="text-slate-600">
                  {budgetLabels[quoteRequest.budget_range] || quoteRequest.budget_range || 'A negociar'}
                </p>
              </div>
            </div>

            {/* Cliente */}
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-purple-600" />
                <span className="font-semibold text-slate-700">Cliente</span>
              </div>
              <p className="text-slate-600">{quoteRequest.client_name || 'Nome nao informado'}</p>
            </div>

            {/* Fotos (se houver) */}
            {quoteRequest.photos && quoteRequest.photos.length > 0 && (
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Image className="w-4 h-4 text-slate-600" />
                  <span className="font-semibold text-slate-700">Fotos do Servico</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {quoteRequest.photos.map((photo, index) => (
                    <img
                      key={index}
                      src={photo}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Estatisticas */}
            <div className="flex items-center gap-4 text-sm text-slate-500 pt-2 border-t">
              <span>{quoteRequest.responses_count || 0} proposta(s) recebida(s)</span>
              <span>{quoteRequest.views_count || 0} visualizacoes</span>
            </div>

            {/* Botao para ir para o formulario */}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Fechar
              </Button>
              <Button
                onClick={() => setStep('form')}
                className="flex-1 bg-green-500 hover:bg-green-600"
              >
                <Send className="w-4 h-4 mr-2" />
                Enviar Minha Proposta
              </Button>
            </div>
          </div>
        ) : (
          /* ========== ETAPA 2: FORMULARIO DE RESPOSTA ========== */
          <div className="space-y-4">
            {/* Botao Voltar */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep('details')}
              className="text-slate-600 hover:text-slate-900 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar aos detalhes
            </Button>

            {/* Resumo do pedido */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="font-medium text-green-800">{quoteRequest.title}</p>
              <p className="text-sm text-green-600">{quoteRequest.city}, {quoteRequest.state}</p>
            </div>

            {/* Status de creditos */}
            {!needsPayment && quotesLeft > 0 && quotesLeft < 999999 && (
              <Alert className="border-blue-500 bg-blue-50">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Creditos Disponiveis: {quotesLeft}</strong>
                  {statusMessage && <p className="text-sm mt-1">{statusMessage}</p>}
                </AlertDescription>
              </Alert>
            )}

            {/* Aviso de pagamento */}
            {needsPayment && (
              <Alert className="border-orange-500 bg-orange-50">
                <Lock className="w-4 h-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <strong>Resposta Paga</strong>
                  <p className="text-sm mt-1">
                    {statusMessage || `Voce utilizou suas respostas gratuitas. Pagamento de R$ ${paymentAmount},00 necessario.`}
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Opcao de credito de indicacao */}
            {needsPayment && referralCredits > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Gift className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-purple-900">Usar Credito de Indicacao</p>
                      <p className="text-sm text-purple-700">
                        Voce tem {referralCredits} credito{referralCredits > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useReferralCredit}
                      onChange={(e) => setUseReferralCredit(e.target.checked)}
                      className="w-5 h-5 text-purple-600 rounded"
                    />
                    <span className="text-sm font-medium text-purple-800">Usar</span>
                  </label>
                </div>
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Sua Proposta *</Label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Descreva como voce pode ajudar, sua experiencia com este tipo de servico..."
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Preco Estimado (R$)</Label>
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
                  <Label>Prazo Estimado</Label>
                  <Input
                    value={formData.estimated_time}
                    onChange={(e) => setFormData({ ...formData, estimated_time: e.target.value })}
                    placeholder="Ex: 2 dias, 1 semana"
                  />
                </div>
              </div>

              <div>
                <Label>Garantia Oferecida</Label>
                <Input
                  value={formData.warranty}
                  onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
                  placeholder="Ex: 90 dias de garantia"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includes_materials"
                  checked={formData.includes_materials}
                  onChange={(e) => setFormData({ ...formData, includes_materials: e.target.checked })}
                  className="w-4 h-4 text-green-600 rounded"
                />
                <Label htmlFor="includes_materials" className="text-sm cursor-pointer">
                  O valor inclui materiais
                </Label>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setStep('details')}>
                  Voltar
                </Button>
                <Button
                  type="submit"
                  className={`${useReferralCredit ? 'bg-purple-500 hover:bg-purple-600' : 'bg-green-500 hover:bg-green-600'}`}
                  disabled={respondQuoteMutation.isPending || (needsPayment && !useReferralCredit)}
                >
                  {respondQuoteMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : useReferralCredit ? (
                    <>
                      <Gift className="w-4 h-4 mr-2" />
                      Enviar com Credito
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
        )}
      </DialogContent>
    </Dialog>
  );
}
