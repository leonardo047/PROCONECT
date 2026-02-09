import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/lib/AuthContext";
import { ProfessionalService, ReferralService, ClientReferralService, generateReferralCode, Category } from "@/lib/entities";
import { createPageUrl } from "@/utils";
import { translateSupabaseError } from "@/utils/translateSupabaseError";
import { showToast } from "@/utils/showToast";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Label } from "@/componentes/interface do usuário/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/interface do usuário/select";
import { Checkbox } from "@/componentes/interface do usuário/checkbox";
import { Textarea } from "@/componentes/interface do usuário/textarea";
import { Hammer, ArrowLeft, CheckCircle, Loader2, Briefcase } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
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

export default function BecomeProfessional() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoadingAuth, markAsProfessional, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  // Buscar categorias (profissões) do banco
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['become-professional-categories'],
    queryFn: () => Category.filter({
      filters: { is_active: true },
      orderBy: { field: 'order', direction: 'asc' },
      limit: 500
    }),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Transformar categorias em opções para o select
  const professions = useMemo(() => {
    if (!categories.length) return [];

    const options = [];
    const groups = {};

    categories.forEach(cat => {
      const group = cat.category_group || 'Outros';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(cat);
    });

    const sortedGroupNames = Object.keys(groups).sort((a, b) => {
      const homeGroups = ['Construção', 'Elétrica/Hidráulica', 'Limpeza/Jardim', 'Madeira/Metal', 'Projetos'];
      const aIsHome = homeGroups.some(g => a.includes(g));
      const bIsHome = homeGroups.some(g => b.includes(g));
      if (aIsHome && !bIsHome) return -1;
      if (!aIsHome && bIsHome) return 1;
      return a.localeCompare(b);
    });

    sortedGroupNames.forEach(groupName => {
      const emoji = groupName.match(/^[^\w\s]/)?.[0] || '';
      const cleanName = groupName.replace(/^[^\w\s]\s*/, '');
      options.push({
        value: `header_${groupName}`,
        label: `${emoji} ${cleanName.toUpperCase()}`,
        disabled: true
      });

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
    cnpj: '',
    cpf: '',
    profession: '',
    specializations: [],
    address: '',
    years_experience: '',
    google_maps_link: '',
    business_hours: '',
    personal_description: '',
    city: '',
    state: ''
  });

  // Pré-preencher cidade e estado do perfil do usuário quando disponível
  useEffect(() => {
    if (user?.city || user?.state) {
      setFormData(prev => ({
        ...prev,
        city: user.city || '',
        state: user.state || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    if (isLoadingAuth) return;

    if (!isAuthenticated || !user) {
      navigate('/login?returnUrl=/BecomeProfessional');
      return;
    }

    // Se já é profissional, redirecionar para o dashboard
    if (user.is_professional) {
      navigate('/ProfessionalDashboard');
      return;
    }

    // Verificar se já existe um registro de profissional para este usuário
    const checkExistingProfessional = async () => {
      try {
        const existingProfessional = await ProfessionalService.findByUserId(user.id);
        if (existingProfessional) {
          // Já existe um profissional, apenas marcar o usuário e redirecionar
          await markAsProfessional();
          showToast.success('Bem-vindo de volta!', 'Seu perfil profissional já existe.');
          navigate('/ProfessionalDashboard');
          return;
        }
      } catch (error) {
        // Ignorar erro e continuar com o fluxo normal
      }
      setLoading(false);
    };

    checkExistingProfessional();
  }, [user, isAuthenticated, isLoadingAuth, navigate, markAsProfessional]);

  const handleSubmit = async () => {
    if (!user?.id) {
      showToast.error('Erro: usuário não identificado', 'Por favor, faça login novamente.');
      return;
    }

    if (!formData.profession) {
      showToast.error('Erro', 'Selecione sua profissão principal.');
      return;
    }

    if (!formData.personal_description?.trim()) {
      showToast.error('Erro', 'Preencha sua descrição pessoal.');
      return;
    }

    if (!formData.city?.trim()) {
      showToast.error('Erro', 'Informe sua cidade.');
      return;
    }

    if (!formData.state) {
      showToast.error('Erro', 'Selecione seu estado.');
      return;
    }

    savingRef.current = true;
    setSaving(true);

    try {
      // Gerar código de referral
      const referralCode = generateReferralCode();

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

      // Criar perfil profissional
      const professionalData = {
        user_id: user.id,
        name: user.full_name,
        profession: formData.profession || 'outros',
        city: formData.city,
        state: formData.state,
        whatsapp: user.phone,
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

      await ProfessionalService.createWithAuth(professionalData);

      // Marcar usuário como profissional no AuthContext
      await markAsProfessional();

      // Processar indicação se este usuário foi indicado
      if (user.referred_by_code) {
        try {
          const referrerProfessional = await ProfessionalService.findByReferralCode(user.referred_by_code);
          if (referrerProfessional) {
            const referral = await ReferralService.createReferral(
              referrerProfessional.id,
              user.id,
              'profissional'
            );
            await ReferralService.completeReferral(referral.id);
          } else {
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

      showToast.success('Parabéns!', 'Seu perfil profissional foi criado com sucesso!');

      // Atualizar dados do usuário e redirecionar
      await refreshUserData();
      window.location.href = createPageUrl("ProfessionalDashboard");
    } catch (error) {
      // Verificar se é erro de conflito (profissional já existe)
      const errorMessage = error?.message || '';
      if (errorMessage.includes('409') || errorMessage.includes('duplicate') || errorMessage.includes('conflict')) {
        // Tentar apenas marcar como profissional e redirecionar
        try {
          await markAsProfessional();
          showToast.success('Bem-vindo de volta!', 'Seu perfil profissional já existe.');
          await refreshUserData();
          window.location.href = createPageUrl("ProfessionalDashboard");
          return;
        } catch (e) {
          // Continuar com o erro original
        }
      }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Virar Profissional</h1>
          <p className="text-slate-400 mt-2">Complete seu cadastro para oferecer seus serviços</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cidade *</Label>
                  <Input
                    placeholder="Sua cidade"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="h-12 mt-1"
                    required
                  />
                </div>
                <div>
                  <Label>Estado *</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => setFormData({ ...formData, state: value })}
                  >
                    <SelectTrigger className="h-12 mt-1">
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRAZILIAN_STATES.map(uf => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Endereço Completo</Label>
                <Input
                  placeholder="Rua, número, bairro"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="h-12 mt-1"
                />
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
                onClick={() => navigate(-1)}
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
                  !formData.city?.trim() ||
                  !formData.state ||
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
                    Criar Perfil Profissional
                    <CheckCircle className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Após criar seu perfil, você poderá alternar entre modo Cliente e Profissional a qualquer momento.
        </p>
      </div>
    </div>
  );
}
