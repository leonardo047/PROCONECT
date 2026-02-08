import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Label } from "@/componentes/interface do usuário/label";
import { Card, CardContent } from "@/componentes/interface do usuário/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/interface do usuário/dialog";
import {
  CreditCard,
  QrCode,
  Loader2,
  Check,
  Copy,
  AlertCircle,
  ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const MERCADOPAGO_PUBLIC_KEY = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;

/**
 * NOTA DE SEGURANÇA:
 * - A implementação de pagamento por cartão requer a SDK do MercadoPago.js para tokenização segura
 * - NUNCA armazenamos dados de cartão (número, CVV) no state do React ou enviamos ao nossó backend
 * - A tokenização deve ser feita diretamente pelo SDK do MercadoPago no navegador
 * - Até a implementação completa, a opção de cartão está desabilitada
 * - Apenas PIX está disponível, que é mais seguro por não manipular dados de cartão
 */
const CARD_PAYMENT_ENABLED = false; // Desabilitado até implementação segura com MercadoPago.js SDK

export default function MercadoPagoCheckout({
  isOpen,
  onClose,
  planKey,
  planName,
  planPrice,
  professionalId = null,
  onSuccess
}) {
  const { session } = useAuth();
  const [step, setStep] = useState('select'); // select, pix, card, processing, success, error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // PIX state
  const [pixData, setPixData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);

  // NOTA DE SEGURANÇA: Não armazenamos mais dados de cartão no state
  // A tokenização deve ser feita diretamente pelo SDK do MercadoPago
  // Mantemos apenas installments que não e dado sensível
  const [installments, setInstallments] = useState(1);

  // Função para limpar todos os dados sensíveis
  const clearSensitiveData = useCallback(() => {
    setPixData(null);
    setCopied(false);
    setInstallments(1);
    setError(null);
  }, []);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      clearSensitiveData();
    } else {
      // Limpar dados sensíveis quando modal fecha por segurança
      clearSensitiveData();
    }
  }, [isOpen, clearSensitiveData]);

  // Poll for PIX payment status
  useEffect(() => {
    let interval;
    if (step === 'pix' && pixData?.payment_id) {
      interval = setInterval(async () => {
        setCheckingPayment(true);
        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago-checkout`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`,
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
              },
              body: JSON.stringify({
                action: 'check_payment',
                payment_id: pixData.payment_id,
                plan_key: planKey
              })
            }
          );

          const data = await response.json();

          if (data.status === 'approved') {
            clearInterval(interval);
            setStep('success');
            setTimeout(() => {
              onSuccess?.();
              onClose();
            }, 2000);
          }
        } catch (err) {
          // Ignorar erro
        }
        setCheckingPayment(false);
      }, 5000); // Check every 5 seconds
    }

    return () => clearInterval(interval);
  }, [step, pixData, session, planKey, onSuccess, onClose]);

  const handlePixPayment = async () => {
    setLoading(true);
    setError(null);

    if (!session?.access_token) {
      setError('Sessão expirada. Faça login novamente.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            action: 'create_pix',
            plan_key: planKey,
            professional_id: professionalId
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'MP_NOT_CONFIGURED') {
          setError('Sistema de pagamento em configuração. Tente novamente em breve.');
        } else {
          setError(data.error || 'Erro ao gerar PIX');
        }
        return;
      }

      setPixData(data);
      setStep('pix');
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  /**
   * IMPLEMENTAÇÃO SEGURA DE PAGAMENTO COM CARTÃO
   *
   * Para implementar pagamento com cartão de forma segura:
   * 1. Carregar o SDK do MercadoPago.js: https://sdk.mercadopago.com/js/v2
   * 2. Inicializar com a public key
   * 3. Usar o método createCardToken() do SDK para tokenizar os dados do cartão
   * 4. Enviar APENAS o token ao backend (nunca os dados do cartão)
   * 5. O backend usa o token para criar o pagamento via API do MercadoPago
   *
   * Exemplo de implementação:
   *
   * const mp = new MercadoPago(MERCADOPAGO_PUBLIC_KEY);
   * const cardToken = await mp.createCardToken({
   *   cardNumber: document.getElementById('cardNumber').value, // Pegar direto do DOM
   *   cardholderName: document.getElementById('cardholderName').value,
   *   cardExpirationMonth: '12',
   *   cardExpirationYear: '2025',
   *   securityCode: document.getElementById('cvv').value,
   *   identificationType: 'CPF',
   *   identificationNumber: '12345678909'
   * });
   *
   * // Agora sim, enviar apenas o token
   * await fetch('/api/payment', {
   *   body: JSON.stringify({ card_token: cardToken.id })
   * });
   */
  const handleCardPayment = async () => {
    // Pagamento com cartão desabilitado até implementação segura
    if (!CARD_PAYMENT_ENABLED) {
      setError('Pagamento com cartão ainda não disponível. Use PIX.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!MERCADOPAGO_PUBLIC_KEY) {
        setError('Pagamento com cartão em configuração. Use PIX por enquanto.');
        setLoading(false);
        return;
      }

      // TODO: Implementar tokenização segura com MercadoPago.js SDK
      // Por segurança, não processamos dados de cartão até ter implementação completa
      setError('Implementação de cartão em desenvolvimento. Use PIX.');

    } catch (err) {
      setError('Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  };

  const copyPixCode = () => {
    if (pixData?.qr_code) {
      navigator.clipboard.writeText(pixData.qr_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const renderSelectMethod = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <p className="text-3xl font-bold text-orange-600">R$ {planPrice?.toFixed(2)}</p>
        <p className="text-slate-600">{planName}</p>
      </div>

      <Card
        className="border-2 border-green-300 hover:border-green-500 cursor-pointer transition-all"
        onClick={handlePixPayment}
      >
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <QrCode className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-900">Pagar com PIX</p>
            <p className="text-sm text-slate-500">Aprovação instantânea • Taxa: 0,99%</p>
          </div>
          {loading && <Loader2 className="w-5 h-5 animate-spin text-green-600" />}
        </CardContent>
      </Card>

      <Card
        className={`border-2 transition-all ${
          CARD_PAYMENT_ENABLED
            ? 'border-blue-300 hover:border-blue-500 cursor-pointer'
            : 'border-slate-200 opacity-60 cursor-not-allowed'
        }`}
        onClick={() => CARD_PAYMENT_ENABLED && setStep('card')}
      >
        <CardContent className="p-4 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            CARD_PAYMENT_ENABLED ? 'bg-blue-100' : 'bg-slate-100'
          }`}>
            <CreditCard className={`w-6 h-6 ${
              CARD_PAYMENT_ENABLED ? 'text-blue-600' : 'text-slate-400'
            }`} />
          </div>
          <div className="flex-1">
            <p className={`font-semibold ${
              CARD_PAYMENT_ENABLED ? 'text-slate-900' : 'text-slate-500'
            }`}>Cartão de Crédito</p>
            <p className="text-sm text-slate-500">
              {CARD_PAYMENT_ENABLED
                ? 'Parcele em até 12x'
                : 'Em breve disponível'}
            </p>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  );

  const renderPixPayment = () => (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setStep('select')}
        className="mb-2"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium mb-4">
          <QrCode className="w-4 h-4" />
          Pagamento PIX
        </div>

        <p className="text-3xl font-bold text-slate-900 mb-1">R$ {planPrice?.toFixed(2)}</p>
        <p className="text-slate-600 mb-6">{planName}</p>
      </div>

      {pixData?.qr_code_base64 && (
        <div className="flex justify-center mb-4">
          <div className="bg-white p-4 rounded-lg border-2 border-slate-200">
            <img
              src={`data:image/png;base64,${pixData.qr_code_base64}`}
              alt="QR Code PIX"
              className="w-48 h-48"
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Código PIX (Copia e Cola)</Label>
        <div className="flex gap-2">
          <Input
            value={pixData?.qr_code || ''}
            readOnly
            className="text-xs font-mono"
          />
          <Button onClick={copyPixCode} variant="outline" size="icon">
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
        {copied && <p className="text-sm text-green-600">Código copiado!</p>}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          {checkingPayment && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
          <p className="text-sm font-medium text-blue-800">
            Aguardando pagamento...
          </p>
        </div>
        <p className="text-xs text-blue-600">
          O pagamento será confirmado automaticamente
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 mt-4">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  );

  const renderCardPayment = () => (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setStep('select')}
        className="mb-2"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      <div className="text-center mb-4">
        <p className="text-2xl font-bold text-slate-900">R$ {planPrice?.toFixed(2)}</p>
        <p className="text-slate-600">{planName}</p>
      </div>

      {/* Pagamento com cartão em desenvolvimento */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="font-semibold text-slate-900 mb-2">
          Pagamento com Cartão em Desenvolvimento
        </h3>
        <p className="text-sm text-slate-600 mb-4">
          Estamos implementando pagamento seguro com cartão de crédito.
          Por enquanto, use o PIX que é instantâneo e seguro.
        </p>
        <Button
          className="w-full bg-green-600 hover:bg-green-700"
          onClick={() => setStep('select')}
        >
          <QrCode className="w-4 h-4 mr-2" />
          Voltar e Pagar com PIX
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  );

  const renderSuccess = () => (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="text-center py-8"
    >
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Check className="w-10 h-10 text-green-600" />
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-2">Pagamento Confirmado!</h3>
      <p className="text-slate-600">Seu acessó foi liberado com sucesso.</p>
    </motion.div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'success' ? (
              <Check className="w-5 h-5 text-green-600" />
            ) : (
              <CreditCard className="w-5 h-5 text-orange-500" />
            )}
            {step === 'success' ? 'Pagamento Confirmado' : 'Finalizar Pagamento'}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 'select' && renderSelectMethod()}
            {step === 'pix' && renderPixPayment()}
            {step === 'card' && renderCardPayment()}
            {step === 'success' && renderSuccess()}
          </motion.div>
        </AnimatePresence>

        {step !== 'success' && (
          <p className="text-center text-xs text-slate-500 mt-4">
            Pagamento seguro processado por Mercado Pago
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
