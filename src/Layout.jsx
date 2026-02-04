import React, { useState, useCallback, memo } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { NotificationService } from "@/lib/entities";
import { useQuery } from "@tanstack/react-query";
import {
  Home, Search, User, Settings, LogOut, Menu, X,
  Hammer, Shield, ChevronDown, Bell, FileText
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
  onRegister
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
  const isProfessional = user?.user_type === 'profissional';
  const isClient = user?.user_type === 'cliente';

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={createPageUrl("Home")} className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Hammer className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-800 hidden sm:block">
              ProObra
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
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            {isLoadingAuth ? (
              <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
            ) : isAuthenticated && user ? (
              <>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                <Hammer className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl">ProObra</span>
            </div>
            <p className="text-slate-400 text-sm">
              Conectando você aos melhores profissionais da construção e serviços.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Links Rápidos</h4>
            <div className="space-y-2 text-sm text-slate-400">
              <Link to={createPageUrl("Home")} className="block hover:text-white transition-colors">
                Início
              </Link>
              <Link to={createPageUrl("SearchProfessionals")} className="block hover:text-white transition-colors">
                Buscar Profissionais
              </Link>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Categorias</h4>
            <div className="space-y-2 text-sm text-slate-400">
              <p>Pintores</p>
              <p>Pedreiros</p>
              <p>Eletricistas</p>
              <p>Encanadores</p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} ProObra. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
});

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoadingAuth, logout } = useAuth();

  const handleLogout = useCallback(async () => {
    await logout(true);
  }, [logout]);

  const handleLogin = useCallback(() => {
    navigate('/login');
  }, [navigate]);

  const handleRegister = useCallback(() => {
    navigate('/login?tab=register');
  }, [navigate]);

  // Pages that don't need layout
  const noLayoutPages = ['Onboarding', 'Login'];
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
      />

      {/* Main Content */}
      <main>
        {children}
      </main>

      <Footer />
    </div>
  );
}
