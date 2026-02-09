import React, { useState, useEffect } from 'react';
import { useAuth } from "@/lib/AuthContext";
import { User, generateReferralCode } from "@/lib/entities";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/componentes/interface do usuário/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/interface do usuário/card";
import { Input } from "@/componentes/interface do usuário/input";
import { Label } from "@/componentes/interface do usuário/label";
import {
  CheckCircle, Search,
  Loader2, Calendar, User as UserIcon, Save,
  Share2, Gift, Copy, MessageCircle, Users, Briefcase
} from "lucide-react";
import AvatarUpload from "@/componentes/comum/AvatarUpload";
import { replaceFile, deleteFile, BUCKETS } from "@/lib/storage";
import { showToast } from "@/utils/showToast";

export default function ClientDashboard() {
  const { user, isLoadingAuth, isAuthenticated, navigateToLogin, refreshUserData } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

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
      showToast.error('Erro ao salvar perfil', 'Tente novamente.');
    } finally {
      setSavingProfile(false);
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
          <p className="text-slate-600">Gerencie seu perfil e encontre profissionais</p>
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

        {/* Acesso Gratuito Info */}
        <Card className="mb-8 border-2 border-green-300 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 mb-2">Acesso Gratuito</h3>
                <p className="text-slate-600 mb-4">
                  Você tem acesso completo à plataforma! Busque profissionais, veja portfólios e entre em contato sem nenhum custo.
                </p>
                <ul className="space-y-2 text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Busca ilimitada de profissionais
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Visualização de portfólios completos
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Contato direto via WhatsApp ou plataforma
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Solicitação de orçamentos gratuita
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seus Links - Seção de Indicação */}
        {(localReferralCode || user?.referral_code) && (
          <Card className="mb-8 border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Share2 className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Indique Amigos</h3>
                  <p className="text-slate-600 mb-4">
                    Compartilhe a plataforma com amigos que precisam de profissionais de obra!
                  </p>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="flex items-center gap-2">
                        <Gift className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="text-xs text-slate-500">Indicações</p>
                          <p className="text-xl font-bold text-blue-600">{user?.total_referrals || 0}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="text-xs text-slate-500">Cadastrados</p>
                          <p className="text-xl font-bold text-green-600">{user?.total_referrals || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Link de Indicação */}
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Gift className="w-4 h-4 text-blue-500" />
                      <p className="text-sm text-slate-700 font-semibold">Seu Link de Indicação</p>
                    </div>
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
                          showToast.success('Link copiado!');
                        }}
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-blue-600 border-blue-300 hover:bg-blue-50"
                      onClick={() => {
                        const code = localReferralCode || user?.referral_code;
                        const text = `Olá! Estou usando o ConectPro para encontrar profissionais de obra e reforma. Cadastre-se também: ${window.location.origin}/?ref=${code}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                      }}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Compartilhar no WhatsApp
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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

              {/* Botão Virar Profissional - só aparece se não é profissional */}
              {!user?.is_professional && (
                <Link to={createPageUrl("BecomeProfessional")} className="md:col-span-2">
                  <Button variant="outline" className="w-full h-auto py-4 justify-start gap-4 border-orange-300 hover:border-orange-500 hover:bg-orange-50">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-orange-700">Virar Profissional</p>
                      <p className="text-sm text-slate-500">Ofereça seus serviços na plataforma</p>
                    </div>
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
