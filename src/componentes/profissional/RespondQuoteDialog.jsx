import React, { useState, useEffect } from 'react';
import { QuoteRequest, QuoteResponse, Notification, ProfessionalService, CreditsService } from "@/lib/entities";
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
  Image, AlertCircle, Infinity, Coins, ShoppingCart
} from "lucide-react";
import { showToast } from "@/utils/showToast";

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
  const [hasUnlimitedCredits, setHasUnlimitedCredits] = useState(false);
  const [creditsBalance, setCreditsBalance] = useState(0);
  const [unlimitedExpiresAt, setUnlimitedExpiresAt] = useState(null);
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
      // Usar o novo CreditsService para verificar créditos
      const creditStatus = await CreditsService.getStatus(professional.id);

      setCanRespond(creditStatus.can_respond);
      setHasUnlimitedCredits(creditStatus.has_unlimited || false);
      setCreditsBalance(creditStatus.credits_balance || 0);
      setUnlimitedExpiresAt(creditStatus.unlimited_expires_at || null);
      setReferralCredits(creditStatus.referral_credits || 0);
      setStatusMessage(creditStatus.reason || '');

      // Calcular quotesLeft
      if (creditStatus.has_unlimited) {
        setQuotesLeft(999999); // Infinito
      } else {
        setQuotesLeft((creditStatus.credits_balance || 0) + (creditStatus.referral_credits || 0));
      }

      // Precisa pagar se não pode responder
      setNeedsPayment(!creditStatus.can_respond);

    } catch (error) {
      // Fallback: usar dados do professional diretamente
      const hasUnlimited = professional.unlimited_credits &&
        (!professional.unlimited_credits_expires_at ||
         new Date(professional.unlimited_credits_expires_at) > new Date());

      setHasUnlimitedCredits(hasUnlimited);
      setCreditsBalance(professional.credits_balance || 0);
      setReferralCredits(professional.referral_credits || 0);

      if (hasUnlimited) {
        setCanRespond(true);
        setNeedsPayment(false);
        setQuotesLeft(999999);
      } else {
        const totalCredits = (professional.credits_balance || 0) + (professional.referral_credits || 0);
        setCanRespond(totalCredits > 0);
        setNeedsPayment(totalCredits <= 0);
        setQuotesLeft(totalCredits);
      }
    }
    setLoading(false);
  };

  const respondQuoteMutation = useMutation({
    mutationFn: async (data) => {
      // Primeiro, criar a resposta
      const response = await QuoteResponse.create(data);

      // Usar o crédito (se não tiver infinito, vai debitar)
      try {
        await CreditsService.useCredit(professional.id, response.id);
      } catch {
        // Se falhar ao usar crédito, não é crítico pois a função SQL já valida
      }

      // Tentar atualizar contador (pode falhar por RLS, não e critico)
      try {
        await QuoteRequest.update(quoteRequest.id, {
          responses_count: (quoteRequest.responses_count || 0) + 1
        });
      } catch (err) {
        // Ignorar erro
      }

      // Tentar criar notificacao (pode falhar, não e critico)
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
      queryClient.invalidateQueries(['credit-status']);
      onClose();
    },
    onError: (error) => {
      if (error.message?.includes('policy') || error.message?.includes('credit')) {
        showToast.error('Sem créditos', 'Você não tem créditos suficientes para responder este orçamento.');
      } else {
        showToast.error('Erro ao enviar proposta', 'Tente novamente.');
      }
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (needsPayment && !useReferralCredit) {
      showToast.warning('Créditos necessários', 'Você precisa de créditos ou pagamento para responder este orçamento.');
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
                  {quoteRequest.status === 'open' ? 'Aberto' : 'Recebendo Orçamentos'}
                </Badge>
              </div>
            </div>

            {/* Descrição Completa */}
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-slate-600" />
                <span className="font-semibold text-slate-700">Descrição do Serviço</span>
              </div>
              <p className="text-slate-600 whitespace-pre-wrap">
                {quoteRequest.description || 'Sem descrição detalhada.'}
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

              {/* Orçamento Estimado */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-slate-700">Orçamento do Cliente</span>
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
              <p className="text-slate-600">{quoteRequest.client_name || 'Nome não informado'}</p>
            </div>

            {/* Fotos (se houver) */}
            {quoteRequest.photos && quoteRequest.photos.length > 0 && (
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Image className="w-4 h-4 text-slate-600" />
                  <span className="font-semibold text-slate-700">Fotos do Serviço</span>
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

            {/* Status de créditos infinitos */}
            {hasUnlimitedCredits && (
              <Alert className="border-purple-500 bg-purple-50">
                <Infinity className="w-4 h-4 text-purple-600" />
                <AlertDescription className="text-purple-800">
                  <strong>Créditos Infinitos Ativos!</strong>
                  <p className="text-sm mt-1">
                    Responda quantas cotações quiser.
                    {unlimitedExpiresAt && (
                      <span className="ml-1">
                        Valido até {new Date(unlimitedExpiresAt).toLocaleDateString('pt-BR')}.
                      </span>
                    )}
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Status de créditos avulsos */}
            {!hasUnlimitedCredits && !needsPayment && quotesLeft > 0 && (
              <Alert className="border-green-500 bg-green-50">
                <Coins className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Créditos Disponiveis: {creditsBalance + referralCredits}</strong>
                  {creditsBalance > 0 && referralCredits > 0 && (
                    <p className="text-sm mt-1">
                      {creditsBalance} avulso{creditsBalance !== 1 ? 's' : ''} + {referralCredits} de indicação
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Avisó de sem créditos */}
            {needsPayment && (
              <Alert className="border-orange-500 bg-orange-50">
                <ShoppingCart className="w-4 h-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <strong>Sem Créditos Disponiveis</strong>
                  <p className="text-sm mt-1">
                    Você precisa comprar créditos para responder cotações.
                    Acesse seu painel para comprar créditos ou assinar um plano.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Opcao de crédito de indicação */}
            {needsPayment && referralCredits > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Gift className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-purple-900">Usar Crédito de Indicação</p>
                      <p className="text-sm text-purple-700">
                        Você tem {referralCredits} crédito{referralCredits > 1 ? 's' : ''}
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
                  className={`${
                    hasUnlimitedCredits
                      ? 'bg-purple-500 hover:bg-purple-600'
                      : useReferralCredit
                        ? 'bg-purple-500 hover:bg-purple-600'
                        : 'bg-green-500 hover:bg-green-600'
                  }`}
                  disabled={respondQuoteMutation.isPending || needsPayment}
                >
                  {respondQuoteMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : needsPayment ? (
                    <>
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Comprar Créditos
                    </>
                  ) : hasUnlimitedCredits ? (
                    <>
                      <Infinity className="w-4 h-4 mr-2" />
                      Enviar (Créditos Infinitos)
                    </>
                  ) : useReferralCredit ? (
                    <>
                      <Gift className="w-4 h-4 mr-2" />
                      Enviar com Crédito de Indicação
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
