import React, { createContext, useState, useContext, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from './supabase';
import { User, ProfessionalService } from './entities';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [professional, setProfessional] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  const isLoadingRef = useRef(false);
  const mountedRef = useRef(true);

  const clearUserData = useCallback(() => {
    setUser(null);
    setProfile(null);
    setProfessional(null);
    setIsAuthenticated(false);
  }, []);

  // Carregar dados do professional em background (não bloqueia)
  const loadProfessionalInBackground = useCallback(async (userId) => {
    try {
      const professionalData = await ProfessionalService.findByUserId(userId);
      if (mountedRef.current) {
        setProfessional(professionalData);
      }
    } catch (error) {
      // Silencioso - professional profile é opcional
    }
  }, []);

  const loadUserData = useCallback(async (authUser) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      // Criar usuário básico imediatamente com dados do auth
      const basicUser = {
        id: authUser.id,
        user_id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || '',
        user_type: 'cliente',
        role: 'user'
      };

      // Liberar o loading rapidamente com dados básicos
      setUser(basicUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);

      // Carregar profile do banco em background
      try {
        const userProfile = await User.get(authUser.id);
        if (mountedRef.current && userProfile) {
          const combinedUser = {
            ...basicUser,
            ...userProfile,
            user_type: userProfile.user_type || 'cliente',
            role: userProfile.role || 'user'
          };
          setUser(combinedUser);
          setProfile(userProfile);

          // Se for profissional, carregar dados do professional em background
          if (userProfile.user_type === 'profissional') {
            loadProfessionalInBackground(authUser.id);
          }
        }
      } catch (error) {
        // Profile não existe ainda - ok para novos usuários
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      if (mountedRef.current) {
        setAuthError({ type: 'load_error', message: 'Failed to load user data' });
        setIsLoadingAuth(false);
      }
    } finally {
      isLoadingRef.current = false;
    }
  }, [loadProfessionalInBackground]);

  const checkSession = useCallback(async () => {
    if (isLoadingRef.current) return;

    try {
      setAuthError(null);
      const { data: { session }, error } = await supabase.auth.getSession();

      if (!mountedRef.current) return;

      if (error) {
        console.error('Session error:', error);
        setAuthError({ type: 'session_error', message: error.message });
        setIsLoadingAuth(false);
        return;
      }

      if (session?.user) {
        await loadUserData(session.user);
      } else {
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Error checking session:', error);
      if (mountedRef.current) {
        setAuthError({ type: 'unknown', message: error.message || 'An unexpected error occurred' });
        setIsLoadingAuth(false);
      }
    }
  }, [loadUserData]);

  useEffect(() => {
    mountedRef.current = true;
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;
        if (event === 'INITIAL_SESSION') return;

        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserData(session.user);
        } else if (event === 'SIGNED_OUT') {
          clearUserData();
          setIsLoadingAuth(false);
        } else if (event === 'TOKEN_REFRESHED' && session?.user && isAuthenticated) {
          await loadUserData(session.user);
        }
      }
    );

    // Timeout reduzido para 5 segundos
    const timeout = setTimeout(() => {
      if (mountedRef.current && isLoadingAuth) {
        console.warn('Auth loading timeout - forcing stop');
        setIsLoadingAuth(false);
      }
    }, 5000);

    return () => {
      mountedRef.current = false;
      subscription?.unsubscribe();
      clearTimeout(timeout);
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
    console.log('AuthContext logout called');

    // Limpar dados do usuário imediatamente
    clearUserData();

    // Tentar signOut com timeout de 2 segundos
    const signOutPromise = supabase.auth.signOut();
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      await Promise.race([signOutPromise, timeoutPromise]);
    } catch (error) {
      console.error('SignOut error:', error);
    }

    // Redirecionar independente do resultado
    if (shouldRedirect) {
      window.location.href = '/';
    }
  }, [clearUserData]);

  const navigateToLogin = useCallback(() => {
    window.location.href = '/login';
  }, []);

  const redirectToLogin = useCallback((returnUrl = window.location.href) => {
    window.location.href = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
  }, []);

  const updateProfile = useCallback(async (updates) => {
    if (!user?.id) throw new Error('No user logged in');
    const updatedProfile = await User.update(user.id, updates);
    setProfile(updatedProfile);
    setUser(prev => ({ ...prev, ...updatedProfile }));
    return updatedProfile;
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

  const value = useMemo(() => ({
    user,
    profile,
    professional,
    isAuthenticated,
    isLoadingAuth,
    isLoadingPublicSettings: false,
    authError,
    appPublicSettings: null,
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
    user, profile, professional, isAuthenticated, isLoadingAuth, authError,
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
