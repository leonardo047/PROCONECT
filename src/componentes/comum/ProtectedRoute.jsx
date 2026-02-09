import React, { memo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

/**
 * Componente de proteção de rotas autenticadas
 *
 * Uso:
 * <ProtectedRoute element={<MinhaPage />} />
 * <ProtectedRoute element={<AdminPage />} requiredRole="admin" />
 */

// Rotas que NÃO precisam de autenticação (públicas)
export const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/Home',
  '/SearchProfessionals',
  '/PublicProfile',
  '/OtherServices',
  '/ProfessionalCard', // Cartão digital público para compartilhar
  '/Portfolio', // Visualização pública do portfolio de um profissional
  '/ProfessionalProfile', // Visualização pública do perfil de um profissional
  '/JobOpportunities', // Visualização pública de vagas/trabalhos terceirizados
  '/ServiceQuotes', // Visualização pública de orçamentos de clientes
  '/forgot-password',
  '/reset-password',
  '/termos',
  '/privacidade',
  '/auth/confirm' // Callback de confirmação de email
];

// Rotas que exigem role de admin
export const ADMIN_ROUTES = [
  '/AdminDashboard'
];

// Rotas que exigem usuário profissional
export const PROFESSIONAL_ROUTES = [
  '/ProfessionalDashboard',
  '/ProfessionalSchedule',
  '/ProfessionalReviews',
  '/ProfessionalQuotes'
];

// Rotas que exigem usuário cliente
export const CLIENT_ROUTES = [
  '/ClientDashboard',
  '/ClientAppointments',
  '/ClientQuotes',
  '/RequestQuote'
];

// Rotas que requerem autenticação mas são acessíveis a qualquer tipo de usuário
export const AUTHENTICATED_ROUTES = [
  '/BecomeProfessional',
  '/Conversations'
];

// Loading spinner simples
const RouteLoader = memo(() => (
  <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      <span className="text-sm text-slate-500">Verificando acesso...</span>
    </div>
  </div>
));

/**
 * Componente principal de proteção de rota
 */
const ProtectedRoute = memo(({
  element,
  requiredRole = null,
  requiredUserType = null,
  fallbackPath = '/login'
}) => {
  const { user, isAuthenticated, isLoadingAuth, activeMode } = useAuth();
  const location = useLocation();

  // Ainda carregando auth - mostrar loader
  if (isLoadingAuth) {
    return <RouteLoader />;
  }

  // Não autenticado - redirecionar para login com returnUrl
  if (!isAuthenticated || !user) {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnUrl=${returnUrl}`} replace />;
  }

  // Verificar role específica (ex: admin)
  if (requiredRole && user.role !== requiredRole) {
    // Usuário não tem a role necessária
    return <Navigate to="/" replace />;
  }

  // Verificar tipo de usuário baseado no activeMode
  if (requiredUserType) {
    // Se requer profissional
    if (requiredUserType === 'profissional') {
      // Verificar se o modo ativo é profissional
      if (activeMode !== 'professional') {
        // Se não é profissional no modo ativo, redirecionar para dashboard cliente
        return <Navigate to="/ClientDashboard" replace />;
      }
      // Verificar se completou o cadastro profissional
      if (!user.is_professional) {
        // Precisa completar o cadastro profissional
        return <Navigate to="/BecomeProfessional" replace />;
      }
    }

    // Se requer cliente
    if (requiredUserType === 'cliente') {
      // Verificar se o modo ativo é cliente
      if (activeMode !== 'client') {
        // Se não é cliente no modo ativo, redirecionar para dashboard profissional
        if (user.is_professional) {
          return <Navigate to="/ProfessionalDashboard" replace />;
        }
      }
    }
  }

  // Tudo ok - renderizar o elemento
  return element;
});

/**
 * Helper para determinar se uma rota precisa de proteção
 */
export const isPublicRoute = (path) => {
  return PUBLIC_ROUTES.some(route =>
    path === route || path.startsWith(route + '?')
  );
};

/**
 * Helper para determinar a role necessária para uma rota
 */
export const getRequiredRole = (path) => {
  if (ADMIN_ROUTES.includes(path)) return 'admin';
  return null;
};

/**
 * Helper para determinar o userType necessário para uma rota
 */
export const getRequiredUserType = (path) => {
  // Rotas que requerem autenticação mas não tipo específico
  if (AUTHENTICATED_ROUTES.includes(path)) return null;
  if (PROFESSIONAL_ROUTES.includes(path)) return 'profissional';
  if (CLIENT_ROUTES.includes(path)) return 'cliente';
  return null;
};

export default ProtectedRoute;
