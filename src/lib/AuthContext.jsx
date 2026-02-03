import React, { createContext, useState, useContext, useEffect } from 'react';
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

  useEffect(() => {
    // Check initial session
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserData(session.user);
        } else if (event === 'SIGNED_OUT') {
          clearUserData();
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          await loadUserData(session.user);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Session error:', error);
        setAuthError({
          type: 'session_error',
          message: error.message
        });
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
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingAuth(false);
    }
  };

  const loadUserData = async (authUser) => {
    try {
      setIsLoadingAuth(true);

      // Load user profile
      let userProfile = null;
      try {
        userProfile = await User.get(authUser.id);
      } catch (error) {
        // Profile might not exist yet for new users
        console.log('Profile not found, will be created on first update');
      }

      // If professional, load professional data
      let professionalData = null;
      if (userProfile?.user_type === 'profissional') {
        try {
          professionalData = await ProfessionalService.findByUserId(authUser.id);
        } catch (error) {
          console.log('Professional profile not found');
        }
      }

      // Create a combined user object for backward compatibility
      const combinedUser = {
        id: authUser.id,
        user_id: authUser.id,
        email: authUser.email,
        ...userProfile,
        user_type: userProfile?.user_type || 'cliente',
        role: userProfile?.role || 'user'
      };

      setUser(combinedUser);
      setProfile(userProfile);
      setProfessional(professionalData);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('Error loading user data:', error);
      setAuthError({
        type: 'load_error',
        message: 'Failed to load user data'
      });
      setIsLoadingAuth(false);
    }
  };

  const clearUserData = () => {
    setUser(null);
    setProfile(null);
    setProfessional(null);
    setIsAuthenticated(false);
  };

  // Sign in with email and password
  const signIn = async (email, password) => {
    try {
      setAuthError(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      return data;
    } catch (error) {
      setAuthError({
        type: 'sign_in_error',
        message: error.message
      });
      throw error;
    }
  };

  // Sign up with email and password
  const signUp = async (email, password, metadata = {}) => {
    try {
      setAuthError(null);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      setAuthError({
        type: 'sign_up_error',
        message: error.message
      });
      throw error;
    }
  };

  // Sign in with OAuth provider (Google, Facebook, etc.)
  const signInWithProvider = async (provider) => {
    try {
      setAuthError(null);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      setAuthError({
        type: 'oauth_error',
        message: error.message
      });
      throw error;
    }
  };

  // Sign out
  const logout = async (shouldRedirect = true) => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      clearUserData();

      if (shouldRedirect) {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Clear local state even if remote signout fails
      clearUserData();
      if (shouldRedirect) {
        window.location.href = '/';
      }
    }
  };

  // Navigate to login page
  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  // Redirect to login with return URL
  const redirectToLogin = (returnUrl = window.location.href) => {
    const encodedUrl = encodeURIComponent(returnUrl);
    window.location.href = `/login?returnUrl=${encodedUrl}`;
  };

  // Update user profile
  const updateProfile = async (updates) => {
    if (!user?.id) throw new Error('No user logged in');

    const updatedProfile = await User.update(user.id, updates);
    setProfile(updatedProfile);

    // Update combined user object
    setUser(prev => ({
      ...prev,
      ...updatedProfile
    }));

    return updatedProfile;
  };

  // Update Supabase auth user metadata
  const updateAuthUser = async (metadata) => {
    const { data, error } = await supabase.auth.updateUser({
      data: metadata
    });

    if (error) throw error;
    return data;
  };

  // Reset password
  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) throw error;
    return data;
  };

  // Update password
  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
    return data;
  };

  // Check if user is authenticated (synchronous check)
  const isAuthenticatedSync = () => {
    return isAuthenticated && user !== null;
  };

  // Get current user (for backward compatibility with base44.auth.me())
  const me = async () => {
    if (user) return user;

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await loadUserData(session.user);
      return user;
    }
    return null;
  };

  // Refresh user data
  const refreshUserData = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      await loadUserData(authUser);
    }
  };

  const value = {
    // State
    user,
    profile,
    professional,
    isAuthenticated,
    isLoadingAuth,
    isLoadingPublicSettings: false, // For backward compatibility
    authError,
    appPublicSettings: null, // For backward compatibility

    // Auth methods
    signIn,
    signUp,
    signInWithProvider,
    logout,
    navigateToLogin,
    redirectToLogin,
    resetPassword,
    updatePassword,

    // Profile methods
    updateProfile,
    updateAuthUser,
    refreshUserData,

    // Backward compatibility methods
    me,
    isAuthenticatedSync,
    checkAppState: checkSession
  };

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
