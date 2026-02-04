import React, { useState, useEffect } from 'react';
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

  // Card state
  const [cardForm, setCardForm] = useState({
    cardNumber: '',
    cardholderName: '',
    expirationDate: '',
    securityCode: '',
    installments: 1
  });

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setError(null);
      setPixData(null);
      setCopied(false);
    }
  }, [isOpen]);

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
                'Authorization': `Bearer ${session?.access_token}`
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
          console.error('Error checking payment:', err);
        }
        setCheckingPayment(false);
      }, 5000); // Check every 5 seconds
    }

    return () => clearInterval(interval);
  }, [step, pixData, session, planKey, onSuccess, onClose]);

  const handlePixPayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
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
      console.error('PIX Error:', err);
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleCardPayment = async () => {
    setLoading(true);
    setError(null);

    try {
      // In production, you would use MercadoPago.js SDK to tokenize the card
      // For now, we'll show a placeholder message
      if (!MERCADOPAGO_PUBLIC_KEY) {
        setError('Pagamento com cartão em configuração. Use PIX por enquanto.');
        setLoading(false);
        return;
      }

      // This would be the real implementation with MercadoPago.js
      // const mp = new window.MercadoPago(MERCADOPAGO_PUBLIC_KEY);
      // const cardToken = await mp.createCardToken({...});

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            action: 'create_card_payment',
            plan_key: planKey,
            professional_id: professionalId,
            card_token: 'CARD_TOKEN_HERE', // Would come from MercadoPago.js
            installments: cardForm.installments
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'MP_NOT_CONFIGURED') {
          setError('Sistema de pagamento em configuração. Tente novamente em breve.');
        } else {
          setError(data.error || 'Erro ao processar cartão');
        }
        return;
      }

      if (data.status === 'approved') {
        setStep('success');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 2000);
      } else {
        setError('Pagamento não aprovado. Verifique os dados do cartão.');
      }
    } catch (err) {
      console.error('Card Error:', err);
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
        className="border-2 border-blue-300 hover:border-blue-500 cursor-pointer transition-all"
        onClick={() => setStep('card')}
      >
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-900">Cartão de Crédito</p>
            <p className="text-sm text-slate-500">Parcele em até 12x</p>
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

      <div className="space-y-4">
        <div>
          <Label>Número do Cartão</Label>
          <Input
            placeholder="0000 0000 0000 0000"
            value={cardForm.cardNumber}
            onChange={(e) => setCardForm({...cardForm, cardNumber: e.target.value})}
          />
        </div>

        <div>
          <Label>Nome no Cartão</Label>
          <Input
            placeholder="NOME COMO NO CARTÃO"
            value={cardForm.cardholderName}
            onChange={(e) => setCardForm({...cardForm, cardholderName: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Validade</Label>
            <Input
              placeholder="MM/AA"
              value={cardForm.expirationDate}
              onChange={(e) => setCardForm({...cardForm, expirationDate: e.target.value})}
            />
          </div>
          <div>
            <Label>CVV</Label>
            <Input
              placeholder="123"
              type="password"
              maxLength={4}
              value={cardForm.securityCode}
              onChange={(e) => setCardForm({...cardForm, securityCode: e.target.value})}
            />
          </div>
        </div>

        <div>
          <Label>Parcelas</Label>
          <select
            className="w-full border rounded-lg p-2"
            value={cardForm.installments}
            onChange={(e) => setCardForm({...cardForm, installments: parseInt(e.target.value)})}
          >
            <option value={1}>1x de R$ {planPrice?.toFixed(2)} (sem juros)</option>
            {planPrice >= 20 && (
              <>
                <option value={2}>2x de R$ {(planPrice / 2).toFixed(2)} (sem juros)</option>
                <option value={3}>3x de R$ {(planPrice / 3).toFixed(2)} (sem juros)</option>
              </>
            )}
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <Button
          className="w-full bg-blue-600 hover:bg-blue-700"
          onClick={handleCardPayment}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Pagar R$ {planPrice?.toFixed(2)}
            </>
          )}
        </Button>
      </div>
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
      <p className="text-slate-600">Seu acesso foi liberado com sucesso.</p>
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
