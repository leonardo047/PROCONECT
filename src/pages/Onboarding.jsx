import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from "@/lib/AuthContext";
import { ClientReferralService, ProfessionalService, ReferralService, generateReferralCode, User as UserEntity } from "@/lib/entities";
import { createPageUrl } from "@/utils";
import { translateSupabaseError } from "@/utils/translateSupabaseError";
import { showToast } from "@/utils/showToast";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Label } from "@/componentes/interface do usuário/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/interface do usuário/select";
import { CheckCircle, Loader2 } from "lucide-react";

const states = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" }
];

export default function Onboarding() {
  const { user, isAuthenticated, navigateToLogin, updateProfile, isLoadingAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const savingRef = useRef(false);
  const initializedRef = useRef(false);

  const [formData, setFormData] = useState({
    city: '',
    state: ''
  });

  useEffect(() => {
    if (savingRef.current) return;
    checkUser();
  }, [user, isAuthenticated, isLoadingAuth]);

  const checkUser = async () => {
    if (isLoadingAuth) return;
    if (savingRef.current) return;

    if (!isAuthenticated) {
      navigateToLogin(createPageUrl("Onboarding"));
      return;
    }

    if (!user) return;

    // Se já completou onboarding, redirecionar
    if (user.onboarding_complete && !savingRef.current) {
      // Redirecionar baseado no modo ativo
      if (user.active_mode === 'professional' && user.is_professional) {
        window.location.href = createPageUrl("ProfessionalDashboard");
      } else {
        window.location.href = createPageUrl("Home");
      }
      return;
    }

    // Pre-fill apenas na primeira vez
    if (!initializedRef.current) {
      initializedRef.current = true;
      setFormData({
        city: user.city || '',
        state: user.state || ''
      });
    }

    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      showToast.error('Erro: usuário não identificado', 'Por favor, faça login novamente.');
      return;
    }

    savingRef.current = true;
    setSaving(true);

    try {
      // Salvar dados básicos no perfil
      // Todos os novos usuários são clientes por padrão
      const profileData = {
        user_type: 'cliente',
        city: formData.city,
        state: formData.state,
        onboarding_complete: true,
        is_professional: false,
        active_mode: 'client'
      };

      await updateProfile(profileData);

      // Gerar código de indicação para o cliente
      const clientReferralCode = generateReferralCode();
      try {
        await UserEntity.update(user.id, {
          referral_code: clientReferralCode,
          referral_credits: 0,
          total_referrals: 0
        });
      } catch (refCodeError) {
        // Ignorar erro de referral code
      }

      // Processar indicação se este usuário foi indicado
      if (user.referred_by_code) {
        try {
          // Primeiro tenta encontrar um profissional com esse código
          const referrerProfessional = await ProfessionalService.findByReferralCode(user.referred_by_code);
          if (referrerProfessional) {
            const referral = await ReferralService.createReferral(
              referrerProfessional.id,
              user.id,
              'cliente'
            );
            await ReferralService.completeReferral(referral.id);
          } else {
            // Se não encontrou profissional, tenta encontrar um cliente
            const referrerClient = await ClientReferralService.findByReferralCode(user.referred_by_code);
            if (referrerClient) {
              const referral = await ClientReferralService.createReferral(
                referrerClient.id,
                user.id,
                'cliente'
              );
              await ClientReferralService.completeReferral(referral.id);
            }
          }
        } catch (refError) {
          // Ignorar erro de referral
        }
      }

      // Redirecionar para a Home (cliente)
      window.location.href = createPageUrl("Home");
    } catch (error) {
      showToast.error('Erro ao salvar', translateSupabaseError(error));
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (loading || isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/logo.jpeg"
            alt="ConnectPro Logo"
            className="w-16 h-16 rounded-2xl mx-auto mb-4 object-cover"
          />
          <h1 className="text-2xl font-bold text-white">Bem-vindo ao ConnectPro</h1>
          <p className="text-slate-400 mt-2">Complete seus dados de contato</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Informações de Contato</h2>
              <p className="text-slate-600 text-sm mt-1">Onde você está localizado?</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Estado *</Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) => setFormData({ ...formData, state: value })}
                >
                  <SelectTrigger className="h-12 mt-1">
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Cidade *</Label>
                <Input
                  placeholder="Sua cidade"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="h-12 mt-1"
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              disabled={!formData.state || !formData.city || saving}
              className="w-full bg-orange-500 hover:bg-orange-600 h-12"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Finalizar
                  <CheckCircle className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            <p className="text-xs text-slate-500 text-center">
              Quer oferecer seus serviços? Depois de concluir, acesse o menu e clique em "Virar Profissional".
            </p>
          </div>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Ao continuar, você concorda com nossos termos de uso.
        </p>
      </div>
    </div>
  );
}
