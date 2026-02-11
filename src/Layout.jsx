import React, { useState, useCallback, memo } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { NotificationService, QuoteMessageService } from "@/lib/entities";
import { useQuery } from "@tanstack/react-query";
import { Search, User, LogOut, Menu, X,
  Shield, ChevronDown, Bell, FileText, MessageCircle, Briefcase, ArrowRightLeft
} from "lucide-react";
import { Button } from "@/componentes/interface do usuário/button";
import { Badge } from "@/componentes/interface do usuário/badge";
import NotificationPanel from "@/componentes/notificações/NotificationPanel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/componentes/interface do usuário/dropdown-menu";

// Componente Header otimizado com memo
const Header = memo(function Header({
  user,
  isAuthenticated,
  isLoadingAuth,
  currentPageName,
  onLogout,
  onLogin,
  onRegister,
  activeMode,
  onSwitchMode
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return NotificationService.getRecent(user.id, 50);
    },
    enabled: !!user,
    refetchInterval: 60000, // Reduzido para 1 minuto
    staleTime: 30000,
  });

  const { data: unreadMessages = 0 } = useQuery({
    queryKey: ['unread-messages', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      return QuoteMessageService.getTotalUnreadCount(user.id);
    },
    enabled: !!user,
    refetchInterval: 30000, // Atualizar a cada 30 segundos
    staleTime: 15000,
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev);
  }, []);

  const toggleNotifications = useCallback(() => {
    setNotificationsOpen(prev => !prev);
  }, []);

  const closeNotifications = useCallback(() => {
    setNotificationsOpen(false);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const isAdmin = user?.role === 'admin';
  // Usar activeMode para determinar qual menu mostrar
  // Admin não é tratado como profissional ou cliente - tem seu próprio menu
  const isProfessional = !isAdmin && activeMode === 'professional';
  const isClient = !isAdmin && activeMode === 'client';

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={createPageUrl("Home")} className="flex items-center gap-2">
            <img
              src="/logo.jpeg"
              alt="ConnectPro Logo"
              className="w-10 h-10 rounded-xl object-cover"
            />
            <span className="font-bold text-xl text-slate-800 hidden sm:block">
              ConnectPro
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to={createPageUrl("Home")}
              className={`text-sm font-medium transition-colors ${currentPageName === 'Home' ? 'text-orange-600' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Início
            </Link>
            <Link
              to={createPageUrl("SearchProfessionals")}
              className={`text-sm font-medium transition-colors ${currentPageName === 'SearchProfessionals' ? 'text-orange-600' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Buscar Profissionais
            </Link>
            <Link
              to={createPageUrl("JobOpportunities")}
              className={`text-sm font-medium transition-colors ${currentPageName === 'JobOpportunities' ? 'text-orange-600' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Vagas de Trabalho
            </Link>
            <Link
              to={createPageUrl("ServiceQuotes")}
              className={`text-sm font-medium transition-colors ${currentPageName === 'ServiceQuotes' ? 'text-orange-600' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Orçamento Serviços
            </Link>
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            {isLoadingAuth ? (
              <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
            ) : isAuthenticated && user ? (
              <>
                {/* Messages */}
                <Link to={createPageUrl("Conversations")} className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                  >
                    <MessageCircle className="w-5 h-5" />
                    {unreadMessages > 0 && (
                      <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-green-500 text-white text-xs">
                        {unreadMessages > 9 ? '9+' : unreadMessages}
                      </Badge>
                    )}
                  </Button>
                </Link>

                {/* Notifications */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleNotifications}
                    className="relative"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                  <NotificationPanel
                    isOpen={notificationsOpen}
                    onClose={closeNotifications}
                    userId={user?.id}
                  />
                </div>
              </>
            ) : null}

            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white text-sm font-medium">
                      {user.full_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-slate-700">
                      {user.full_name?.split(' ')[0] || 'Usuário'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2 border-b">
                    <p className="text-sm font-medium">{user.full_name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>

                  {isProfessional && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl("ProfessionalDashboard")} className="cursor-pointer">
                          <User className="w-4 h-4 mr-2" />
                          Meu Painel
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl("Conversations")} className="cursor-pointer">
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Conversas
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl("ProfessionalQuotes")} className="cursor-pointer">
                          <FileText className="w-4 h-4 mr-2" />
                          Orçamentos
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl("ProfessionalSchedule")} className="cursor-pointer">
                          <Bell className="w-4 h-4 mr-2" />
                          Minha Agenda
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  {isClient && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl("ClientDashboard")} className="cursor-pointer">
                          <User className="w-4 h-4 mr-2" />
                          Minha Conta
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl("Conversations")} className="cursor-pointer">
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Conversas
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl("ClientQuotes")} className="cursor-pointer">
                          <Search className="w-4 h-4 mr-2" />
                          Meus Orçamentos
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl("ClientAppointments")} className="cursor-pointer">
                          <Bell className="w-4 h-4 mr-2" />
                          Minhas Solicitações
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl("AdminDashboard")} className="cursor-pointer">
                        <Shield className="w-4 h-4 mr-2" />
                        Painel Admin
                      </Link>
                    </DropdownMenuItem>
                  )}

                  {/* Seção de alternância de modo */}
                  {!isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5">
                        <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                          <ArrowRightLeft className="w-3 h-3" />
                          Agir como:
                        </p>
                        <div className="flex gap-1">
                          <button
                            onClick={() => onSwitchMode('client')}
                            className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                              activeMode === 'client'
                                ? 'bg-blue-500 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <User className="w-3 h-3 inline mr-1" />
                            Cliente
                          </button>
                          <button
                            onClick={() => onSwitchMode('professional')}
                            className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                              activeMode === 'professional'
                                ? 'bg-orange-500 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <Briefcase className="w-3 h-3 inline mr-1" />
                            Profissional
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={onLogout} className="text-red-600 cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={onLogin}
                  className="hidden sm:flex"
                >
                  Entrar
                </Button>
                <Button
                  onClick={onRegister}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  Cadastrar
                </Button>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={toggleMobileMenu}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-white">
          <div className="px-4 py-3 space-y-1">
            <Link
              to={createPageUrl("Home")}
              onClick={closeMobileMenu}
              className="block px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100"
            >
              Início
            </Link>
            <Link
              to={createPageUrl("SearchProfessionals")}
              onClick={closeMobileMenu}
              className="block px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100"
            >
              Buscar Profissionais
            </Link>
            <Link
              to={createPageUrl("JobOpportunities")}
              onClick={closeMobileMenu}
              className="block px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100"
            >
              Vagas de Trabalho
            </Link>
            <Link
              to={createPageUrl("ServiceQuotes")}
              onClick={closeMobileMenu}
              className="block px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100"
            >
              Orçamento Serviços
            </Link>
            {isAuthenticated && (
              <Link
                to={createPageUrl("Conversations")}
                onClick={closeMobileMenu}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100"
              >
                <MessageCircle className="w-4 h-4 text-green-500" />
                Conversas
                {unreadMessages > 0 && (
                  <Badge className="bg-green-500 text-white text-xs">
                    {unreadMessages}
                  </Badge>
                )}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
});

// Footer otimizado com memo
const Footer = memo(function Footer() {
  return (
    <footer className="bg-slate-900 text-white py-12 mt-16">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo e Descrição */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img
                src="/logo.jpeg"
                alt="ConnectPro Logo"
                className="w-10 h-10 rounded-xl object-cover"
              />
              <span className="font-bold text-xl">ConnectPro</span>
            </div>
            <p className="text-slate-400 text-sm">
              Conectando você a profissionais locais de forma rápida, simples e inteligente.
            </p>
          </div>

          {/* Links Rápidos */}
          <div>
            <h4 className="font-semibold mb-4">Links Rápidos</h4>
            <div className="space-y-2 text-sm text-slate-400">
              <Link to={createPageUrl("Home")} className="block hover:text-white transition-colors">
                Início
              </Link>
              <Link to={createPageUrl("SearchProfessionals")} className="block hover:text-white transition-colors">
                Buscar Profissionais
              </Link>
              <Link to={createPageUrl("JobOpportunities")} className="block hover:text-white transition-colors">
                Vagas de Trabalho
              </Link>
              <Link to={createPageUrl("ServiceQuotes")} className="block hover:text-white transition-colors">
                Orçamento Serviços
              </Link>
              <Link to={createPageUrl("Onboarding")} className="block hover:text-white transition-colors">
                Sou Profissional
              </Link>
              <Link to={createPageUrl("RequestQuote")} className="block hover:text-white transition-colors">
                Solicitar Orçamento
              </Link>
            </div>
          </div>

          {/* Categorias Principais */}
          <div>
            <h4 className="font-semibold mb-4">Categorias Principais</h4>
            <div className="space-y-2 text-sm text-slate-400">
              <Link to={createPageUrl("SearchProfessionals?category=construção")} className="block hover:text-white transition-colors">
                Construção & Reformas
              </Link>
              <Link to={createPageUrl("SearchProfessionals?category=eletrica")} className="block hover:text-white transition-colors">
                Elétrica & Hidráulica
              </Link>
              <Link to={createPageUrl("SearchProfessionals?category=limpeza")} className="block hover:text-white transition-colors">
                Limpeza & Manutenção
              </Link>
              <Link to={createPageUrl("OtherServices")} className="block hover:text-white transition-colors">
                Automotivo
              </Link>
              <Link to={createPageUrl("OtherServices")} className="block hover:text-white transition-colors">
                Beleza & Estética
              </Link>
              <Link to={createPageUrl("OtherServices")} className="block hover:text-white transition-colors">
                Pets
              </Link>
              <Link to={createPageUrl("OtherServices")} className="block hover:text-white transition-colors">
                Eventos & Mídia
              </Link>
              <Link to={createPageUrl("OtherServices")} className="block hover:text-white transition-colors">
                Tecnologia
              </Link>
              <Link to={createPageUrl("OtherServices")} className="block hover:text-white transition-colors">
                Educação
              </Link>
              <Link to={createPageUrl("OtherServices")} className="block hover:text-white transition-colors">
                Outros Serviços
              </Link>
            </div>
          </div>

          {/* Contato */}
          <div>
            <h4 className="font-semibold mb-4">Contato</h4>
            <div className="space-y-3 text-sm text-slate-400">
              <a
                href="https://wa.me/5511999999999"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <span>📲</span>
                <span>WhatsApp Atendimento<br /><span className="text-xs">(Assistente Virtual)</span></span>
              </a>
              <a
                href="https://wa.me/5511999999999"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <span>📞</span>
                <span>WhatsApp Suporte / Ajuda</span>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} ConnectPro. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
});

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoadingAuth, logout, activeMode, switchMode } = useAuth();

  const handleLogout = useCallback(async () => {
    await logout(true);
  }, [logout]);

  const handleLogin = useCallback(() => {
    navigate('/login');
  }, [navigate]);

  const handleRegister = useCallback(() => {
    navigate('/login?tab=register');
  }, [navigate]);

  const handleSwitchMode = useCallback(async (mode) => {
    // Se está mudando para o mesmo modo atual, apenas navegar
    if (mode === activeMode) {
      if (mode === 'professional') {
        navigate('/ProfessionalDashboard');
      } else {
        navigate('/ClientDashboard');
      }
      return;
    }

    const result = await switchMode(mode);
    if (result?.needsProfessionalSetup) {
      // Redirecionar para página de cadastro profissional
      navigate('/BecomeProfessional');
    } else if (result?.success) {
      // Redirecionar para o dashboard apropriado
      if (mode === 'professional') {
        navigate('/ProfessionalDashboard');
      } else {
        navigate('/ClientDashboard');
      }
    }
  }, [switchMode, navigate, activeMode]);

  // Pages that don't need layout (pages with their own complete UI)
  const noLayoutPages = ['Onboarding', 'Login', 'Portfolio', 'ProfessionalCard', 'BecomeProfessional'];
  if (noLayoutPages.includes(currentPageName)) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header
        user={user}
        isAuthenticated={isAuthenticated}
        isLoadingAuth={isLoadingAuth}
        currentPageName={currentPageName}
        onLogout={handleLogout}
        onLogin={handleLogin}
        onRegister={handleRegister}
        activeMode={activeMode}
        onSwitchMode={handleSwitchMode}
      />

      {/* Main Content */}
      <main>
        {children}
      </main>

      <Footer />
    </div>
  );
}
