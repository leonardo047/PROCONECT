import React, { useState, useEffect } from 'react';
import { useAuth } from "@/lib/AuthContext";
import { Professional, ProfessionalService, ReferralService, generateReferralCode } from "@/lib/entities";
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

const professions = [
  { value: "pintura_residencial", label: "Pintura Residencial e Comercial" },
  { value: "pedreiro_alvenaria", label: "Pedreiro / Alvenaria" },
  { value: "eletricista", label: "Eletricista" },
  { value: "hidraulica", label: "Encanador / Hidráulica" },
  { value: "limpeza", label: "Limpeza Residencial / Pós-obra" },
  { value: "jardinagem", label: "Jardinagem / Roçada" },
  { value: "gesso_drywall", label: "Gesso / Drywall" },
  { value: "telhados", label: "Telhados" },
  { value: "calheiro", label: "Calheiro / Calhas" },
  { value: "marido_aluguel", label: "Marido de Aluguel" },
  { value: "carpinteiro", label: "Carpintaria" },
  { value: "marceneiro", label: "Marcenaria" },
  { value: "vidraceiro", label: "Vidraçaria" },
  { value: "serralheiro", label: "Serralheria" },
  { value: "azulejista", label: "Azulejista / Revestimentos" },
  { value: "ar_condicionado", label: "Ar Condicionado / Refrigeração" },
  { value: "dedetizacao", label: "Dedetização" },
  { value: "desentupidor", label: "Desentupidor" },
  { value: "controle_pragas", label: "Controle de Pragas" },
  { value: "fumigacao", label: "Fumigação" },
  { value: "limpeza_reservatorio", label: "Limpeza de Reservatório" },
  { value: "limpeza_fachada", label: "Limpeza de Fachada" },
  { value: "polimento_pisos", label: "Polimento de Pisos" },
  { value: "mudancas", label: "Mudanças e Fretes" },
  { value: "montador_moveis", label: "Montador de Móveis" },
  { value: "instalador_pisos", label: "Instalador de Pisos" },
  { value: "marmorista", label: "Marmorista / Granitos" },
  { value: "piscineiro", label: "Piscineiro / Manutenção de Piscinas" },
  { value: "tapeceiro", label: "Tapeceiro / Estofador" },
  { value: "restauracao_moveis", label: "Restauração de Móveis" },
  { value: "tapecaria_estofamento", label: "Tapecaria e Estofamento" },
  { value: "instalacao_cortinas", label: "Instalação de Cortinas" },
  { value: "instalacao_persianas", label: "Instalação de Persianas" },
  { value: "instalacao_papel_parede", label: "Instalação de Papel de Parede" },
  { value: "chaveiro", label: "Chaveiro" },
  { value: "seguranca_eletronica", label: "Segurança Eletrônica / CFTV" },
  { value: "alarmes", label: "Alarmes" },
  { value: "cameras_seguranca", label: "Câmeras de Segurança" },
  { value: "cerca_eletrica", label: "Cerca Elétrica" },
  { value: "portoes_automaticos", label: "Portões Automáticos" },
  { value: "automacao", label: "Automação Residencial" },
  { value: "energia_solar", label: "Energia Solar" },
  { value: "impermeabilizacao", label: "Impermeabilização" },
  { value: "instalacao_internet", label: "Instalação de Internet" },
  { value: "antenas_satelite", label: "Antenas e Satélite" },
  { value: "arquiteto", label: "Arquitetura e Projetos" },
  { value: "engenheiro", label: "Engenharia Civil" },
  { value: "decorador", label: "Decoração de Interiores" },
  { value: "mecanico_auto", label: "Mecânico Automotivo" },
  { value: "eletricista_auto", label: "Eletricista Automotivo" },
  { value: "funilaria_pintura", label: "Funilaria e Pintura Auto" },
  { value: "vidraceiro_auto", label: "Vidraceiro Automotivo" },
  { value: "lavagem_automotiva", label: "Lavagem Automotiva" },
  { value: "estetica_automotiva", label: "Estética Automotiva" },
  { value: "som_automotivo", label: "Som Automotivo" },
  { value: "reboque_guincho", label: "Reboque / Guincho" },
  { value: "borracheiro", label: "Borracheiro" },
  { value: "alinhamento_balanceamento", label: "Alinhamento e Balanceamento" },
  { value: "troca_oleo", label: "Troca de Óleo" },
  { value: "manicure_pedicure", label: "Manicure e Pedicure" },
  { value: "cabeleireiro", label: "Cabeleireiro" },
  { value: "barbeiro", label: "Barbearia" },
  { value: "estetica_facial", label: "Estética Facial" },
  { value: "depilacao", label: "Depilação" },
  { value: "massagem", label: "Massagem" },
  { value: "personal_trainer", label: "Personal Trainer" },
  { value: "nutricao", label: "Nutrição" },
  { value: "psicologia", label: "Psicologia" },
  { value: "veterinario", label: "Veterinário" },
  { value: "pet_grooming", label: "Pet Grooming / Banho e Tosa" },
  { value: "passeador_caes", label: "Passeador de Cães" },
  { value: "adestramento", label: "Adestramento" },
  { value: "aulas_particulares", label: "Aulas Particulares" },
  { value: "traducao", label: "Tradução" },
  { value: "informatica_ti", label: "Informática e TI" },
  { value: "design_grafico", label: "Design Gráfico" },
  { value: "fotografia", label: "Fotografia" },
  { value: "video", label: "Vídeo / Filmagem" },
  { value: "eventos", label: "Organização de Eventos" },
  { value: "buffet", label: "Buffet / Catering" },
  { value: "decoracao_festas", label: "Decoração de Festas" },
  { value: "musicos", label: "Músicos" },
  { value: "dj", label: "DJ" },
  { value: "brinquedos_inflaveis", label: "Brinquedos Infláveis" },
  { value: "aluguel_equipamentos", label: "Aluguel de Equipamentos" },
  { value: "empresa_local", label: "Empresa Local (Contato Direto)" },
  { value: "encontra_objeto", label: "Encontra Objeto Perdido" },
  { value: "encontra_produto", label: "Encontra Produto Específico" },
  { value: "outros", label: "Outras Especialidades" }
];

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
    business_hours: ''
  });

  useEffect(() => {
    checkUser();
  }, [user, isAuthenticated, isLoadingAuth]);

  const checkUser = async () => {
    if (isLoadingAuth) return;

    if (!isAuthenticated) {
      // Redireciona para login
      navigateToLogin(createPageUrl("Onboarding"));
      return;
    }

    if (!user) return;

    // If already onboarded, redirect
    if (user.onboarding_complete) {
      if (user.user_type === 'profissional') {
        window.location.href = createPageUrl("ProfessionalDashboard");
      } else {
        window.location.href = createPageUrl("Home");
      }
      return;
    }

    // Pre-fill if data exists
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
        business_hours: user.business_hours || ''
      });
    }

    setLoading(false);
  };

  const handleSubmit = async () => {
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

      await updateProfile(profileData);

      if (formData.user_type === 'profissional') {
        // Generate unique referral code
        let referralCode = generateReferralCode();
        let codeExists = true;
        let attempts = 0;

        while (codeExists && attempts < 10) {
          const existingPro = await ProfessionalService.findByReferralCode(referralCode);
          if (!existingPro) {
            codeExists = false;
          } else {
            referralCode = generateReferralCode();
            attempts++;
          }
        }

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

        const newProfessional = await Professional.create({
          user_id: user.id,
          name: user.full_name,
          profession: formData.profession || 'outros',
          city: formData.city,
          state: formData.state,
          whatsapp: formData.phone,
          description: description,
          photos: [],
          plan_type: 'free',
          plan_active: true,
          is_approved: false,
          is_blocked: false,
          profile_complete: false,
          referral_code: referralCode,
          referral_credits: 0,
          total_referrals: 0
        });

        // Process referral if this user was referred
        if (user.referred_by_code) {
          try {
            const referrer = await ProfessionalService.findByReferralCode(user.referred_by_code);
            if (referrer) {
              const referral = await ReferralService.createReferral(
                referrer.id,
                user.id,
                'profissional'
              );
              await ReferralService.completeReferral(referral.id);
            }
          } catch (refError) {
            console.error('Error processing referral:', refError);
          }
        }

        window.location.href = createPageUrl("ProfessionalDashboard");
      } else {
        // Process referral for client users
        if (user.referred_by_code) {
          try {
            const referrer = await ProfessionalService.findByReferralCode(user.referred_by_code);
            if (referrer) {
              const referral = await ReferralService.createReferral(
                referrer.id,
                user.id,
                'cliente'
              );
              await ReferralService.completeReferral(referral.id);
            }
          } catch (refError) {
            console.error('Error processing referral:', refError);
          }
        }

        window.location.href = createPageUrl("Home");
      }
    } catch (error) {
      console.error('Error saving:', error);
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
          <h1 className="text-2xl font-bold text-white">Bem-vindo ao ProObra</h1>
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
                onClick={() => setStep(2)}
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
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 h-12"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Voltar
                </Button>
                <Button
                  onClick={() => {
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
                  >
                    <SelectTrigger className="h-12 mt-1">
                      <SelectValue placeholder="Selecione sua profissão" />
                    </SelectTrigger>
                    <SelectContent>
                      {professions.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
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
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1 h-12"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Voltar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={
                    !formData.profession ||
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
