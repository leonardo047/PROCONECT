import React, { useState, useEffect } from 'react';
import { useAuth } from "@/lib/AuthContext";
import { ClientSubscription, ClientSubscriptionService, PlanConfig, User, generateReferralCode } from "@/lib/entities";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/componentes/interface do usuário/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/interface do usuário/card";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Input } from "@/componentes/interface do usuário/input";
import { Label } from "@/componentes/interface do usuário/label";
import {
  CreditCard, CheckCircle, Clock, Search,
  Loader2, Star, Calendar, User as UserIcon, Save,
  Share2, Gift, Copy, MessageCircle, Users, XCircle
} from "lucide-react";
import MercadoPagoCheckout from "@/componentes/pagamento/MercadoPagoCheckout";
import CancelSubscriptionDialog from "@/componentes/assinatura/CancelSubscriptionDialog";
import AvatarUpload from "@/componentes/comum/AvatarUpload";
import { replaceFile, deleteFile, BUCKETS } from "@/lib/storage";

export default function ClientDashboard() {
  const { user, isLoadingAuth, isAuthenticated, navigateToLogin, refreshUserData } = useAuth();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Estado local para subscription - carregado via useEffect (não React Query)
  const [subscription, setSubscription] = useState(null);
  const [loadingSub, setLoadingSub] = useState(true);
  const [plans, setPlans] = useState([]);

  // Estado para perfil
  const [profileData, setProfileData] = useState({
    full_name: '',
    avatar_url: null
  });
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Estado local para referral_code (evita piscar durante recarregamentos)
  const [localReferralCode, setLocalReferralCode] = useState(null);

  useEffect(() => {
    // Só redirecionar se: não está carregando, não está autenticado, e não está já redirecionando
    if (!isLoadingAuth && !isAuthenticated && !redirecting) {
      setRedirecting(true);
      // Pequeno delay para evitar race conditions
      const timer = setTimeout(() => {
        navigateToLogin();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoadingAuth, isAuthenticated, navigateToLogin, redirecting]);

  // Carregar subscription diretamente quando user estiver disponível
  useEffect(() => {
    const loadSubscription = async () => {
      if (!user?.id) {
        setLoadingSub(false);
        return;
      }

      try {
        const results = await ClientSubscription.filter({
          filters: { user_id: user.id, is_active: true }
        });
        setSubscription(results[0] || null);
      } catch (error) {
        setSubscription(null);
      } finally {
        setLoadingSub(false);
      }
    };

    // Sempre chamar loadSubscription - ela vai verificar se tem user.id
    loadSubscription();
  }, [user?.id]);

  // Carregar planos (não depende de user)
  useEffect(() => {
    const loadPlans = async () => {
      try {
        const plansData = await PlanConfig.list();
        setPlans(plansData || []);
      } catch (error) {
        setPlans([]);
      }
    };
    loadPlans();
  }, []);

  // Carregar dados do perfil
  useEffect(() => {
    if (user) {
      setProfileData({
        full_name: user.full_name || '',
        avatar_url: user.avatar_url || null
      });
      // Atualizar referral_code local se user tem um (evita piscar)
      if (user.referral_code) {
        setLocalReferralCode(user.referral_code);
      }
    }
  }, [user]);

  // Gerar código de referral se não existir (para usuários antigos)
  useEffect(() => {
    const generateReferralCodeIfNeeded = async () => {
      // Só gerar se: tem user.id, não tem código (nem local nem no user), e é cliente
      if (user?.id && !user?.referral_code && !localReferralCode && user?.user_type === 'cliente') {
        try {
          const newCode = generateReferralCode();

          // Atualizar estado local imediatamente (evita múltiplas gerações)
          setLocalReferralCode(newCode);

          await User.update(user.id, {
            referral_code: newCode,
            referral_credits: user.referral_credits || 0,
            total_referrals: user.total_referrals || 0
          });
          // Recarregar dados do usuário
          if (refreshUserData) {
            await refreshUserData();
          }
        } catch (error) {
          // Ignorar erro
        }
      }
    };
    generateReferralCodeIfNeeded();
  }, [user?.id, user?.referral_code, user?.user_type, localReferralCode, refreshUserData]);

  // Salvar perfil
  const handleSaveProfile = async () => {
    if (!user?.id) return;

    setSavingProfile(true);
    setProfileSuccess(false);

    try {
      let avatarUrl = profileData.avatar_url;

      // Se há um arquivo de avatar pendente, fazer upload e deletar o antigo
      if (pendingAvatarFile) {
        // Usa replaceFile para fazer upload do novo e deletar o antigo automaticamente
        avatarUrl = await replaceFile(pendingAvatarFile, user?.avatar_url, BUCKETS.AVATARS);
      }

      await User.update(user.id, {
        full_name: profileData.full_name,
        avatar_url: avatarUrl
      });
      setPendingAvatarFile(null); // Limpar arquivo pendente
      setProfileData(prev => ({ ...prev, avatar_url: avatarUrl })); // Atualizar URL no estado
      setProfileSuccess(true);
      // Atualizar contexto de auth
      if (refreshUserData) {
        await refreshUserData();
      }
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (error) {
      alert('Erro ao salvar perfil. Tente novamente.');
    } finally {
      setSavingProfile(false);
    }
  };

  const isSubscriptionValid = () => {
    if (!subscription) return false;
    if (subscription.plan_type === 'vitalicio') return true;
    if (subscription.expires_at && new Date(subscription.expires_at) > new Date()) return true;
    return false;
  };

  const isSubscriptionCancelled = () => {
    return subscription?.cancelled_at !== null && subscription?.cancelled_at !== undefined;
  };

  const handleCancelSubscription = async ({ reason, feedback }) => {
    if (!subscription?.id) return;

    setCancellingSubscription(true);
    try {
      await ClientSubscriptionService.cancelSubscription(subscription.id, { reason, feedback });
      // Recarregar subscription
      const results = await ClientSubscription.filter({
        filters: { user_id: user.id, is_active: true }
      });
      setSubscription(results[0] || null);
    } catch (error) {
      throw error;
    } finally {
      setCancellingSubscription(false);
    }
  };

  const handleReactivateSubscription = async () => {
    if (!subscription?.id) return;

    try {
      await ClientSubscriptionService.reactivateSubscription(subscription.id);
      // Recarregar subscription
      const results = await ClientSubscription.filter({
        filters: { user_id: user.id, is_active: true }
      });
      setSubscription(results[0] || null);
    } catch (error) {
      alert('Erro ao reativar assinatura. Tente novamente.');
    }
  };

  // Mostrar loading APENAS enquanto verifica autenticação inicial
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

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Minha Conta</h1>
          <p className="text-slate-600">Gerencie sua assinatura e acesso aos profissionais</p>
        </div>

        {/* Profile Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              Meu Perfil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <AvatarUpload
                  currentAvatarUrl={profileData.avatar_url}
                  fallbackName={profileData.full_name || user?.email}
                  pendingFile={pendingAvatarFile}
                  onFileSelect={async (file) => {
                    if (file === null) {
                      // Usuário quer remover o avatar
                      setPendingAvatarFile(null);
                      setProfileData(prev => ({ ...prev, avatar_url: null }));

                      // Se tinha avatar no banco, deletar do storage e salvar
                      if (user?.avatar_url) {
                        try {
                          await deleteFile(user.avatar_url, BUCKETS.AVATARS);
                        } catch (error) {
                          // Ignorar erro de deleção
                        }

                        // Salvar no banco
                        try {
                          await User.update(user.id, { avatar_url: null });
                          if (refreshUserData) await refreshUserData();
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
                  uploading={savingProfile}
                />
              </div>

              {/* Form */}
              <div className="flex-1 space-y-4 w-full">
                <div>
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <Input
                    id="full_name"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Seu nome completo"
                  />
                </div>

                <div>
                  <Label>E-mail</Label>
                  <Input
                    value={user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">O e-mail não pode ser alterado</p>
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {savingProfile ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {savingProfile ? 'Salvando...' : 'Salvar Perfil'}
                </Button>

                {profileSuccess && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Perfil salvo com sucesso!
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Free Contacts Status */}
        <Card className="mb-8 border-2 border-green-300 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center bg-green-100">
                  <Star className="w-7 h-7 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Contatos Gratuitos</p>
                  <p className="text-3xl font-bold text-green-700">
                    {(user?.free_contacts_limit || 3) - (user?.free_contacts_used || 0)} / {user?.free_contacts_limit || 3}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    {(user?.free_contacts_used || 0) >= (user?.free_contacts_limit || 3)
                      ? 'Contatos gratuitos esgotados'
                      : 'Restantes para usar'}
                  </p>
                </div>
              </div>
              <Badge className="bg-green-500">Grátis</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Current Status */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  isSubscriptionValid() ? 'bg-green-100' : 'bg-slate-100'
                }`}>
                  {isSubscriptionValid() ? (
                    <CheckCircle className="w-7 h-7 text-green-600" />
                  ) : (
                    <Clock className="w-7 h-7 text-slate-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-600">Plano Pago Ativo</p>
                  <p className="text-xl font-bold text-slate-900">
                    {loadingSub ? 'Carregando...' : (isSubscriptionValid() ? 'Acesso Ilimitado' : 'Nenhum')}
                  </p>
                  {subscription?.plan_type === 'diario' && subscription?.expires_at && (
                    <p className="text-sm text-slate-500 mt-1">
                      Expira em: {new Date(subscription.expires_at).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>

              {isSubscriptionValid() && (
                <Badge className="bg-green-500">Ativo</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card className="mb-8 border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-3">Como Funciona</h3>
            <ul className="space-y-2 text-slate-700">
              <li className="flex items-start gap-2">
                <span className="font-bold text-green-600 mt-1">1.</span>
                <span>Você tem <strong>3 contatos gratuitos</strong> para testar</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-orange-600 mt-1">2.</span>
                <span>Depois, pague <strong>R$ 3,69 por 24 horas</strong> de acesso ilimitado</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600 mt-1">3.</span>
                <span>Busque, compare e entre em contato com quantos profissionais quiser!</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Seus Links - Seção de Indicação */}
        {(localReferralCode || user?.referral_code) && (
          <Card className="mb-8 border-2 border-green-300 bg-gradient-to-br from-green-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Share2 className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Seus Links</h3>
                  <p className="text-slate-600 mb-4">
                    Indique amigos e ganhe creditos para usar na plataforma!
                  </p>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <div className="flex items-center gap-2">
                        <Gift className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="text-xs text-slate-500">Creditos</p>
                          <p className="text-xl font-bold text-green-600">{user?.referral_credits || 0}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="text-xs text-slate-500">Indicacoes</p>
                          <p className="text-xl font-bold text-blue-600">{user?.total_referrals || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Link de Indicação */}
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Gift className="w-4 h-4 text-green-500" />
                      <p className="text-sm text-slate-700 font-semibold">Link de Indicacao</p>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">+1 credito</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-3">
                      Compartilhe e ganhe 1 credito para cada pessoa que se cadastrar!
                    </p>
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}/?ref=${localReferralCode || user?.referral_code}`}
                        className="flex-1 bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm font-mono"
                        onClick={(e) => e.target.select()}
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/?ref=${localReferralCode || user?.referral_code}`);
                          alert('Link copiado!');
                        }}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-green-600 border-green-300 hover:bg-green-50"
                      onClick={() => {
                        const code = localReferralCode || user?.referral_code;
                        const text = `Ola! Estou usando o ConectPro para encontrar profissionais de obra e reforma. Cadastre-se tambem usando meu link e ganhe contatos gratuitos: ${window.location.origin}/?ref=${code}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                      }}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Compartilhar no WhatsApp
                    </Button>
                  </div>

                  {/* Como funciona */}
                  <div className="mt-4 bg-slate-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-slate-700 mb-2">Como funciona:</p>
                    <ul className="text-xs text-slate-600 space-y-1">
                      <li>• Compartilhe seu link com amigos</li>
                      <li>• Quando eles se cadastrarem, voce ganha 1 credito</li>
                      <li>• Use creditos para ganhar contatos gratuitos extras!</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plans */}
        <h2 className="text-xl font-bold text-slate-900 mb-4">
          {(loadingSub && user?.id) ? 'Carregando...' : (isSubscriptionValid() ? 'Seu Plano' : 'Planos Disponíveis')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8">
          {/* Loading State - só mostra se tem user e está carregando */}
          {(loadingSub && user?.id) ? (
            <Card className="border-2 border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                  <span className="ml-3 text-slate-600">Verificando seu plano...</span>
                </div>
              </CardContent>
            </Card>
          ) : (
          /* Daily Plan */
          <Card className={`border-2 transition-colors ${isSubscriptionValid() ? 'border-green-400 bg-green-50/30' : 'border-orange-300 hover:border-orange-500'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-slate-900">
                      {subscription?.plan_type === 'vitalicio' ? 'Acesso Vitalício' : 'Acesso de 1 Dia'}
                    </h3>
                    {isSubscriptionValid() && (
                      <span className="px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-full">
                        ATIVO
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600">
                    {subscription?.plan_type === 'vitalicio'
                      ? 'Contatos ilimitados para sempre'
                      : 'Contatos ilimitados por 24 horas'
                    }
                  </p>
                </div>
                <div className="text-right">
                  {isSubscriptionValid() ? (
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                  ) : (
                    <>
                      <p className="text-4xl font-bold text-orange-600">R$ 3,69</p>
                      <p className="text-sm text-slate-500">por 24 horas</p>
                    </>
                  )}
                </div>
              </div>

              {isSubscriptionValid() ? (
                <>
                  {/* Informações do plano ativo */}
                  <div className={`rounded-lg p-4 mb-4 ${isSubscriptionCancelled() ? 'bg-amber-100' : 'bg-green-100'}`}>
                    <div className={`flex items-center gap-2 mb-2 ${isSubscriptionCancelled() ? 'text-amber-800' : 'text-green-800'}`}>
                      {isSubscriptionCancelled() ? (
                        <>
                          <XCircle className="w-5 h-5" />
                          <span className="font-semibold">Cancelamento agendado</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-semibold">Plano ativo!</span>
                        </>
                      )}
                    </div>
                    {subscription?.plan_type === 'diario' && subscription?.expires_at && (
                      <p className={`text-sm ${isSubscriptionCancelled() ? 'text-amber-700' : 'text-green-700'}`}>
                        <Clock className="w-4 h-4 inline mr-1" />
                        {isSubscriptionCancelled() ? 'Acesso ate:' : 'Valido ate:'} {new Date(subscription.expires_at).toLocaleString('pt-BR')}
                      </p>
                    )}
                    {subscription?.plan_type === 'vitalicio' && (
                      <p className="text-sm text-green-700">
                        Acesso permanente - sem data de expiracao
                      </p>
                    )}
                    {isSubscriptionCancelled() && (
                      <p className="text-xs text-amber-600 mt-2">
                        Voce ainda pode usar o plano ate a data acima. Apos isso, o acesso sera encerrado.
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      Contatos ilimitados {subscription?.plan_type === 'vitalicio' ? 'para sempre' : 'por 24h'}
                    </li>
                    <li className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      WhatsApp direto dos profissionais
                    </li>
                    <li className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      Busca e filtros avancados
                    </li>
                  </ul>

                  <div className="space-y-3">
                    <Link to={createPageUrl("SearchProfessionals")}>
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg font-semibold"
                      >
                        <Search className="w-5 h-5 mr-2" />
                        Buscar Profissionais Agora
                      </Button>
                    </Link>

                    {/* Botao de cancelar/reativar - apenas para planos nao vitalicios */}
                    {subscription?.plan_type !== 'vitalicio' && (
                      isSubscriptionCancelled() ? (
                        <Button
                          variant="outline"
                          className="w-full text-green-600 border-green-300 hover:bg-green-50"
                          onClick={handleReactivateSubscription}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Reativar Assinatura
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          className="w-full text-slate-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setCancelDialogOpen(true)}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Cancelar Assinatura
                        </Button>
                      )
                    )}
                  </div>
                </>
              ) : (
                <>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-2 text-slate-700">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      Contatos ilimitados por 24h
                    </li>
                    <li className="flex items-center gap-2 text-slate-700">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      WhatsApp direto dos profissionais
                    </li>
                    <li className="flex items-center gap-2 text-slate-700">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      Sem compromisso ou renovação automática
                    </li>
                    <li className="flex items-center gap-2 text-slate-700">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      Acesso imediato após pagamento
                    </li>
                  </ul>

                  <Button
                    className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-lg font-semibold"
                    onClick={() => setCheckoutOpen(true)}
                  >
                    <CreditCard className="w-5 h-5 mr-2" />
                    Ativar Acesso por 24h
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
          )}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link to={createPageUrl("SearchProfessionals")}>
                <Button variant="outline" className="w-full h-auto py-4 justify-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Search className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">Buscar Profissionais</p>
                    <p className="text-sm text-slate-500">Encontre o profissional ideal</p>
                  </div>
                </Button>
              </Link>

              <Link to={createPageUrl("Home")}>
                <Button variant="outline" className="w-full h-auto py-4 justify-start gap-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">Ver Categorias</p>
                    <p className="text-sm text-slate-500">Explore todas as categorias</p>
                  </div>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Checkout Modal */}
      <MercadoPagoCheckout
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        planKey="cliente_diario"
        planName="Acesso de 1 Dia - Contatos Ilimitados"
        planPrice={3.69}
        onSuccess={async () => {
          // Recarregar subscription após pagamento bem-sucedido
          if (user?.id) {
            try {
              const results = await ClientSubscription.filter({
                filters: { user_id: user.id, is_active: true }
              });
              setSubscription(results[0] || null);
            } catch (error) {
              // Ignorar erro
            }
          }
        }}
      />

      {/* Cancel Subscription Dialog */}
      <CancelSubscriptionDialog
        isOpen={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onConfirm={handleCancelSubscription}
        subscriptionType="client"
        planName={subscription?.plan_type === 'vitalicio' ? 'Acesso Vitalicio' : 'Acesso de 1 Dia'}
        expiresAt={subscription?.expires_at}
        isLoading={cancellingSubscription}
      />
    </div>
  );
}
