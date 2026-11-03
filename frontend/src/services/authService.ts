/**
 * Authentication service for Namma Karnataka.
 *
 * Interfaces with Supabase Auth for registration, login, password recovery,
 * session lifecycle, and profile management.
 */

import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  preferredLanguage?: 'en' | 'kn';
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface AuthResult<T = void> {
  data?: T;
  error?: string;
}

const DEMO_SESSION_KEY = 'nk_demo_user_session';

/**
 * Register a new user account with email, password, and metadata.
 */
export async function signUp({
  email,
  password,
  fullName,
  preferredLanguage = 'en',
}: SignUpParams): Promise<AuthResult<{ user: User | null; session: Session | null }>> {
  if (!isSupabaseConfigured()) {
    return {
      error: 'Supabase authentication is not configured in this environment.',
    };
  }

  const cleanEmail = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return { error: 'Please enter a valid email address.' };
  }
  if (!password || password.length < 6) {
    return { error: 'Password must be at least 6 characters long.' };
  }

  try {
    const emailRedirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}/`
      : undefined;

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          preferred_language: preferredLanguage,
        },
        emailRedirectTo,
      },
    });

    if (error) {
      return { error: error.message };
    }

    // Supabase anti-enumeration: if user already exists and email confirmation is ON,
    // Supabase returns a user with empty identities array.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return {
        error: 'An account with this email address already exists. Please sign in instead.',
      };
    }

    return {
      data: {
        user: data.user,
        session: data.session,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred during registration.';
    return { error: message };
  }
}

/**
 * Sign in using email and password.
 */
export async function signIn({
  email,
  password,
}: SignInParams): Promise<AuthResult<{ user: User; session: Session }>> {
  if (!isSupabaseConfigured()) {
    return {
      error: 'Supabase authentication is not configured in this environment.',
    };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    if (!data.user || !data.session) {
      return { error: 'Failed to retrieve session from authentication provider.' };
    }

    return {
      data: {
        user: data.user,
        session: data.session,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred during sign in.';
    return { error: message };
  }
}

/**
 * Sign out the current user and clear local session state.
 */
export async function signOut(): Promise<AuthResult<void>> {
  // Clear any active demo session first
  try {
    sessionStorage.removeItem(DEMO_SESSION_KEY);
    localStorage.removeItem(DEMO_SESSION_KEY);
  } catch {
    // Ignore storage errors
  }

  if (!isSupabaseConfigured()) {
    return { data: undefined };
  }

  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { error: error.message };
    }
    return { data: undefined };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to sign out.';
    return { error: message };
  }
}

/**
 * Retrieve the current active session.
 */
export async function getSession(): Promise<Session | null> {
  // Check for active demo session in dev/test mode
  try {
    const demoStored = sessionStorage.getItem(DEMO_SESSION_KEY) || localStorage.getItem(DEMO_SESSION_KEY);
    if (demoStored) {
      const parsed = JSON.parse(demoStored);
      return parsed as Session;
    }
  } catch {
    // Ignore parse errors
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch {
    return null;
  }
}

/**
 * Retrieve current authenticated user.
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  return session ? session.user : null;
}

/**
 * Request a password reset link sent to user email.
 */
export async function resetPassword(email: string): Promise<AuthResult<void>> {
  if (!isSupabaseConfigured()) {
    return {
      error: 'Supabase authentication is not configured in this environment.',
    };
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#reset-password`,
    });

    if (error) {
      return { error: error.message };
    }

    return { data: undefined };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send password reset request.';
    return { error: message };
  }
}

/**
 * Update user password with a new password (e.g. from recovery flow).
 */
export async function updatePassword(newPassword: string): Promise<AuthResult<void>> {
  if (!isSupabaseConfigured()) {
    return {
      error: 'Supabase authentication is not configured in this environment.',
    };
  }

  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { error: error.message };
    }

    return { data: undefined };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update password.';
    return { error: message };
  }
}

/**
 * Resend email confirmation / verification link.
 */
export async function resendVerificationEmail(email: string): Promise<AuthResult<void>> {
  if (!isSupabaseConfigured()) {
    return {
      error: 'Supabase authentication is not configured in this environment.',
    };
  }

  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      return { error: error.message };
    }

    return { data: undefined };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to resend verification email.';
    return { error: message };
  }
}

/**
 * Listen for auth state changes (SIGN_IN, SIGN_OUT, TOKEN_REFRESHED, etc.).
 */
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
): { unsubscribe: () => void } {
  if (!isSupabaseConfigured()) {
    return { unsubscribe: () => {} };
  }

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return {
    unsubscribe: () => {
      data.subscription.unsubscribe();
    },
  };
}

/**
 * Development & Demo mode helper.
 * Restricted to non-production environments.
 */
export function signInDemoUser(userNumber: number = 1): AuthResult<{ user: User; session: Session }> {
  if (!import.meta.env.DEV) {
    return { error: 'Demo user authentication is disabled in production.' };
  }

  const demoUser: User = {
    id: `00000000-0000-0000-0000-00000000000${userNumber}`,
    app_metadata: { provider: 'demo' },
    user_metadata: {
      full_name: `Demo Explorer ${userNumber}`,
      preferred_language: 'en',
    },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    email: `demo-user-${userNumber}@example.com`,
    phone: '',
    role: 'authenticated',
    updated_at: new Date().toISOString(),
  };

  const demoSession: Session = {
    access_token: `test-token-user-${userNumber}`,
    token_type: 'bearer',
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    refresh_token: `demo-refresh-token-${userNumber}`,
    user: demoUser,
  };

  try {
    sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(demoSession));
  } catch {
    // Ignore storage issues
  }

  return {
    data: {
      user: demoUser,
      session: demoSession,
    },
  };
}
