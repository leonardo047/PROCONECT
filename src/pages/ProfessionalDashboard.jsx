import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/lib/AuthContext";
import { Professional, PlanConfig, ProfessionalService, ProfessionalPlanService, Category, PricingPlanService } from "@/lib/entities";
import { replaceFile, deleteFile, BUCKETS } from "@/lib/storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Label } from "@/componentes/interface do usuário/label";
import { Textarea } from "@/componentes/interface do usuário/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/interface do usuário/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/interface do usuário/card";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentes/interface do usuário/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/interface do usuário/dialog";
import {
  User, Save, Loader2, AlertCircle, CheckCircle,
  CreditCard, Clock, Sparkles,
  Gift, Users, Share2, Copy, MessageCircle, Briefcase,
  FileText, Calendar, FolderOpen, Pencil, XCircle
} from "lucide-react";
import MercadoPagoCheckout from "@/componentes/pagamento/MercadoPagoCheckout";
import CancelSubscriptionDialog from "@/componentes/assinatura/CancelSubscriptionDialog";
import JobOpportunityManager from "@/componentes/profissional/JobOpportunityManager";
import PortfolioManager from "@/componentes/profissional/PortfolioManager";
import AvatarUpload from "@/componentes/comum/AvatarUpload";
import CreditStatusCard from "@/componentes/profissional/CreditStatusCard";
import BuyCreditsModal from "@/componentes/profissional/BuyCreditsModal";
import { showToast } from "@/utils/showToast";

const states = [
  { value: "AC", label: "Acre" }, { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapa" }, { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" }, { value: "CE", label: "Ceara" },
  { value: "DF", label: "Distrito Federal" }, { value: "ES", label: "Espirito Santo" },
  { value: "GO", label: "Goias" }, { value: "MA", label: "Maranhao" },
  { value: "MT", label: "Mato Grosso" }, { value: "MS", label: "Mato Grossó do Sul" },
  { value: "MG", label: "Minas Gerais" }, { value: "PA", label: "Para" },
  { value: "PB", label: "Paraiba" }, { value: "PR", label: "Parana" },
  { value: "PE", label: "Pernambuco" }, { value: "PI", label: "Piaui" },
  { value: "RJ", label: "Rio de Janeiro" }, { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" }, { value: "RO", label: "Rondonia" },
  { value: "RR", label: "Roraima" }, { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "Sao Paulo" }, { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" }
];

export default function ProfessionalDashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, isLoadingAuth, isAuthenticated, navigateToLogin, professional: authProfessional } = useAuth();
  const [formData, setFormData] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [portfolioDialogOpen, setPortfolioDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingPlan, setCancellingPlan] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null); // Arquivo de avatar aguardando upload
  const [buyCreditsOpen, setBuyCreditsOpen] = useState(false); // Modal de compra de créditos

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated && !redirecting) {
      setRedirecting(true);
      const timer = setTimeout(() => {
        navigateToLogin();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoadingAuth, isAuthenticated, navigateToLogin, redirecting]);

  // Usar React Query para carregar o professional - mais robusto e com cache
  const {
    data: queryProfessional,
    isLoading: loadingProfessional,
    isError: queryError,
    refetch: refetchProfessional
  } = useQuery({
    queryKey: ['my-professional', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      // Aguardar um pouco para garantir que a sessão está pronta
      await new Promise(resolve => setTimeout(resolve, 200));
      return ProfessionalService.findByUserId(user.id);
    },
    enabled: !!user?.id && isAuthenticated && !isLoadingAuth,
    staleTime: 30000, // 30 segundos
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 3000),
    // Se já temos do AuthContext, usar como initialData
    initialData: authProfessional || undefined,
  });

  // Combinar professional do AuthContext com o do React Query
  const professional = authProfessional ?? queryProfessional ?? null;

  // Loading se ainda está carregando auth OU carregando professional
  const effectiveLoading = isLoadingAuth || (loadingProfessional && !professional);


  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => PlanConfig.list()
  });

  // Buscar categorias (profissões) do banco
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['dashboard-categories'],
    queryFn: () => Category.filter({
      filters: { is_active: true },
      orderBy: { field: 'order', direction: 'asc' },
      limit: 500
    }),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Buscar preços do banco de dados
  const { data: subscriptionPlan } = useQuery({
    queryKey: ['subscription-plan-price'],
    queryFn: () => PricingPlanService.getSubscriptionPlan(),
    staleTime: 5 * 60 * 1000,
  });

  // Preços dinâmicos (com fallback)
  const creditPrice = 3.69; // Preço por crédito individual
  const subscriptionPrice = subscriptionPlan?.price ? parseFloat(subscriptionPlan.price) : 3.69;

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
    const sortedGroupNamês = Object.keys(groups).sort((a, b) => {
      const homeGroups = ['Construção', 'Elétrica/Hidráulica', 'Limpeza/Jardim', 'Madeira/Metal', 'Projetos'];
      const aIsHome = homeGroups.some(g => a.includes(g));
      const bIsHome = homeGroups.some(g => b.includes(g));
      if (aIsHome && !bIsHome) return -1;
      if (!aIsHome && bIsHome) return 1;
      return a.localeCompare(b);
    });

    // Adicionar cada grupo com header
    sortedGroupNamês.forEach(groupName => {
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

  useEffect(() => {
    if (professional && !formData) {
      setFormData({
        name: professional.name || '',
        company_name: professional.company_name || '',
        profession: professional.profession || 'outros',
        city: professional.city || '',
        state: professional.state || '',
        description: professional.description || '',
        personal_description: professional.personal_description || '',
        whatsapp: professional.whatsapp || '',
        instagram: professional.instagram || '',
        video_url: professional.video_url || '',
        availability_status: professional.availability_status || 'available_today',
        avatar_url: professional.avatar_url || null
      });
    } else if (!professional && !effectiveLoading && !formData) {
      // Se não tem professional ainda, setar valores padrão
      setFormData({
        name: user?.full_name || '',
        company_name: '',
        profession: 'outros',
        city: '',
        state: '',
        description: '',
        personal_description: '',
        whatsapp: '',
        instagram: '',
        video_url: '',
        availability_status: 'available_today',
        avatar_url: null
      });
    }
  }, [professional, effectiveLoading, user]);

  // Função para atualizar status de disponibilidade com feedback imediato
  const updateAvailabilityStatus = async (newStatus) => {
    // Atualiza estado local imediatamente para feedback visual
    setFormData(prev => ({ ...prev, availability_status: newStatus }));

    // Salva diretamente no banco (sem depender do formData que pode estar desatualizado)
    try {
      await Professional.update(professional.id, { availability_status: newStatus });
      queryClient.invalidateQueries({ queryKey: ['my-professional'] });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      let avatarUrl = data.avatar_url;

      // Se há um arquivo de avatar pendente, fazer upload e deletar o antigo
      if (pendingAvatarFile) {
        try {
          // Usa replaceFile para fazer upload do novo e deletar o antigo automaticamente
          avatarUrl = await replaceFile(pendingAvatarFile, professional?.avatar_url, BUCKETS.AVATARS);
        } catch (error) {
          throw new Error('Erro ao enviar foto de perfil: ' + error.message);
        }
      }

      const isComplete = Boolean(data.name && data.profession && data.city &&
        data.state && data.whatsapp);

      await Professional.update(professional.id, {
        ...data,
        avatar_url: avatarUrl,
        profile_complete: isComplete
      });

      // Retorna a nova URL do avatar para usar no onSuccess
      return { avatarUrl };
    },
    onSuccess: (result) => {
      setPendingAvatarFile(null); // Limpar arquivo pendente após sucesso
      // Atualizar o formData com a nova URL do avatar
      if (result?.avatarUrl) {
        setFormData(prev => ({ ...prev, avatar_url: result.avatarUrl }));
      }
      queryClient.invalidateQueries({ queryKey: ['my-professional'] });
      showToast.success('Alterações salvas', 'Seu perfil foi atualizado com sucesso.');
    },
    onError: (error) => {
      console.error('Erro ao salvar perfil:', error);
      showToast.error('Erro ao salvar', error?.message || 'Não foi possível salvar as alterações. Tente novamente.');
    }
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const isPlanCancelled = () => {
    return professional?.plan_cancelled_at !== null && professional?.plan_cancelled_at !== undefined;
  };

  const handleCancelPlan = async ({ reason, feedback }) => {
    if (!professional?.id) return;

    setCancellingPlan(true);
    try {
      await ProfessionalPlanService.cancelPlan(professional.id, { reason, feedback });
      // Recarregar professional
      queryClient.invalidateQueries({ queryKey: ['my-professional'] });
    } catch (error) {
      throw error;
    } finally {
      setCancellingPlan(false);
    }
  };

  const handleReactivatePlan = async () => {
    if (!professional?.id) return;

    try {
      await ProfessionalPlanService.reactivatePlan(professional.id);
      // Recarregar professional
      queryClient.invalidateQueries({ queryKey: ['my-professional'] });
    } catch (error) {
      showToast.error('Erro ao reativar plano', 'Tente novamente.');
    }
  };

  // Mostrar loading enquanto verifica autenticação inicial
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  // Se não está autenticado, redirecionar (o useEffect cuida disso)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  // Se não tem professional e não está carregando, redirecionar para BecomeProfessional
  // Isso significa que o registro de profissional não existe no banco
  if (!professional && !loadingProfessional && !effectiveLoading) {
    window.location.href = '/BecomeProfessional';
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  // Se houve erro na query, mostrar mensagem com botão de retry
  if (queryError && !professional) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Erro ao Carregar Dados</h2>
            <p className="text-slate-600 mb-6">
              Ocorreu um erro ao carregar seu perfil profissional. Tente novamente.
            </p>
            <Button
              onClick={() => refetchProfessional()}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  if (!formData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  const profPlan = plans.find(p =>
    p.plan_key === (professional.plan_type === 'completo' ? 'profissional_completo' : 'profissional_iniciante')
  );

  const isProfileComplete = formData.name && formData.profession && formData.city &&
    formData.state && formData.whatsapp;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Meu Painel</h1>
          <p className="text-slate-600">Gerencie seu perfil profissional</p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  professional.plan_active ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {professional.plan_active ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-600">Status do Plano</p>
                  <p className="font-semibold">
                    {professional.plan_active ? 'Ativo' : 'Inativo'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isProfileComplete ? 'bg-green-100' : 'bg-orange-100'
                }`}>
                  {isProfileComplete ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <User className="w-5 h-5 text-orange-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-600">Perfil</p>
                  <p className="font-semibold">
                    {isProfileComplete ? 'Completo' : 'Incompleto'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Card de Créditos */}
        <div className="mb-8">
          <CreditStatusCard
            professionalId={professional?.id}
            onBuyCredits={() => setBuyCreditsOpen(true)}
          />
        </div>

        {/* Info Box e Link do Perfil - Profissionais Gratis */}
        {professional.plan_type === 'free' && (
          <>
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6 mb-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-lg text-green-900 mb-2">Perfil Gratuito Ativo!</p>
                  <p className="text-green-700 mb-3">
                    Seu perfil está visível e clientes podem te encontrar. Você só paga quando receber contatos!
                  </p>
                  <ul className="text-sm text-green-700 space-y-1.5">
                    <li>R$ {creditPrice.toFixed(2).replace('.', ',')} por contato (pague só quando necessário)</li>
                    <li>Ou assine por R$ {subscriptionPrice.toFixed(2).replace('.', ',')}/mês (créditos ilimitados)</li>
                    <li>Sem compromisso ou mensalidade fixa</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Seus Links - Para Profissionais Gratis */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-8">
              <div className="flex items-start gap-3">
                <Share2 className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-bold text-lg text-blue-900 mb-2">Seus Links</p>
                  <p className="text-blue-700 mb-4">
                    Compartilhe seus links e ganhe créditos na plataforma!
                  </p>

                  {/* Link do Perfil */}
                  <div className="bg-white rounded-lg p-4 border border-blue-200 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-blue-500" />
                      <p className="text-sm text-slate-700 font-semibold">Link do Perfil</p>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">Este é o perfil que clientes veem quando te encontram na busca.</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}/ProfessionalProfile?id=${professional.id}`}
                        className="flex-1 bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm font-mono"
                        onClick={(e) => e.target.select()}
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/ProfessionalProfile?id=${professional.id}`);
                          showToast.success('Link copiado!');
                        }}
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => window.open(`/ProfessionalProfile?id=${professional.id}`, '_blank')}
                      className="text-blue-600 p-0 h-auto mt-2"
                    >
                      Ver meu perfil →
                    </Button>
                  </div>

                  {/* Link de Indicação */}
                  {professional.referral_code && (
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Gift className="w-4 h-4 text-green-500" />
                        <p className="text-sm text-slate-700 font-semibold">Link de Indicação</p>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">+1 crédito por indicação</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">Compartilhe e ganhe 1 crédito para cada pessoa que se cadastrar!</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={`${window.location.origin}/?ref=${professional.referral_code}`}
                          className="flex-1 bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm font-mono"
                          onClick={(e) => e.target.select()}
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/?ref=${professional.referral_code}`);
                            showToast.success('Link copiado!');
                          }}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-green-600 border-green-300 hover:bg-green-50"
                          onClick={() => {
                            const text = `Ola! Estou usando o ConectPro para divulgar meus serviços. Cadastre-se também usando meu link: ${window.location.origin}/?ref=${professional.referral_code}`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                          }}
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          WhatsApp
                        </Button>
                        <div className="text-xs text-slate-500">
                          Créditos: <span className="font-bold text-green-600">{professional.referral_credits || 0}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Seus Links - Apenas para Assinantes */}
        {professional.plan_type !== 'free' && (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Share2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg text-purple-900 mb-2">Seus Links</p>
                <p className="text-purple-700 mb-4">
                  Compartilhe seus links e ganhe créditos na plataforma!
                </p>

                {/* Link do Portfolio */}
                <div className="bg-white rounded-lg p-4 border border-purple-200 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <p className="text-sm text-slate-700 font-semibold">Link do Portfolio</p>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">Este é o perfil que clientes veem quando te encontram na busca.</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/Portfolio?id=${professional.id}`}
                      className="flex-1 bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm font-mono"
                      onClick={(e) => e.target.select()}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/Portfolio?id=${professional.id}`);
                        showToast.success('Link copiado!');
                      }}
                      className="bg-purple-500 hover:bg-purple-600"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => window.open(`/Portfolio?id=${professional.id}`, '_blank')}
                    className="text-purple-600 p-0 h-auto mt-2"
                  >
                    Ver meu portfolio →
                  </Button>
                </div>

                {/* Link de Indicação */}
                {professional.referral_code && (
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Gift className="w-4 h-4 text-green-500" />
                      <p className="text-sm text-slate-700 font-semibold">Link de Indicação</p>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">+1 crédito por indicação</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">Compartilhe e ganhe 1 crédito para cada pessoa que se cadastrar!</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}/?ref=${professional.referral_code}`}
                        className="flex-1 bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm font-mono"
                        onClick={(e) => e.target.select()}
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/?ref=${professional.referral_code}`);
                          showToast.success('Link copiado!');
                        }}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-green-600 border-green-300 hover:bg-green-50"
                        onClick={() => {
                          const text = `Ola! Estou usando o ConectPro para divulgar meus serviços. Cadastre-se também usando meu link: ${window.location.origin}/?ref=${professional.referral_code}`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                        }}
                      >
                        <MessageCircle className="w-4 h-4 mr-1" />
                        WhatsApp
                      </Button>
                      <div className="text-xs text-slate-500">
                        Créditos: <span className="font-bold text-green-600">{professional.referral_credits || 0}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bloco Serviços Realizados - Gratuito para todos */}
        <Card className="mb-8 border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-500">
                  <FolderOpen className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-slate-900">Meus Serviços Realizados</h3>
                    <Badge className="bg-green-100 text-green-700 border-0">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Gratuito
                    </Badge>
                  </div>
                  <p className="text-slate-600 mb-2">
                    Mostre seus melhores trabalhos e aumente sua taxa de conversão na plataforma
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-1 text-green-600 font-medium">
                      <CheckCircle className="w-4 h-4" />
                      <span>+40% conversão</span>
                    </div>
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-500">Até 3 projetos com 5 fotos cada</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => {
                  setPortfolioDialogOpen(true);
                }}
                className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Gerenciar Serviços
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Alert if profile not complete */}
        {!isProfileComplete && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800">Complete seu perfil para aparecer nas buscas</p>
                <p className="text-sm text-amber-700 mt-1">
                  Preencha todos os campos obrigatórios para que clientes possam te encontrar na plataforma.
                </p>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="bg-white shadow-sm border flex-wrap">
            <TabsTrigger value="account">Minha Conta</TabsTrigger>
            <TabsTrigger value="quotes">Orçamentos</TabsTrigger>
            <TabsTrigger value="reviews">Avaliacoes</TabsTrigger>
            <TabsTrigger value="schedule">Agenda</TabsTrigger>
            <TabsTrigger value="opportunities">Oportunidades</TabsTrigger>
            <TabsTrigger value="referrals">Indicacoes</TabsTrigger>
            <TabsTrigger value="plan">Meu Plano</TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-6">
            {/* Dados do Perfil */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Dados do Perfil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex flex-col md:flex-row gap-6 items-start pb-6 border-b">
                  <AvatarUpload
                    currentAvatarUrl={formData.avatar_url}
                    fallbackName={formData.name}
                    pendingFile={pendingAvatarFile}
                    onFileSelect={async (file) => {
                      if (file === null) {
                        // Usuário quer remover o avatar
                        setPendingAvatarFile(null);
                        setFormData({ ...formData, avatar_url: null });

                        // Se tinha avatar no banco, deletar do storage e salvar
                        if (professional?.avatar_url) {
                          try {
                            await deleteFile(professional.avatar_url, BUCKETS.AVATARS);
                          } catch (error) {
                            // Ignorar erro de deleção
                          }

                          // Salvar no banco
                          try {
                            await Professional.update(professional.id, { avatar_url: null });
                            queryClient.invalidateQueries({ queryKey: ['my-professional'] });
                          } catch (error) {
                            // Ignorar erro
                          }
                        }
                      } else {
                        // Usuário selecionou um novo arquivo
                        setPendingAvatarFile(file);
                      }
                    }}
                    size="xl"
                    uploading={saveMutation.isPending}
                  />
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900 mb-1">Foto de Perfil</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Está foto aparece nos resultados de busca e no seu perfil público.
                      Recomendamos uma foto profissional com boa iluminação.
                    </p>
                    <div className="text-xs text-muted-foreground">
                      Formatos: JPG, PNG, GIF, WebP | Tamanho máximo: 5 MB
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Seu Nome *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Seu nome completo"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Este nome será exibido no seu perfil
                    </p>
                  </div>

                  <div>
                    <Label>Nome da Empresa (opcional)</Label>
                    <Input
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      placeholder="Ex: JM Construções"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Deixe em branco se for autônomo
                    </p>
                  </div>

                  <div>
                    <Label>Profissao Principal *</Label>
                    <Select
                      value={formData.profession}
                      onValueChange={(value) => setFormData({ ...formData, profession: value })}
                      disabled={loadingCategories}
                    >
                      <SelectTrigger className="mt-1">
                        {loadingCategories ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Carregando...
                          </div>
                        ) : (
                          <SelectValue />
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
                    <Label>Estado *</Label>
                    <Select
                      value={formData.state}
                      onValueChange={(value) => setFormData({ ...formData, state: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
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
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>WhatsApp *</Label>
                    <Input
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      placeholder="(11) 99999-9999"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Instagram (opcional)</Label>
                    <Input
                      value={formData.instagram}
                      onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                      placeholder="@seuinstagram"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-orange-700 font-semibold">Descrição Pessoal *</Label>
                  <Textarea
                    value={formData.personal_description}
                    onChange={(e) => setFormData({ ...formData, personal_description: e.target.value })}
                    placeholder="Conte sobre você, sua história profissional, como você trabalha e o que te motiva..."
                    className="mt-1 min-h-[120px] border-orange-200 focus:border-orange-400"
                    required
                  />
                  <p className="text-xs text-orange-600 mt-1 font-medium">
                    * Campo obrigatório - Está descrição aparece em destaque no seu Portfolio para clientes conhecerem voce
                  </p>
                </div>

                <div>
                  <Label>Descrição do Serviço</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descreva seus serviços, especializações e diferenciais técnicos..."
                    className="mt-1 min-h-[100px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Status de Disponibilidade */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Status de Disponibilidade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">
                  Informe aos clientes sua disponibilidade atual. Issó ajuda a gerenciar expectativas.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={() => updateAvailabilityStatus('available_today')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.availability_status === 'available_today'
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-200 hover:border-green-300'
                    }`}
                  >
                    <CheckCircle className={`w-6 h-6 mx-auto mb-2 ${
                      formData.availability_status === 'available_today' ? 'text-green-500' : 'text-slate-400'
                    }`} />
                    <p className="text-sm font-medium">Disponivel Hoje</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateAvailabilityStatus('quotes_only')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.availability_status === 'quotes_only'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <FileText className={`w-6 h-6 mx-auto mb-2 ${
                      formData.availability_status === 'quotes_only' ? 'text-blue-500' : 'text-slate-400'
                    }`} />
                    <p className="text-sm font-medium">Somente Orçamento</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateAvailabilityStatus('busy')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.availability_status === 'busy'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-slate-200 hover:border-orange-300'
                    }`}
                  >
                    <Briefcase className={`w-6 h-6 mx-auto mb-2 ${
                      formData.availability_status === 'busy' ? 'text-orange-500' : 'text-slate-400'
                    }`} />
                    <p className="text-sm font-medium">Ocupado</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateAvailabilityStatus('returning_soon')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.availability_status === 'returning_soon'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-slate-200 hover:border-purple-300'
                    }`}
                  >
                    <Calendar className={`w-6 h-6 mx-auto mb-2 ${
                      formData.availability_status === 'returning_soon' ? 'text-purple-500' : 'text-slate-400'
                    }`} />
                    <p className="text-sm font-medium">Retorno em Breve</p>
                  </button>
                </div>

                <div className="bg-slate-50 rounded-lg p-3 mt-4">
                  <p className="text-sm text-slate-600">
                    <strong>Status atual:</strong>{' '}
                    {formData.availability_status === 'available_today' && 'Disponivel Hoje'}
                    {formData.availability_status === 'quotes_only' && 'Somente Orçamento'}
                    {formData.availability_status === 'busy' && 'Ocupado'}
                    {formData.availability_status === 'returning_soon' && 'Retorno em Breve'}
                    {!formData.availability_status && 'Nao definido'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Botao Salvar */}
            {!formData.personal_description?.trim() && (
              <p className="text-sm text-red-500 mb-2 text-center">
                Preencha a Descrição Pessoal para salvar seu perfil
              </p>
            )}
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending || !formData.personal_description?.trim()}
              size="lg"
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Todas as Alteracoes
            </Button>
          </TabsContent>

          <TabsContent value="quotes">
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-slate-600 mb-4">Responda pedidos de orçamento e ganhe mais clientes</p>
                <Button
                  onClick={() => navigate('/ProfessionalQuotes')}
                  className="bg-green-500 hover:bg-green-600"
                >
                  Ver Pedidos de Orçamento
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews">
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-slate-600 mb-4">Gerencie suas avaliações em uma página dedicada</p>
                <Button
                  onClick={() => navigate('/ProfessionalReviews')}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  Ver Todas as Avaliacoes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-slate-600 mb-4">Gerencie sua agenda e solicitações de orçamento</p>
                <Button
                  onClick={() => navigate('/ProfessionalSchedule')}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  Ver Minha Agenda
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="opportunities">
            <JobOpportunityManager
              professionalId={professional?.id}
              professional={professional}
            />
          </TabsContent>

          <TabsContent value="referrals">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-purple-600" />
                  Programa de Indicacoes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                        <Gift className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-purple-600 font-medium">Créditos Disponiveis</p>
                        <p className="text-3xl font-bold text-purple-900">
                          {professional.referral_credits || 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-blue-600 font-medium">Total de Indicacoes</p>
                        <p className="text-3xl font-bold text-blue-900">
                          {professional.total_referrals || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Referral Link */}
                {professional.referral_code && (
                  <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-6">
                    <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <Share2 className="w-4 h-4" />
                      Seu Link de Indicação
                    </h3>
                    <p className="text-sm text-slate-600 mb-4">
                      Compartilhe este link e ganhe 1 crédito para cada pessoa que se cadastrar!
                    </p>

                    <div className="flex items-center gap-2 mb-4">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}/?ref=${professional.referral_code}`}
                        className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
                        onClick={(e) => e.target.select()}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/?ref=${professional.referral_code}`);
                          showToast.success('Link copiado!');
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        className="flex-1 bg-green-500 hover:bg-green-600"
                        onClick={() => {
                          const text = `Ola! Estou usando o ConectPro para divulgar meus serviços. Cadastre-se também usando meu link: ${window.location.origin}/?ref=${professional.referral_code}`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                        }}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Compartilhar no WhatsApp
                      </Button>

                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          const text = `${window.location.origin}/?ref=${professional.referral_code}`;
                          navigator.clipboard.writeText(text);
                          showToast.success('Link copiado!');
                        }}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copiar Link
                      </Button>
                    </div>
                  </div>
                )}

                {/* How it works */}
                <div className="bg-slate-50 rounded-xl p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Como funciona?</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        1
                      </div>
                      <p className="text-slate-700">
                        Compartilhe seu link de indicação com amigos e colegas
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        2
                      </div>
                      <p className="text-slate-700">
                        Quando eles se cadastrarem usando seu link, você ganha 1 crédito
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        3
                      </div>
                      <p className="text-slate-700">
                        Use seus créditos para responder orçamentos de graca!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Credits available notice */}
                {(professional.referral_credits || 0) > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-green-800">
                          Você tem {professional.referral_credits} crédito{professional.referral_credits > 1 ? 's' : ''} disponível{professional.referral_credits > 1 ? 'is' : ''}!
                        </p>
                        <p className="text-sm text-green-700">
                          Use-os para responder orçamentos sem pagar a taxa.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plan">
            <Card>
              <CardHeader>
                <CardTitle>Meu Plano</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`rounded-xl p-6 mb-6 ${isPlanCancelled() ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-slate-600">Plano Atual</p>
                      <p className="text-xl font-bold text-slate-900">
                        {professional.plan_type === 'free' ? 'Gratuito' :
                         professional.plan_type === 'completo' ? 'Completo' :
                         professional.plan_type === 'portfolio_premium' ? 'Portfolio Premium' : 'Iniciante'}
                      </p>
                    </div>
                    {isPlanCancelled() ? (
                      <Badge variant="outline" className="border-amber-500 text-amber-700">
                        <XCircle className="w-3 h-3 mr-1" />
                        Cancelamento Agendado
                      </Badge>
                    ) : (
                      <Badge variant={professional.plan_active ? "default" : "secondary"}>
                        {professional.plan_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    )}
                  </div>

                  {professional.plan_expires_at && (
                    <p className={`text-sm ${isPlanCancelled() ? 'text-amber-700' : 'text-slate-600'}`}>
                      {isPlanCancelled() ? 'Acessó ate:' : 'Expira em:'} {new Date(professional.plan_expires_at).toLocaleDateString('pt-BR')}
                    </p>
                  )}

                  {isPlanCancelled() && (
                    <p className="text-xs text-amber-600 mt-2">
                      Você ainda pode usar o plano até a data acima. Após isso, os benefícios serão encerrados.
                    </p>
                  )}

                  {/* Botoes de cancelar/reativar */}
                  {professional.plan_type !== 'free' && professional.plan_active && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      {isPlanCancelled() ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 border-green-300 hover:bg-green-50"
                          onClick={handleReactivatePlan}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Reativar Plano
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setCancelDialogOpen(true)}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Cancelar Plano
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-xl p-6">
                    <h3 className="font-bold text-lg mb-2">Plano Iniciante</h3>
                    <p className="text-3xl font-bold text-orange-500 mb-2">
                      R$ 93,69
                      <span className="text-sm font-normal text-slate-600">/3 meses</span>
                    </p>
                    <ul className="text-sm text-slate-600 space-y-2 mb-4">
                      <li>Ate 10 fotos</li>
                      <li>Perfil na busca</li>
                      <li>Contato direto</li>
                      <li>3 meses de acesso</li>
                    </ul>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setSelectedPlan({
                          key: 'profissional_starter_3months',
                          name: 'Plano Iniciante - 3 meses',
                          price: 93.69
                        });
                        setCheckoutOpen(true);
                      }}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Assinar Iniciante
                    </Button>
                  </div>

                  <div className="border-2 border-orange-500 rounded-xl p-6 relative">
                    <Badge className="absolute -top-3 left-4 bg-orange-500">Mais Popular</Badge>
                    <h3 className="font-bold text-lg mb-2">Plano Profissional</h3>
                    <p className="text-3xl font-bold text-orange-500 mb-2">
                      R$ 69,90
                      <span className="text-sm font-normal text-slate-600">/mes</span>
                    </p>
                    <ul className="text-sm text-slate-600 space-y-2 mb-4">
                      <li>Fotos ilimitadas</li>
                      <li>Destaque na busca</li>
                      <li>Video do trabalho</li>
                      <li>Contato direto</li>
                      <li>Badge verificado</li>
                    </ul>
                    <Button
                      className="w-full bg-orange-500 hover:bg-orange-600"
                      onClick={() => {
                        setSelectedPlan({
                          key: 'profissional_monthly',
                          name: 'Plano Profissional - Mensal',
                          price: 69.90
                        });
                        setCheckoutOpen(true);
                      }}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Assinar Profissional
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Checkout Modal */}
      {selectedPlan && (
        <MercadoPagoCheckout
          isOpen={checkoutOpen}
          onClose={() => {
            setCheckoutOpen(false);
            setSelectedPlan(null);
          }}
          planKey={selectedPlan.key}
          planName={selectedPlan.name}
          planPrice={selectedPlan.price}
          professionalId={professional?.id}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['my-professional'] });
          }}
        />
      )}

      {/* Serviços Realizados Dialog */}
      <Dialog open={portfolioDialogOpen} onOpenChange={setPortfolioDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-blue-500" />
              Meus Serviços Realizados
            </DialogTitle>
          </DialogHeader>
          <PortfolioManager
            professionalId={professional?.id}
            professional={professional}
          />
        </DialogContent>
      </Dialog>

      {/* Cancel Plan Dialog */}
      <CancelSubscriptionDialog
        isOpen={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onConfirm={handleCancelPlan}
        subscriptionType="professional"
        planName={professional?.plan_type === 'completo' ? 'Plano Completo' :
                  professional?.plan_type === 'portfolio_premium' ? 'Portfolio Premium' : 'Plano Iniciante'}
        expiresAt={professional?.plan_expires_at}
        isLoading={cancellingPlan}
      />

      {/* Buy Credits Modal */}
      <BuyCreditsModal
        isOpen={buyCreditsOpen}
        onClose={() => setBuyCreditsOpen(false)}
        professionalId={professional?.id}
        currentBalance={professional?.credits_balance || 0}
      />
    </div>
  );
}
