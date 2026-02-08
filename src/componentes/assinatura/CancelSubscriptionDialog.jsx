import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/componentes/interface do usuário/dialog";
import { Button } from "@/componentes/interface do usuário/button";
import { Textarea } from "@/componentes/interface do usuário/textarea";
import { Label } from "@/componentes/interface do usuário/label";
import { RadioGroup, RadioGroupItem } from "@/componentes/interface do usuário/radio-group";
import { AlertTriangle, Loader2, Calendar, CheckCircle } from "lucide-react";

const CANCELLATION_REASONS = [
  { value: 'too_expensive', label: 'Muito caro' },
  { value: 'not_using', label: 'Nao estou usando o suficiente' },
  { value: 'found_alternative', label: 'Encontrei outra alternativa' },
  { value: 'technical_issues', label: 'Problemas técnicos' },
  { value: 'not_satisfied', label: 'Nao estou satisfeito com o serviço' },
  { value: 'temporary', label: 'Pausa temporaria' },
  { value: 'other', label: 'Outro motivo' },
];

export default function CancelSubscriptionDialog({
  isOpen,
  onClose,
  onConfirm,
  subscriptionType = 'client', // 'client' ou 'professional'
  planName = 'Plano Atual',
  expiresAt = null,
  isLoading = false,
}) {
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const handleClose = () => {
    setStep(1);
    setReason('');
    setFeedback('');
    setConfirmed(false);
    onClose();
  };

  const handleConfirm = async () => {
    try {
      await onConfirm({ reason, feedback });
      setConfirmed(true);
      setStep(3);
    } catch (error) {
      alert('Erro ao cancelar assinatura. Tente novamente.');
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Cancelar Assinatura
              </DialogTitle>
              <DialogDescription>
                Tem certeza que deseja cancelar sua assinatura?
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold text-amber-800 mb-2">O que acontece ao cancelar:</h4>
                <ul className="text-sm text-amber-700 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>Você manterá acessó até <strong>{formatDate(expiresAt)}</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>Nao havera cobrancas futuras</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-600 flex-shrink-0" />
                    <span>Apos a data de expiração, você perderá os benefícios do plano</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-slate-700">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    <strong>Plano:</strong> {planName}
                  </span>
                </div>
                {expiresAt && (
                  <div className="flex items-center gap-2 text-slate-700 mt-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      <strong>Acessó ate:</strong> {formatDate(expiresAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Manter Assinatura
              </Button>
              <Button
                variant="destructive"
                onClick={() => setStep(2)}
              >
                Continuar Cancelamento
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Motivo do Cancelamento</DialogTitle>
              <DialogDescription>
                Nos ajude a melhorar! Por que você está cancelando?
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <RadioGroup value={reason} onValueChange={setReason}>
                {CANCELLATION_REASONS.map((r) => (
                  <div key={r.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={r.value} id={r.value} />
                    <Label htmlFor={r.value} className="cursor-pointer">
                      {r.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              <div>
                <Label htmlFor="feedback">Comentarios adicionais (opcional)</Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Conte-nos mais sobre sua experiência..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={!reason || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  'Confirmar Cancelamento'
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                Assinatura Cancelada
              </DialogTitle>
            </DialogHeader>

            <div className="py-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-slate-700 mb-4">
                Sua assinatura foi cancelada com sucesso.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <p className="text-sm text-blue-800">
                  <strong>Lembre-se:</strong> Você ainda tem acessó aos benefícios do seu plano ate{' '}
                  <strong>{formatDate(expiresAt)}</strong>.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Entendido
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
