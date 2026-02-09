import React, { createContext, useState, useContext, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from './supabase';
import { User, ProfessionalService } from './entities';
import { queryClientInstance } from './query-client';
import { validateReturnUrl } from './security';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [professional, setProfessional] = useState(null);
  const [session, setSession] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [activeMode, setActiveMode] = useState('client'); // 'client' ou 'professional'

  const isLoadingRef = useRef(false);
  const mountedRef = useRef(true);
  const loadRequestIdRef = useRef(0); // Para cancelar requests antigas

  const clearUserData = useCallback(() => {
    setUser(null);
    setProfile(null);
    setProfessional(null);
    setIsAuthenticated(false);
    setActiveMode('client');
  }, []);

  // Carregar dados do professional em background (não bloqueia)
  const loadProfessionalInBackground = useCallback(async (userId) => {
    try {
      const professionalData = await ProfessionalService.findByUserId(userId);
      if (mountedRef.current) {
        setProfessional(professionalData);
      }
    } catch (error) {
      // Silenciosó - professional profile é opcional
    }
  }, []);

  const loadUserData = useCallback(async (authUser, forceReload = false) => {
    // Incrementar o ID da request para cancelar requests antigas
    const currentRequestId = ++loadRequestIdRef.current;

    // Se já estiver carregando e não for forceReload, ignorar
    if (isLoadingRef.current && !forceReload) return;
    isLoadingRef.current = true;

    // Helper para verificar se está request ainda e válida
    const isValidRequest = () => mountedRef.current && loadRequestIdRef.current === currentRequestId;

    // Criar usuário básico imediatamente com dados do auth
    // NOTA: O role será definido pelo banco de dados via tabela profiles
    // Não usamos mais verificação de email hardcoded por segurança
    const basicUser = {
      id: authUser.id,
      user_id: authUser.id,
      email: authUser.email,
      full_name: authUser.user_metadata?.full_name || '',
      user_type: authUser.user_metadata?.user_type || 'cliente',
      referred_by_code: authUser.user_metadata?.referred_by_code || null,
      role: 'user' // Role padrão - será sobrescrito pelo perfil do banco
    };

    // Liberar o loading rapidamente com dados básicos
    if (isValidRequest()) {
      setUser(basicUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      isLoadingRef.current = false;
    }

    // Carregar profile do banco em background (não bloqueia mais)
    try {
      const userProfile = await User.get(authUser.id);

      if (isValidRequest() && userProfile) {
        // Role e definido APENAS pelo banco de dados (profiles.role)
        // Issó garante que a verificação seja feita server-side via RLS
        const finalRole = userProfile.role || 'user';

        const combinedUser = {
          ...basicUser,
          ...userProfile,
          user_type: userProfile.user_type || basicUser.user_type || 'cliente',
          role: finalRole,
          is_professional: userProfile.is_professional || false,
          active_mode: userProfile.active_mode || 'client'
        };
        setUser(combinedUser);
        setProfile(userProfile);
        // Definir o modo ativo baseado no perfil do banco
        setActiveMode(userProfile.active_mode || 'client');

        // Se for profissional, carregar dados do professional em background
        if (combinedUser.user_type === 'profissional') {
          loadProfessionalInBackground(authUser.id);
        }
      } else if (isValidRequest() && basicUser.user_type === 'profissional') {
        // Se o metadata indica profissional mas não tem profile, ainda carregar professional
        loadProfessionalInBackground(authUser.id);
      }
    } catch (error) {
      // Profile não existe ainda - ok para novos usuários
      // Mas se o metadata indica profissional, tentar carregar professional
      if (isValidRequest() && basicUser.user_type === 'profissional') {
        loadProfessionalInBackground(authUser.id);
      }
    }
  }, [loadProfessionalInBackground]);

  const checkSession = useCallback(async () => {
    try {
      setAuthError(null);

      const { data: { session }, error } = await supabase.auth.getSession();

      if (!mountedRef.current) return;

      if (error) {
        setAuthError({ type: 'session_error', message: error.message });
        setIsLoadingAuth(false);
        isLoadingRef.current = false;
        return;
      }

      if (session?.user) {
        await loadUserData(session.user);
      } else {
        // Sem sessão - usuário não logado
        setIsLoadingAuth(false);
        isLoadingRef.current = false;
      }
    } catch (error) {
      if (mountedRef.current) {
        setAuthError({ type: 'unknown', message: error.message || 'An unexpected error occurred' });
        setIsLoadingAuth(false);
        isLoadingRef.current = false;
      }
    }
  }, [loadUserData]);

  useEffect(() => {
    mountedRef.current = true;
    isLoadingRef.current = false;

    // Função para inicializar auth com timeout
    const initAuth = async () => {
      try {
        // Verificar localStorage do Supabase
        const supabaseKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));

        let storedSession = null;
        if (supabaseKey) {
          try {
            const stored = localStorage.getItem(supabaseKey);
            if (stored) {
              storedSession = JSON.parse(stored);
            }
          } catch (e) {
            // Ignorar erro de parse
          }
        }

        // Se temos sessão armazenada com user, usar diretamente
        if (storedSession?.user && storedSession?.access_token) {
          await loadUserData(storedSession.user);
          return;
        }

        // Fallback: tentar getSession com timeout
        const getSessionWithTimeout = async () => {
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('getSession timeout')), 3000);
          });

          try {
            const result = await Promise.race([
              supabase.auth.getSession(),
              timeoutPromise
            ]);
            return result;
          } catch (e) {
            return { data: { session: null }, error: e };
          }
        };

        const { data: { session: currentSession }, error } = await getSessionWithTimeout();

        if (!mountedRef.current) return;

        setSession(currentSession);

        if (currentSession?.user) {
          await loadUserData(currentSession.user);
        } else {
          setIsLoadingAuth(false);
          isLoadingRef.current = false;
        }
      } catch (error) {
        if (mountedRef.current) {
          setIsLoadingAuth(false);
          isLoadingRef.current = false;
        }
      }
    };

    // Chamar initAuth imediatamente
    initAuth();

    // Listener para mudanças de auth (login, logout, refresh de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mountedRef.current) return;

        // Ignorar INITIAL_SESSION pois já tratamos com getSession acima
        if (event === 'INITIAL_SESSION') return;

        setSession(currentSession);

        if (event === 'SIGNED_IN' && currentSession?.user) {
          await loadUserData(currentSession.user);
        } else if (event === 'SIGNED_OUT') {
          clearUserData();
          setSession(null);
          setIsLoadingAuth(false);
          isLoadingRef.current = false;
        } else if (event === 'TOKEN_REFRESHED' && currentSession?.user) {
          await loadUserData(currentSession.user, true);
        }
      }
    );

    // Recarregar dados quando a aba ficar visível novamente
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && mountedRef.current) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await loadUserData(session.user, true);
          } else if (isAuthenticated) {
            clearUserData();
          }
        } catch (error) {
          // Ignorar erro
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mountedRef.current = false;
      isLoadingRef.current = false;
      subscription?.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    try {
      setAuthError(null);
      setIsLoadingAuth(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    } catch (error) {
      setAuthError({ type: 'sign_in_error', message: error.message });
      setIsLoadingAuth(false);
      throw error;
    }
  }, []);

  const signUp = useCallback(async (email, password, metadata = {}) => {
    try {
      setAuthError(null);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata }
      });
      if (error) throw error;
      return data;
    } catch (error) {
      setAuthError({ type: 'sign_up_error', message: error.message });
      throw error;
    }
  }, []);

  const signInWithProvider = useCallback(async (provider) => {
    try {
      setAuthError(null);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
      return data;
    } catch (error) {
      setAuthError({ type: 'oauth_error', message: error.message });
      throw error;
    }
  }, []);

  const logout = useCallback(async (shouldRedirect = true) => {
    // Limpar dados do usuário imediatamente
    clearUserData();
    setIsLoadingAuth(false);

    // Limpar cache do React Query para não vazar dados entre sessões
    try {
      queryClientInstance.clear();
    } catch (e) {
      // Ignorar erros
    }

    // Limpar TODOS os storages ANTES do signOut
    try {
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear();

      // Limpar cookies do Supabase
      document.cookie.split(";").forEach(cookie => {
        const name = cookie.split("=")[0].trim();
        if (name.startsWith('sb-') || name.includes('supabase')) {
          document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
        }
      });
    } catch (e) {
      // Ignorar erros de storage
    }

    // Fazer signOut
    try {
      await supabase.auth.signOut();
    } catch (error) {
      // Ignorar erros de signOut
    }

    // Redirecionar
    if (shouldRedirect) {
      window.location.href = '/';
    }
  }, [clearUserData]);

  const navigateToLogin = useCallback(() => {
    window.location.href = '/login';
  }, []);

  const redirectToLogin = useCallback((returnUrl = window.location.pathname + window.location.search) => {
    // Usar apenas o pathname para evitar open redirect com URLs absolutas
    const safeReturnUrl = validateReturnUrl(returnUrl);
    window.location.href = `/login?returnUrl=${encodeURIComponent(safeReturnUrl)}`;
  }, []);

  const updateProfile = useCallback(async (updates) => {
    if (!user?.id) {
      throw new Error('No user logged in');
    }

    try {
      const updatedProfile = await User.update(user.id, updates);

      setProfile(updatedProfile);
      setUser(prev => ({ ...prev, ...updatedProfile }));
      return updatedProfile;
    } catch (error) {
      throw error;
    }
  }, [user?.id]);

  const updateAuthUser = useCallback(async (metadata) => {
    const { data, error } = await supabase.auth.updateUser({ data: metadata });
    if (error) throw error;
    return data;
  }, []);

  const resetPassword = useCallback(async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    if (error) throw error;
    return data;
  }, []);

  const updatePassword = useCallback(async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return data;
  }, []);

  const isAuthenticatedSync = useCallback(() => isAuthenticated && user !== null, [isAuthenticated, user]);

  const me = useCallback(async () => {
    if (user) return user;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await loadUserData(session.user);
      return user;
    }
    return null;
  }, [user, loadUserData]);

  const refreshUserData = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      isLoadingRef.current = false;
      await loadUserData(authUser);
    }
  }, [loadUserData]);

  // Função para alternar entre modos (cliente/profissional)
  const switchMode = useCallback(async (mode) => {
    if (!user?.id) return false;

    // Se tentar mudar para profissional mas não completou cadastro profissional
    if (mode === 'professional' && !user.is_professional) {
      // Retorna false para indicar que precisa completar o cadastro
      return { success: false, needsProfessionalSetup: true };
    }

    try {
      // Atualizar no banco
      await User.update(user.id, { active_mode: mode });

      // Atualizar estado local
      setActiveMode(mode);
      setUser(prev => ({ ...prev, active_mode: mode }));

      return { success: true };
    } catch (error) {
      console.error('Erro ao trocar modo:', error);
      return { success: false, error };
    }
  }, [user]);

  // Função para marcar usuário como profissional após completar cadastro
  const markAsProfessional = useCallback(async () => {
    if (!user?.id) return false;

    try {
      await User.update(user.id, {
        is_professional: true,
        active_mode: 'professional',
        user_type: 'profissional' // Manter compatibilidade
      });

      setUser(prev => ({
        ...prev,
        is_professional: true,
        active_mode: 'professional',
        user_type: 'profissional'
      }));
      setActiveMode('professional');

      return { success: true };
    } catch (error) {
      console.error('Erro ao marcar como profissional:', error);
      return { success: false, error };
    }
  }, [user]);

  const value = useMemo(() => ({
    user,
    profile,
    professional,
    session,
    isAuthenticated,
    isLoadingAuth,
    isLoadingPublicSettings: false,
    authError,
    appPublicSettings: null,
    activeMode,
    switchMode,
    markAsProfessional,
    signIn,
    signUp,
    signInWithProvider,
    logout,
    navigateToLogin,
    redirectToLogin,
    resetPassword,
    updatePassword,
    updateProfile,
    updateAuthUser,
    refreshUserData,
    me,
    isAuthenticatedSync,
    checkAppState: checkSession
  }), [
    user, profile, professional, session, isAuthenticated, isLoadingAuth, authError,
    activeMode, switchMode, markAsProfessional,
    signIn, signUp, signInWithProvider, logout, navigateToLogin, redirectToLogin,
    resetPassword, updatePassword, updateProfile, updateAuthUser, refreshUserData,
    me, isAuthenticatedSync, checkSession
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
