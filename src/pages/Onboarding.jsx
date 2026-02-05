import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from "@/lib/AuthContext";
import { ProfessionalService, ReferralService, ClientReferralService, generateReferralCode, User as UserEntity, Category } from "@/lib/entities";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Label } from "@/componentes/interface do usuário/label";
import { RadioGroup, RadioGroupItem } from "@/componentes/interface do usuário/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/interface do usuário/select";
import {
  Hammer, User, Briefcase, ArrowRight, ArrowLeft,
  CheckCircle, Loader2, Building2, MapPin, Award
} from "lucide-react";
import { Checkbox } from "@/componentes/interface do usuário/checkbox";
import { Textarea } from "@/componentes/interface do usuário/textarea";
import { useQuery } from "@tanstack/react-query";

// Função para traduzir erros do Supabase para mensagens amigáveis
const translateSupabaseError = (error) => {
  const message = error?.message || error || '';

  // Erros de telefone duplicado
  if (message.includes('users_phone_key') || message.includes('profiles_phone_key') || (message.includes('duplicate key') && message.includes('phone'))) {
    return 'Este número de telefone já está cadastrado. Use outro número.';
  }
  // Erros de email duplicado
  if (message.includes('User already registered') || message.includes('already been registered')) {
    return 'Este email já está cadastrado.';
  }
  if (message.includes('users_email_key') || (message.includes('duplicate key') && message.includes('email'))) {
    return 'Este email já está cadastrado.';
  }
  // Erros de banco de dados
  if (message.includes('Database error')) {
    if (message.includes('phone')) {
      return 'Este número de telefone já está cadastrado. Use outro número.';
    }
    return 'Erro ao salvar dados. Verifique se todos os campos estão corretos.';
  }
  // Erros de rede
  if (message.includes('network') || message.includes('fetch')) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  }

  return message || 'Erro ao processar sua solicitação. Tente novamente.';
};

const specializations = [
  "Reformas Residenciais",
  "Reformas Comerciais",
  "Construção Nova",
  "Reparos Rápidos",
  "Manutenção Predial",
  "Manutenção Industrial",
  "Obras Públicas",
  "Instalações Elétricas",
  "Instalações Hidráulicas",
  "Acabamento Fino",
  "Pintura Texturizada",
  "Pintura de Fachadas",
  "Limpeza Pós-Obra",
  "Limpeza Profunda",
  "Paisagismo",
  "Manutenção de Jardins",
  "Alvenaria Estrutural",
  "Alvenaria de Blocos",
  "Reboco e Emboço",
  "Instalação de Forros",
  "Instalação de Divisórias",
  "Móveis sob Medida",
  "Restauração de Móveis",
  "Portas e Janelas",
  "Revestimento de Parede",
  "Revestimento de Piso",
  "Instalação de Persianas",
  "Instalação de Cortinas",
  "Manutenção Preventiva",
  "Manutenção Corretiva",
  "Orçamento Gratuito"
];

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
  const [step, setStep] = useState(1);

  const savingRef = useRef(false);
  const initializedRef = useRef(false);

  // Buscar categorias (profissões) do banco
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['onboarding-categories'],
    queryFn: () => Category.filter({
      filters: { is_active: true },
      orderBy: { field: 'order', direction: 'asc' },
      limit: 500
    }),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Transformar categorias em opções para o select com headers de grupo
  const professions = useMemo(() => {
    if (!categories.length) return [];

    const options = [];

    // Agrupar por category_group
    const groups = {};
    categories.forEach(cat => {
      const group = cat.category_group || 'Outros';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(cat);
    });

    // Ordenar grupos - construção primeiro
    const sortedGroupNames = Object.keys(groups).sort((a, b) => {
      const homeGroups = ['Construção', 'Elétrica/Hidráulica', 'Limpeza/Jardim', 'Madeira/Metal', 'Projetos'];
      const aIsHome = homeGroups.some(g => a.includes(g));
      const bIsHome = homeGroups.some(g => b.includes(g));
      if (aIsHome && !bIsHome) return -1;
      if (!aIsHome && bIsHome) return 1;
      return a.localeCompare(b);
    });

    // Adicionar cada grupo com header
    sortedGroupNames.forEach(groupName => {
      // Adicionar header do grupo (disabled)
      const emoji = groupName.match(/^[^\w\s]/)?.[0] || '📁';
      const cleanName = groupName.replace(/^[^\w\s]\s*/, '');
      options.push({
        value: `header_${groupName}`,
        label: `${emoji} ${cleanName.toUpperCase()}`,
        disabled: true
      });

      // Adicionar categorias do grupo
      groups[groupName].forEach(cat => {
        options.push({
          value: cat.slug,
          label: cat.name
        });
      });
    });

    return options;
  }, [categories]);

  const [formData, setFormData] = useState({
    user_type: '',
    phone: '',
    city: '',
    state: '',
    // Campos profissionais
    cnpj: '',
    cpf: '',
    profession: '',
    specializations: [],
    address: '',
    years_experience: '',
    google_maps_link: '',
    business_hours: '',
    personal_description: ''
  });

  useEffect(() => {
    // Não executar checkUser se estiver salvando
    if (savingRef.current) {
      return;
    }
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

    // If already onboarded, redirect
    if (user.onboarding_complete && !savingRef.current) {
      if (user.user_type === 'profissional') {
        window.location.href = createPageUrl("ProfessionalDashboard");
      } else {
        window.location.href = createPageUrl("Home");
      }
      return;
    }

    // Pre-fill apenas na primeira vez
    if (!initializedRef.current) {
      initializedRef.current = true;
      if (user.user_type) {
        setFormData({
          user_type: user.user_type || '',
          phone: user.phone || '',
          city: user.city || '',
          state: user.state || '',
          cnpj: user.cnpj || '',
          cpf: user.cpf || '',
          profession: user.profession || '',
          specializations: user.specializations || [],
          address: user.address || '',
          years_experience: user.years_experience || '',
          google_maps_link: user.google_maps_link || '',
          business_hours: user.business_hours || '',
          personal_description: user.personal_description || ''
        });
      }
    }

    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      alert('Erro: usuário não identificado. Por favor, faça login novamente.');
      return;
    }

    // Marcar como salvando ANTES de qualquer operação async
    savingRef.current = true;
    setSaving(true);

    try {
      // Apenas enviar campos que existem na tabela profiles
      // Campos profissionais serão salvos na tabela professionals
      const profileData = {
        user_type: formData.user_type,
        phone: formData.phone,
        city: formData.city,
        state: formData.state,
        onboarding_complete: true
      };

      const updatedProfile = await updateProfile(profileData);

      if (formData.user_type === 'profissional') {
        // Generate referral code (8 chars = baixíssima chance de colisão)
        const referralCode = generateReferralCode();

        // Create professional profile with referral code
        // Construir descrição com informações adicionais
        let description = '';
        if (formData.specializations.length > 0) {
          description = `Especializado em: ${formData.specializations.join(', ')}`;
        }
        if (formData.years_experience) {
          description += description ? ` | ${formData.years_experience} anos de experiência` : `${formData.years_experience} anos de experiência`;
        }
        if (formData.address) {
          description += description ? ` | Endereço: ${formData.address}` : `Endereço: ${formData.address}`;
        }
        if (formData.business_hours) {
          description += description ? ` | Horário: ${formData.business_hours}` : `Horário: ${formData.business_hours}`;
        }

        const professionalData = {
          user_id: user.id,
          name: user.full_name,
          profession: formData.profession || 'outros',
          city: formData.city,
          state: formData.state,
          whatsapp: formData.phone,
          description: description,
          personal_description: formData.personal_description || '',
          photos: [],
          plan_type: 'free',
          plan_active: true,
          is_approved: true,
          is_blocked: false,
          profile_complete: false,
          referral_code: referralCode,
          referral_credits: 0,
          total_referrals: 0
        };

        const newProfessional = await ProfessionalService.createWithAuth(professionalData);

        // Process referral if this user was referred (pode ter sido indicado por profissional OU cliente)
        if (user.referred_by_code) {
          try {
            // Primeiro tenta encontrar um profissional com esse código
            const referrerProfessional = await ProfessionalService.findByReferralCode(user.referred_by_code);
            if (referrerProfessional) {
              const referral = await ReferralService.createReferral(
                referrerProfessional.id,
                user.id,
                'profissional'
              );
              await ReferralService.completeReferral(referral.id);
            } else {
              // Se não encontrou profissional, tenta encontrar um cliente
              const referrerClient = await ClientReferralService.findByReferralCode(user.referred_by_code);
              if (referrerClient) {
                const referral = await ClientReferralService.createReferral(
                  referrerClient.id,
                  user.id,
                  'profissional'
                );
                await ClientReferralService.completeReferral(referral.id);
              }
            }
          } catch (refError) {
            // Ignorar erro de referral
          }
        }

        window.location.href = createPageUrl("ProfessionalDashboard");
      } else {
        // Generate referral code for client
        const clientReferralCode = generateReferralCode();

        // Update profile with referral code
        try {
          await UserEntity.update(user.id, {
            referral_code: clientReferralCode,
            referral_credits: 0,
            total_referrals: 0
          });
        } catch (refCodeError) {
          // Ignorar erro de referral code
        }

        // Process referral for client users (pode ter sido indicado por profissional OU cliente)
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

        window.location.href = createPageUrl("Home");
      }
    } catch (error) {
      alert(translateSupabaseError(error));
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
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Hammer className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Bem-vindo ao ConectPro</h1>
          <p className="text-slate-400 mt-2">Complete seu cadastro para continuar</p>
        </div>

        {/* Progress */}
        <div className="flex justify-center gap-2 mb-8">
          {formData.user_type === 'profissional' ? (
            [1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 w-16 rounded-full transition-colors ${
                  s <= step ? 'bg-orange-500' : 'bg-slate-700'
                }`}
              />
            ))
          ) : (
            [1, 2].map((s) => (
              <div
                key={s}
                className={`h-2 w-16 rounded-full transition-colors ${
                  s <= step ? 'bg-orange-500' : 'bg-slate-700'
                }`}
              />
            ))
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">Como você quer usar o app?</h2>
                <p className="text-slate-600 text-sm mt-1">Escolha o tipo de conta</p>
              </div>

              <RadioGroup
                value={formData.user_type}
                onValueChange={(value) => setFormData({ ...formData, user_type: value })}
                className="space-y-4"
              >
                <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.user_type === 'cliente'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <div className="flex items-center justify-center w-5 h-5">
                    <RadioGroupItem value="cliente" id="cliente" className="border-2 border-slate-700 text-orange-600" />
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Sou Cliente</p>
                    <p className="text-sm text-slate-600">Quero encontrar profissionais</p>
                  </div>
                </label>

                <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.user_type === 'profissional'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <div className="flex items-center justify-center w-5 h-5">
                    <RadioGroupItem value="profissional" id="profissional" className="border-2 border-slate-700 text-orange-600" />
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Sou Profissional</p>
                    <p className="text-sm text-slate-600">Quero divulgar meus serviços</p>
                  </div>
                </label>
              </RadioGroup>

              <Button
                type="button"
                onClick={(e) => { e.preventDefault(); setStep(2); }}
                disabled={!formData.user_type}
                className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-base"
              >
                Continuar
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">Informações de Contato</h2>
                <p className="text-slate-600 text-sm mt-1">Onde você atua?</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Telefone (WhatsApp) *</Label>
                  <Input
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="h-12 mt-1"
                  />
                </div>

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

                {formData.user_type === 'profissional' && (
                  <div>
                    <Label>Endereço Completo</Label>
                    <Input
                      placeholder="Rua, número, bairro"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="h-12 mt-1"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => { e.preventDefault(); setStep(1); }}
                  className="flex-1 h-12"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Voltar
                </Button>
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    if (formData.user_type === 'profissional') {
                      setStep(3);
                    } else {
                      handleSubmit();
                    }
                  }}
                  disabled={!formData.phone || !formData.state || !formData.city || saving}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 h-12"
                >
                  {formData.user_type === 'profissional' ? (
                    <>
                      Continuar
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  ) : saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Finalizar
                      <CheckCircle className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 3 && formData.user_type === 'profissional' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">Informações Profissionais</h2>
                <p className="text-slate-600 text-sm mt-1">Conte-nos sobre sua atuação</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Profissão Principal *</Label>
                  <Select
                    value={formData.profession}
                    onValueChange={(value) => setFormData({ ...formData, profession: value })}
                    disabled={loadingCategories}
                  >
                    <SelectTrigger className="h-12 mt-1">
                      {loadingCategories ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Carregando...
                        </div>
                      ) : (
                        <SelectValue placeholder="Selecione sua profissão" />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {professions.map(p => (
                        <SelectItem
                          key={p.value}
                          value={p.value}
                          disabled={p.disabled}
                          className={p.disabled ? 'font-bold text-slate-500 bg-slate-100' : ''}
                        >
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>CNPJ ou CPF {formData.profession === 'empresa_local' ? '*' : '(Opcional)'}</Label>
                  <div className="space-y-2 mt-1">
                    <Input
                      placeholder="CNPJ: 00.000.000/0000-00"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                      className="h-12"
                    />
                    <Input
                      placeholder="CPF: 000.000.000-00"
                      value={formData.cpf}
                      onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                      className="h-12"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {formData.profession === 'empresa_local'
                      ? 'Obrigatório para empresas - informe CNPJ ou CPF'
                      : 'Deixe em branco se for autônomo'}
                  </p>
                </div>

                <div>
                  <Label>Anos de Experiência</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 5"
                    value={formData.years_experience}
                    onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
                    className="h-12 mt-1"
                  />
                </div>

                {(formData.profession === 'empresa_local' || formData.profession.includes('loja')) && (
                  <>
                    <div>
                      <Label>Link do Google Maps *</Label>
                      <Input
                        placeholder="Cole o link do Google Maps do seu estabelecimento"
                        value={formData.google_maps_link}
                        onChange={(e) => setFormData({ ...formData, google_maps_link: e.target.value })}
                        className="h-12 mt-1"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Facilita para clientes encontrarem sua localização física
                      </p>
                    </div>

                    <div>
                      <Label>Horário de Funcionamento *</Label>
                      <Input
                        placeholder="Ex: Seg-Sex 8h-18h, Sáb 8h-12h"
                        value={formData.business_hours}
                        onChange={(e) => setFormData({ ...formData, business_hours: e.target.value })}
                        className="h-12 mt-1"
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label>Descrição Pessoal *</Label>
                  <Textarea
                    placeholder="Conte sobre você, sua história profissional, diferenciais, como você trabalha e o que te motiva. Essa descrição será exibida no seu perfil para clientes conhecerem melhor você..."
                    value={formData.personal_description}
                    onChange={(e) => setFormData({ ...formData, personal_description: e.target.value })}
                    className="mt-1 min-h-[120px]"
                    required
                  />
                  <p className="text-xs text-orange-600 mt-1 font-medium">
                    * Campo obrigatório - Uma boa descrição aumenta suas chances de ser contratado
                  </p>
                </div>

                <div>
                  <Label className="mb-3 block">Especializações (Selecione todas que se aplicam)</Label>
                  <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                    {specializations.map((spec) => (
                      <div key={spec} className="flex items-center space-x-2">
                        <Checkbox
                          id={spec}
                          checked={formData.specializations.includes(spec)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({
                                ...formData,
                                specializations: [...formData.specializations, spec]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                specializations: formData.specializations.filter(s => s !== spec)
                              });
                            }
                          }}
                        />
                        <label
                          htmlFor={spec}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {spec}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => { e.preventDefault(); setStep(2); }}
                  className="flex-1 h-12"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Voltar
                </Button>
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSubmit();
                  }}
                  disabled={
                    !formData.profession ||
                    !formData.personal_description?.trim() ||
                    saving ||
                    (formData.profession === 'empresa_local' && !formData.cnpj && !formData.cpf) ||
                    (formData.profession === 'empresa_local' && !formData.google_maps_link) ||
                    (formData.profession === 'empresa_local' && !formData.business_hours)
                  }
                  className="flex-1 bg-orange-500 hover:bg-orange-600 h-12"
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
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Ao continuar, você concorda com nossos termos de uso.
        </p>
      </div>
    </div>
  );
}
