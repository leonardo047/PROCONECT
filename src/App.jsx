import { Suspense, memo } from 'react';
import { Toaster } from "@/componentes/interface do usuário/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import AuthCallback from '@/pages/AuthCallback';
import ResetPassword from '@/pages/ResetPassword';
import ForgotPassword from '@/pages/ForgotPassword';
import UserNotRegisteredError from '@/componentes/UserNotRegisteredError';
import ErrorBoundary from '@/componentes/comum/ErrorBoundary';
import ProtectedRoute, {
  isPublicRoute,
  getRequiredRole,
  getRequiredUserType
} from '@/componentes/comum/ProtectedRoute';

const { Pages, Layout, mainPage, Login } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : null;

// Loading spinner otimizado
const PageLoader = memo(() => (
  <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      <span className="text-sm text-slate-500">Carregando...</span>
    </div>
  </div>
));

// Layout wrapper otimizado
const LayoutWrapper = memo(({ children, currentPageName }) => {
  if (!Layout) return <>{children}</>;
  return <Layout currentPageName={currentPageName}>{children}</Layout>;
});

// Componente de rota com Suspense e proteção
const LazyRoute = memo(({ Page, currentPageName }) => {
  const path = `/${currentPageName}`;

  // Se e rota pública, renderizar diretamente
  if (isPublicRoute(path)) {
    return (
      <Suspense fallback={<PageLoader />}>
        <LayoutWrapper currentPageName={currentPageName}>
          <Page />
        </LayoutWrapper>
      </Suspense>
    );
  }

  // Rota protegida - usar ProtectedRoute
  const requiredRole = getRequiredRole(path);
  const requiredUserType = getRequiredUserType(path);

  return (
    <ProtectedRoute
      requiredRole={requiredRole}
      requiredUserType={requiredUserType}
      element={
        <Suspense fallback={<PageLoader />}>
          <LayoutWrapper currentPageName={currentPageName}>
            <Page />
          </LayoutWrapper>
        </Suspense>
      }
    />
  );
});

const AuthenticatedApp = memo(() => {
  const { isLoadingAuth, authError } = useAuth();

  // Loading inicial rápido
  if (isLoadingAuth) {
    return <PageLoader />;
  }

  // Handle authentication errors
  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  // Render the main app
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Suspense fallback={<PageLoader />}>
            <LayoutWrapper currentPageName={mainPageKey}>
              {MainPage && <MainPage />}
            </LayoutWrapper>
          </Suspense>
        }
      />
      <Route
        path="/login"
        element={
          <Suspense fallback={<PageLoader />}>
            <Login />
          </Suspense>
        }
      />
      <Route
        path="/auth/confirm"
        element={
          <Suspense fallback={<PageLoader />}>
            <AuthCallback />
          </Suspense>
        }
      />
      <Route
        path="/reset-password"
        element={
          <Suspense fallback={<PageLoader />}>
            <ResetPassword />
          </Suspense>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <Suspense fallback={<PageLoader />}>
            <ForgotPassword />
          </Suspense>
        }
      />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={<LazyRoute Page={Page} currentPageName={path} />}
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
});

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
