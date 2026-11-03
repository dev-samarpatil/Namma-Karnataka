/**
 * Centralized Supabase client initialization for Namma Karnataka frontend.
 *
 * Uses public/anonymous credentials only.
 * NEVER import or expose the Supabase service role key here.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export interface SupabaseConfigStatus {
  isConfigured: boolean;
  hasUrl: boolean;
  hasAnonKey: boolean;
  urlHost: string | null;
  error: string | null;
}

/**
 * Validates whether valid Supabase credentials are present.
 */
export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(rawUrl) &&
    Boolean(rawKey) &&
    !rawUrl.includes('placeholder') &&
    !rawKey.includes('placeholder') &&
    rawUrl.startsWith('https://') &&
    rawKey.length > 20
  );
};

/**
 * Returns detailed diagnostic information regarding the current Supabase configuration.
 */
export const getSupabaseConfigStatus = (): SupabaseConfigStatus => {
  const hasUrl = Boolean(rawUrl) && rawUrl.startsWith('https://') && !rawUrl.includes('placeholder');
  const hasAnonKey = Boolean(rawKey) && !rawKey.includes('placeholder') && rawKey.length > 20;
  const isConfigured = hasUrl && hasAnonKey;

  let urlHost: string | null = null;
  try {
    if (rawUrl && rawUrl.startsWith('https://')) {
      urlHost = new URL(rawUrl).host;
    }
  } catch {
    urlHost = null;
  }

  let error: string | null = null;
  if (!hasUrl && !hasAnonKey) {
    error = 'Cloud authentication is unavailable because Supabase is not configured in this environment.';
  } else if (!hasUrl) {
    error = 'VITE_SUPABASE_URL is missing or invalid.';
  } else if (!hasAnonKey) {
    error = 'VITE_SUPABASE_ANON_KEY is missing or invalid.';
  }

  return {
    isConfigured,
    hasUrl,
    hasAnonKey,
    urlHost,
    error,
  };
};

// Singleton client instance: Fallback dummy credentials allow offline guest operation and tests
const safeUrl = isSupabaseConfigured() ? rawUrl : 'https://placeholder.supabase.co';
const safeKey = isSupabaseConfigured() ? rawKey : 'placeholder-anon-key-min-length-safe';

export const supabase: SupabaseClient = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'nk_supabase_auth_session',
  },
});
