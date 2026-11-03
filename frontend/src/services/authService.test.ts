import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authService from './authService';
import { supabase } from '../lib/supabaseClient';
import * as supabaseClientModule from '../lib/supabaseClient';

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
          user: { id: 'user-xyz', identities: [{ id: 'id-1' }] } as any,
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
          user: { id: 'user-xyz', identities: [{ id: 'id-1' }] } as any,
          session: { access_token: 'valid-jwt-token' } as any,
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
          user: { id: 'user-xyz', identities: [] } as any,
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
      vi.spyOn(supabase.auth, 'signUp').mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' } as any,
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

