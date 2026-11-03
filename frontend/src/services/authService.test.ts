import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import * as authService from './authService';
import { supabase } from '../lib/supabaseClient';
import * as supabaseClientModule from '../lib/supabaseClient';

const createMockUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'user-xyz',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-11-01T00:00:00Z',
    identities: [
      {
        id: 'id-1',
        user_id: 'user-xyz',
        identity_data: {},
        provider: 'email',
        last_sign_in_at: '2026-11-01T00:00:00Z',
        created_at: '2026-11-01T00:00:00Z',
        updated_at: '2026-11-01T00:00:00Z',
      },
    ],
    ...overrides,
  } as unknown as User);

const createMockSession = (overrides: Partial<Session> = {}): Session =>
  ({
    access_token: 'valid-jwt-token',
    refresh_token: 'valid-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: createMockUser(),
    ...overrides,
  } as unknown as Session);

describe('authService', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('signs in demo user in development environment', () => {
    const res = authService.signInDemoUser(1);
    expect(res.error).toBeUndefined();
    expect(res.data).toBeDefined();
    expect(res.data?.user.id).toBe('00000000-0000-0000-0000-000000000001');
    expect(res.data?.session.access_token).toBe('test-token-user-1');
  });

  it('retrieves active demo session from storage', async () => {
    authService.signInDemoUser(2);
    const session = await authService.getSession();
    expect(session).not.toBeNull();
    expect(session?.access_token).toBe('test-token-user-2');
    expect(session?.user.email).toBe('demo-user-2@example.com');
  });

  it('signs out and clears demo session storage', async () => {
    authService.signInDemoUser(1);
    const preSignOut = await authService.getSession();
    expect(preSignOut).not.toBeNull();

    await authService.signOut();
    const postSignOut = await authService.getSession();
    expect(postSignOut).toBeNull();
  });

  describe('signUp', () => {
    beforeEach(() => {
      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(true);
    });

    it('rejects invalid email formats without calling supabase', async () => {
      const signUpSpy = vi.spyOn(supabase.auth, 'signUp');
      const res = await authService.signUp({
        fullName: 'Kaveri Rao',
        email: 'invalid-email',
        password: 'Password123!',
      });

      expect(res.error).toBe('Please enter a valid email address.');
      expect(signUpSpy).not.toHaveBeenCalled();
    });

    it('rejects passwords shorter than 6 characters', async () => {
      const signUpSpy = vi.spyOn(supabase.auth, 'signUp');
      const res = await authService.signUp({
        fullName: 'Kaveri Rao',
        email: 'kaveri@example.com',
        password: '123',
      });

      expect(res.error).toBe('Password must be at least 6 characters long.');
      expect(signUpSpy).not.toHaveBeenCalled();
    });

    it('handles successful registration with email confirmation enabled (session: null)', async () => {
      vi.spyOn(supabase.auth, 'signUp').mockResolvedValue({
        data: {
          user: createMockUser(),
          session: null,
        },
        error: null,
      });

      const res = await authService.signUp({
        fullName: 'Kaveri Rao',
        email: 'kaveri@example.com',
        password: 'Password123!',
      });

      expect(res.error).toBeUndefined();
      expect(res.data?.user?.id).toBe('user-xyz');
      expect(res.data?.session).toBeNull();
    });

    it('handles successful registration with email confirmation disabled (session present)', async () => {
      vi.spyOn(supabase.auth, 'signUp').mockResolvedValue({
        data: {
          user: createMockUser(),
          session: createMockSession({ access_token: 'valid-jwt-token' }),
        },
        error: null,
      });

      const res = await authService.signUp({
        fullName: 'Kaveri Rao',
        email: 'kaveri@example.com',
        password: 'Password123!',
      });

      expect(res.error).toBeUndefined();
      expect(res.data?.session?.access_token).toBe('valid-jwt-token');
    });

    it('detects anti-enumeration duplicate email when identities is empty array', async () => {
      vi.spyOn(supabase.auth, 'signUp').mockResolvedValue({
        data: {
          user: createMockUser({ identities: [] }),
          session: null,
        },
        error: null,
      });

      const res = await authService.signUp({
        fullName: 'Kaveri Rao',
        email: 'existing@example.com',
        password: 'Password123!',
      });

      expect(res.error).toMatch(/already exists/i);
    });

    it('returns error when supabase signUp returns an error object', async () => {
      const mockError = {
        name: 'AuthApiError',
        message: 'User already registered',
        status: 400,
      } as unknown as AuthError;

      vi.spyOn(supabase.auth, 'signUp').mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const res = await authService.signUp({
        fullName: 'Kaveri Rao',
        email: 'existing@example.com',
        password: 'Password123!',
      });

      expect(res.error).toBe('User already registered');
    });
  });
});

