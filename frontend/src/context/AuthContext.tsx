/**
 * Authentication Context and Provider for Namma Karnataka.
 *
 * Manages user lifecycle, active session token, modal visibility,
 * and auth events across the entire application.
 */

import React, {
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import {
  getSession,
  signIn as apiSignIn,
  signUp as apiSignUp,
  signOut as apiSignOut,
  resetPassword as apiResetPassword,
  updatePassword as apiUpdatePassword,
  resendVerificationEmail as apiResendVerification,
  signInDemoUser,
  onAuthStateChange,
  SignInParams,
  SignUpParams,
} from '../services/authService';
import { isSupabaseConfigured, getSupabaseConfigStatus } from '../lib/supabaseClient';
import { UserProfile, AuthModalView } from '../types';
import { AuthContext, AuthContextValue } from './useAuth';

function mapUserToProfile(user: User | null): UserProfile | null {
  if (!user) return null;
  const metadata = user.user_metadata || {};
  return {
    id: user.id,
    email: user.email,
    full_name: metadata.full_name || user.email?.split('@')[0] || 'Traveler',
    avatar_url: metadata.avatar_url || null,
    preferred_language: (metadata.preferred_language as 'en' | 'kn') || 'en',
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  const isConfigured = isSupabaseConfigured();
  const configError = getSupabaseConfigStatus().error;

  // Modal dialog state
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalView, setAuthModalView] = useState<AuthModalView>('login');
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);

  // Initialize session on mount
  useEffect(() => {
    let mounted = true;

    // Detect password reset route in URL
    if (
      typeof window !== 'undefined' &&
      (window.location.hash.includes('reset-password') ||
        window.location.pathname.includes('reset-password') ||
        window.location.hash.includes('type=recovery'))
    ) {
      setAuthModalView('reset_password');
      setAuthModalOpen(true);
    }

    async function initSession() {
      try {
        const initialSession = await getSession();
        if (mounted) {
          if (initialSession) {
            setSession(initialSession);
            setUser(initialSession.user);
            setIsDemoMode(initialSession.user.app_metadata?.provider === 'demo');
          } else {
            setSession(null);
            setUser(null);
            setIsDemoMode(false);
          }
        }
      } catch (err) {
        console.warn('Failed to restore authentication session:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initSession();

    // Subscribe to Supabase Auth state changes
    const { unsubscribe } = onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        setAuthModalView('reset_password');
        setAuthModalOpen(true);
      }

      if (newSession) {
        setSession(newSession);
        setUser(newSession.user);
        setIsDemoMode(newSession.user.app_metadata?.provider === 'demo');
      } else {
        setSession(null);
        setUser(null);
        setIsDemoMode(false);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const openAuthModal = useCallback((view: AuthModalView = 'login', email?: string) => {
    setAuthModalView(view);
    if (email) setPendingVerificationEmail(email);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const signIn = useCallback(
    async (params: SignInParams): Promise<{ success: boolean; error?: string }> => {
      const result = await apiSignIn(params);
      if (result.error) {
        return { success: false, error: result.error };
      }
      if (result.data) {
        setSession(result.data.session);
        setUser(result.data.user);
        setIsDemoMode(false);
        setAuthModalOpen(false);
        return { success: true };
      }
      return { success: false, error: 'Sign in failed.' };
    },
    []
  );

  const signUp = useCallback(
    async (
      params: SignUpParams
    ): Promise<{ success: boolean; error?: string; requiresVerification?: boolean }> => {
      const result = await apiSignUp(params);
      if (result.error) {
        return { success: false, error: result.error };
      }
      if (result.data) {
        // If session is null, email confirmation is enabled on Supabase
        if (!result.data.session) {
          setPendingVerificationEmail(params.email);
          setAuthModalView('verification_pending');
          return { success: true, requiresVerification: true };
        }
        setSession(result.data.session);
        setUser(result.data.user);
        setIsDemoMode(false);
        setPendingVerificationEmail(null);
        return { success: true, requiresVerification: false };
      }
      return { success: false, error: 'Registration failed.' };
    },
    []
  );

  const signOut = useCallback(async (): Promise<void> => {
    await apiSignOut();
    setSession(null);
    setUser(null);
    setIsDemoMode(false);
  }, []);

  const resetPassword = useCallback(
    async (email: string): Promise<{ success: boolean; error?: string }> => {
      const result = await apiResetPassword(email);
      if (result.error) {
        return { success: false, error: result.error };
      }
      return { success: true };
    },
    []
  );

  const updateUserPassword = useCallback(
    async (password: string): Promise<{ success: boolean; error?: string }> => {
      const result = await apiUpdatePassword(password);
      if (result.error) {
        return { success: false, error: result.error };
      }
      setAuthModalOpen(false);
      return { success: true };
    },
    []
  );

  const resendVerification = useCallback(
    async (email: string): Promise<{ success: boolean; error?: string }> => {
      const result = await apiResendVerification(email);
      if (result.error) {
        return { success: false, error: result.error };
      }
      return { success: true };
    },
    []
  );

  const loginAsDemo = useCallback((userNumber: number = 1): void => {
    const result = signInDemoUser(userNumber);
    if (result.data) {
      setSession(result.data.session);
      setUser(result.data.user);
      setIsDemoMode(true);
      setAuthModalOpen(false);
    }
  }, []);

  const token = session?.access_token || null;
  const profile = mapUserToProfile(user);

  const value: AuthContextValue = {
    user,
    session,
    profile,
    token,
    loading,
    isConfigured,
    configError,
    isDemoMode,
    authModalOpen,
    authModalView,
    pendingVerificationEmail,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateUserPassword,
    resendVerification,
    loginAsDemo,
    openAuthModal,
    closeAuthModal,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
