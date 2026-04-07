import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Label } from "@/componentes/interface do usuário/label";
import { Card, CardContent } from "@/componentes/interface do usuário/card";
import { Badge } from "@/componentes/interface do usuário/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/interface do usuário/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/componentes/interface do usuário/select";
import {
  CreditCard,
  QrCode,
  Loader2,
  Check,
  Copy,
  AlertCircle,
  ArrowLeft,
  Lock,
  Tag,
  X,
  CheckCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DiscountCouponService } from "@/lib/entities";

const MERCADOPAGO_PUBLIC_KEY = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;

// Habilitar pagamento com cartão
const CARD_PAYMENT_ENABLED = true;

export default function MercadoPagoCheckout({
  isOpen,
  onClose,
  planKey,
  planName,
  planPrice,
  professionalId = null,
  onSuccess
}) {
  const { session, user } = useAuth();
  const [step, setStep] = useState('select'); // select, pix, card, processing, success, error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // PIX state
  const [pixData, setPixData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);

  // Card state
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expirationMonth, setExpirationMonth] = useState('');
  const [expirationYear, setExpirationYear] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [identificationType, setIdentificationType] = useState('CPF');
  const [identificationNumber, setIdentificationNumber] = useState('');
  const [installments, setInstallments] = useState('1');
  const [cardBrand, setCardBrand] = useState(null);
  const [installmentOptions, setInstallmentOptions] = useState([]);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState(null);

  // MercadoPago SDK reference
  const mpRef = useRef(null);
  const sdkLoadedRef = useRef(false);

  // Carregar SDK do MercadoPago
  useEffect(() => {
    if (sdkLoadedRef.current || !CARD_PAYMENT_ENABLED) return;

    const loadMercadoPagoSDK = () => {
      return new Promise((resolve, reject) => {
        if (window.MercadoPago) {
          resolve(window.MercadoPago);
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://sdk.mercadopago.com/js/v2';
        script.async = true;
        script.onload = () => {
          if (window.MercadoPago) {
            resolve(window.MercadoPago);
          } else {
            reject(new Error('MercadoPago SDK não carregou corretamente'));
          }
        };
        script.onerror = () => reject(new Error('Erro ao carregar SDK do MercadoPago'));
        document.body.appendChild(script);
      });
    };

    loadMercadoPagoSDK()
      .then((MercadoPago) => {
        if (MERCADOPAGO_PUBLIC_KEY) {
          mpRef.current = new MercadoPago(MERCADOPAGO_PUBLIC_KEY);
          sdkLoadedRef.current = true;
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar MercadoPago SDK:', err);
      });
  }, []);

  // Função para limpar todos os dados sensíveis
  const clearSensitiveData = useCallback(() => {
    setPixData(null);
    setCopied(false);
    setCardNumber('');
    setCardholderName('');
    setExpirationMonth('');
    setExpirationYear('');
    setSecurityCode('');
    setIdentificationNumber('');
    setInstallments('1');
    setCardBrand(null);
    setInstallmentOptions([]);
    setError(null);
    setCouponCode('');
    setAppliedCoupon(null);
    setCouponError(null);
  }, []);

  // Calcular preço final com desconto
  const originalPrice = planPrice || 0;
  const discountAmount = appliedCoupon?.discount_amount || 0;
  const finalPrice = appliedCoupon?.final_price ?? originalPrice;

  // Aplicar cupom
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Digite um código de cupom');
      return;
    }

    setCouponLoading(true);
    setCouponError(null);

    try {
      const result = await DiscountCouponService.validate(
        couponCode.trim(),
        planKey,
        originalPrice
      );

      if (result.valid) {
        setAppliedCoupon(result);
        setCouponError(null);
      } else {
        setCouponError(result.error || 'Cupom inválido');
        setAppliedCoupon(null);
      }
    } catch (err) {
      setCouponError(err.message || 'Erro ao validar cupom');
      setAppliedCoupon(null);
    }

    setCouponLoading(false);
  };

  // Remover cupom
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      clearSensitiveData();
      // Preencher nome do usuário se disponível
      if (user?.full_name) {
        setCardholderName(user.full_name.toUpperCase());
      }
    } else {
      clearSensitiveData();
    }
  }, [isOpen, clearSensitiveData, user]);

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
      }, 5000);
    }

    return () => clearInterval(interval);
  }, [step, pixData, session, planKey, onSuccess, onClose]);

  // Formatar número do cartão
  const formatCardNumber = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    const groups = digits.match(/.{1,4}/g) || [];
    return groups.join(' ');
  };

  // Identificar bandeira do cartão
  const identifyCardBrand = (number) => {
    const digits = number.replace(/\D/g, '');
    if (digits.startsWith('4')) return 'visa';
    if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return 'mastercard';
    if (/^3[47]/.test(digits)) return 'amex';
    if (/^6(?:011|5)/.test(digits)) return 'discover';
    if (/^(?:2131|1800|35)/.test(digits)) return 'jcb';
    if (/^3(?:0[0-5]|[68])/.test(digits)) return 'diners';
    if (/^(50|6[0-9])/.test(digits)) return 'elo';
    if (/^606282|^3841(?:[0|4|6]{1})0/.test(digits)) return 'hipercard';
    return null;
  };

  // Atualizar bandeira quando número do cartão muda
  useEffect(() => {
    const brand = identifyCardBrand(cardNumber);
    setCardBrand(brand);

    // Calcular parcelas quando tem bandeira - usar preço final após desconto
    const priceForInstallments = appliedCoupon?.final_price ?? planPrice;
    if (brand && priceForInstallments) {
      const options = [];
      const maxInstallments = 12;
      for (let i = 1; i <= maxInstallments; i++) {
        const installmentValue = priceForInstallments / i;
        if (installmentValue >= 5) { // Mínimo R$ 5 por parcela
          options.push({
            value: i.toString(),
            label: i === 1
              ? `1x de R$ ${priceForInstallments.toFixed(2)} (sem juros)`
              : `${i}x de R$ ${installmentValue.toFixed(2)} (sem juros)`
          });
        }
      }
      setInstallmentOptions(options);
    }
  }, [cardNumber, planPrice, appliedCoupon]);

  // Formatar CPF
  const formatCPF = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

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
            professional_id: professionalId,
            coupon_id: appliedCoupon?.coupon_id || null,
            original_price: originalPrice,
            final_price: finalPrice,
            discount_amount: discountAmount
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

  const handleCardPayment = async () => {
    if (!CARD_PAYMENT_ENABLED || !mpRef.current) {
      setError('Pagamento com cartão não disponível no momento.');
      return;
    }

    // Validações
    if (!cardNumber || cardNumber.replace(/\D/g, '').length < 13) {
      setError('Número do cartão inválido');
      return;
    }
    if (!cardholderName || cardholderName.length < 3) {
      setError('Nome do titular inválido');
      return;
    }
    if (!expirationMonth || !expirationYear) {
      setError('Data de validade inválida');
      return;
    }
    if (!securityCode || securityCode.length < 3) {
      setError('CVV inválido');
      return;
    }
    if (!identificationNumber || identificationNumber.replace(/\D/g, '').length < 11) {
      setError('CPF inválido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Criar token do cartão usando SDK do MercadoPago
      const cardTokenResponse = await mpRef.current.createCardToken({
        cardNumber: cardNumber.replace(/\D/g, ''),
        cardholderName: cardholderName,
        cardExpirationMonth: expirationMonth,
        cardExpirationYear: expirationYear,
        securityCode: securityCode,
        identificationType: identificationType,
        identificationNumber: identificationNumber.replace(/\D/g, '')
      });

      if (cardTokenResponse.error) {
        throw new Error(cardTokenResponse.error.message || 'Erro ao processar cartão');
      }

      // Enviar apenas o token para o backend
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
            action: 'create_card_payment',
            plan_key: planKey,
            professional_id: professionalId,
            card_token: cardTokenResponse.id,
            installments: parseInt(installments),
            payment_method_id: cardBrand || 'visa',
            coupon_id: appliedCoupon?.coupon_id || null,
            original_price: originalPrice,
            final_price: finalPrice,
            discount_amount: discountAmount,
            payer: {
              email: user?.email,
              identification: {
                type: identificationType,
                number: identificationNumber.replace(/\D/g, '')
              }
            }
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar pagamento');
      }

      if (data.status === 'approved') {
        setStep('success');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 2000);
      } else if (data.status === 'in_process' || data.status === 'pending') {
        setError('Pagamento em análise. Você receberá uma confirmação em breve.');
      } else {
        throw new Error(data.status_detail || 'Pagamento não aprovado');
      }
    } catch (err) {
      console.error('Erro no pagamento:', err);

      // Traduzir erros comuns
      const errorMessage = err.message || 'Erro ao processar pagamento';
      if (errorMessage.includes('card_number')) {
        setError('Número do cartão inválido');
      } else if (errorMessage.includes('expiration')) {
        setError('Data de validade inválida');
      } else if (errorMessage.includes('security_code') || errorMessage.includes('cvv')) {
        setError('Código de segurança inválido');
      } else if (errorMessage.includes('insufficient_funds') || errorMessage.includes('insufficient_amount')) {
        setError('Saldo insuficiente no cartão');
      } else if (errorMessage.includes('cc_rejected')) {
        setError('Cartão recusado. Tente outro cartão ou entre em contato com seu banco.');
      } else {
        setError(errorMessage);
      }
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
      {/* Resumo do pedido */}
      <div className="bg-slate-50 rounded-lg p-4">
        <p className="text-sm text-slate-500 mb-2">{planName}</p>

        {/* Se tem cupom aplicado, mostra resumo */}
        {appliedCoupon ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Subtotal:</span>
              <span className="text-slate-600">R$ {originalPrice?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-green-600">
              <span className="flex items-center gap-1">
                <Tag className="w-3 h-3" />
                Desconto ({appliedCoupon.code}):
              </span>
              <span>-R$ {discountAmount?.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-semibold text-slate-900">Total:</span>
              <span className="text-2xl font-bold text-orange-600">R$ {finalPrice?.toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-900">Total:</span>
            <span className="text-2xl font-bold text-orange-600">R$ {originalPrice?.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Campo de cupom */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm">
          <Tag className="w-4 h-4 text-blue-500" />
          Cupom de desconto
        </Label>

        {appliedCoupon ? (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-mono font-bold text-green-800">{appliedCoupon.code}</p>
                <p className="text-xs text-green-600">
                  {appliedCoupon.discount_type === 'percentage'
                    ? `${appliedCoupon.discount_value}% de desconto`
                    : `R$ ${appliedCoupon.discount_value} de desconto`}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveCoupon}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              placeholder="Digite o código"
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value.toUpperCase());
                setCouponError(null);
              }}
              className="uppercase"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleApplyCoupon}
              disabled={couponLoading || !couponCode.trim()}
            >
              {couponLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Aplicar'
              )}
            </Button>
          </div>
        )}

        {couponError && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {couponError}
          </p>
        )}
      </div>

      {/* Métodos de pagamento */}
      <div className="pt-2">
        <p className="text-sm font-medium text-slate-700 mb-3">Escolha o método de pagamento:</p>

        <Card
          className="border-2 border-green-300 hover:border-green-500 cursor-pointer transition-all mb-3"
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
            CARD_PAYMENT_ENABLED && MERCADOPAGO_PUBLIC_KEY
              ? 'border-blue-300 hover:border-blue-500 cursor-pointer'
              : 'border-slate-200 opacity-60 cursor-not-allowed'
          }`}
          onClick={() => CARD_PAYMENT_ENABLED && MERCADOPAGO_PUBLIC_KEY && setStep('card')}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              CARD_PAYMENT_ENABLED && MERCADOPAGO_PUBLIC_KEY ? 'bg-blue-100' : 'bg-slate-100'
            }`}>
              <CreditCard className={`w-6 h-6 ${
                CARD_PAYMENT_ENABLED && MERCADOPAGO_PUBLIC_KEY ? 'text-blue-600' : 'text-slate-400'
              }`} />
            </div>
            <div className="flex-1">
              <p className={`font-semibold ${
                CARD_PAYMENT_ENABLED && MERCADOPAGO_PUBLIC_KEY ? 'text-slate-900' : 'text-slate-500'
              }`}>Cartão de Crédito</p>
              <p className="text-sm text-slate-500">
                {CARD_PAYMENT_ENABLED && MERCADOPAGO_PUBLIC_KEY
                  ? 'Parcele em até 12x sem juros'
                  : 'Em breve disponível'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

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

        {appliedCoupon ? (
          <>
            <p className="text-sm text-slate-500 line-through">R$ {originalPrice?.toFixed(2)}</p>
            <p className="text-3xl font-bold text-green-600 mb-1">R$ {finalPrice?.toFixed(2)}</p>
          </>
        ) : (
          <p className="text-3xl font-bold text-slate-900 mb-1">R$ {originalPrice?.toFixed(2)}</p>
        )}
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
        onClick={() => { setStep('select'); setError(null); }}
        className="mb-2"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mb-3">
          <CreditCard className="w-4 h-4" />
          Cartão de Crédito
        </div>
        {appliedCoupon ? (
          <>
            <p className="text-sm text-slate-500 line-through">R$ {originalPrice?.toFixed(2)}</p>
            <p className="text-2xl font-bold text-green-600">R$ {finalPrice?.toFixed(2)}</p>
          </>
        ) : (
          <p className="text-2xl font-bold text-slate-900">R$ {originalPrice?.toFixed(2)}</p>
        )}
        <p className="text-slate-600">{planName}</p>
      </div>

      <div className="space-y-4">
        {/* Número do Cartão */}
        <div className="space-y-2">
          <Label htmlFor="cardNumber">Número do Cartão</Label>
          <div className="relative">
            <Input
              id="cardNumber"
              placeholder="0000 0000 0000 0000"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              maxLength={19}
              className="pr-12"
            />
            {cardBrand && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <img
                  src={`https://www.mercadopago.com/org-img/MP3/API/logos/${cardBrand}.gif`}
                  alt={cardBrand}
                  className="h-6"
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
            )}
          </div>
        </div>

        {/* Nome do Titular */}
        <div className="space-y-2">
          <Label htmlFor="cardholderName">Nome no Cartão</Label>
          <Input
            id="cardholderName"
            placeholder="NOME COMO NO CARTÃO"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
          />
        </div>

        {/* Validade e CVV */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>Mês</Label>
            <Select value={expirationMonth} onValueChange={setExpirationMonth}>
              <SelectTrigger>
                <SelectValue placeholder="MM" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => {
                  const month = (i + 1).toString().padStart(2, '0');
                  return <SelectItem key={month} value={month}>{month}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ano</Label>
            <Select value={expirationYear} onValueChange={setExpirationYear}>
              <SelectTrigger>
                <SelectValue placeholder="AA" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 15 }, (_, i) => {
                  const year = (new Date().getFullYear() + i).toString().slice(-2);
                  return <SelectItem key={year} value={year}>{year}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cvv">CVV</Label>
            <Input
              id="cvv"
              placeholder="123"
              value={securityCode}
              onChange={(e) => setSecurityCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              type="password"
            />
          </div>
        </div>

        {/* CPF */}
        <div className="space-y-2">
          <Label htmlFor="cpf">CPF do Titular</Label>
          <Input
            id="cpf"
            placeholder="000.000.000-00"
            value={identificationNumber}
            onChange={(e) => setIdentificationNumber(formatCPF(e.target.value))}
            maxLength={14}
          />
        </div>

        {/* Parcelas */}
        {installmentOptions.length > 0 && (
          <div className="space-y-2">
            <Label>Parcelas</Label>
            <Select value={installments} onValueChange={setInstallments}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {installmentOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Botão de Pagamento */}
        <Button
          onClick={handleCardPayment}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 mr-2" />
              Pagar R$ {finalPrice?.toFixed(2)}
            </>
          )}
        </Button>

        {/* Segurança */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <Lock className="w-3 h-3" />
          <span>Pagamento seguro via Mercado Pago</span>
        </div>
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
      <p className="text-slate-600">Seu acesso foi liberado com sucesso.</p>
    </motion.div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
