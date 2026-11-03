/**
 * Authentication Hook and Context Definition for Namma Karnataka.
 *
 * Separated from AuthContext.tsx to adhere to React Fast Refresh
 * (react-refresh/only-export-components).
 */

import { createContext, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { SignInParams, SignUpParams } from '../services/authService';
import { UserProfile, AuthModalView } from '../types';

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  token: string | null;
  loading: boolean;
  isConfigured: boolean;
  configError: string | null;
  isDemoMode: boolean;
  authModalOpen: boolean;
  authModalView: AuthModalView;
  pendingVerificationEmail: string | null;
  signIn: (params: SignInParams) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    params: SignUpParams
  ) => Promise<{ success: boolean; error?: string; requiresVerification?: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updateUserPassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  resendVerification: (email: string) => Promise<{ success: boolean; error?: string }>;
  loginAsDemo: (userNumber?: number) => void;
  openAuthModal: (view?: AuthModalView, email?: string) => void;
  closeAuthModal: () => void;
}

export const defaultGuestContext: AuthContextValue = {
  user: null,
  session: null,
  profile: null,
  token: null,
  loading: false,
  isConfigured: false,
  configError: null,
  isDemoMode: false,
  authModalOpen: false,
  authModalView: 'login',
  pendingVerificationEmail: null,
  signIn: async () => ({ success: false, error: 'Auth provider not found.' }),
  signUp: async () => ({ success: false, error: 'Auth provider not found.' }),
  signOut: async () => {},
  resetPassword: async () => ({ success: false, error: 'Auth provider not found.' }),
  updateUserPassword: async () => ({ success: false, error: 'Auth provider not found.' }),
  resendVerification: async () => ({ success: false, error: 'Auth provider not found.' }),
  loginAsDemo: () => {},
  openAuthModal: () => {},
  closeAuthModal: () => {},
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  return context || defaultGuestContext;
};

