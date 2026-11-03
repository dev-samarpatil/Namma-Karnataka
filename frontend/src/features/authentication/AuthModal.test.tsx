import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthModal } from './AuthModal';
import * as authService from '../../services/authService';
import * as supabaseClientModule from '../../lib/supabaseClient';
import { AuthProvider } from '../../context/AuthContext';

describe('AuthModal Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const renderWithAuth = (props = {}) => {
    return render(
      <AuthProvider>
        <AuthModal isOpen={true} onClose={vi.fn()} {...props} />
      </AuthProvider>
    );
  };

  describe('State B: Supabase Not Configured', () => {
    it('displays authentication unavailable state, explanation, guest button, and demo button without signin form', () => {
      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(false);
      renderWithAuth();

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Authentication Unavailable')).toBeInTheDocument();
      expect(
        screen.getByText(/Cloud authentication is unavailable because Supabase is not configured/i)
      ).toBeInTheDocument();
      expect(screen.getByTestId('continue-as-guest-btn')).toBeInTheDocument();
      expect(screen.getByTestId('dev-demo-btn')).toBeInTheDocument();

      // Ensure form inputs and signin button are NOT displayed
      expect(screen.queryByLabelText(/Email Address/i)).not.toBeInTheDocument();
      expect(screen.queryByTestId('signin-submit-btn')).not.toBeInTheDocument();
    });

    it('allows guest to dismiss modal', () => {
      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(false);
      const onClose = vi.fn();
      render(
        <AuthProvider>
          <AuthModal isOpen={true} onClose={onClose} />
        </AuthProvider>
      );

      fireEvent.click(screen.getByTestId('continue-as-guest-btn'));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('State A: Supabase Configured', () => {
    beforeEach(() => {
      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(true);
    });

    it('renders sign in view with email, password, and show/hide toggle', () => {
      renderWithAuth();

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Show password/i })).toBeInTheDocument();
      expect(screen.getByTestId('signin-submit-btn')).toBeInTheDocument();
    });

    it('toggles password visibility', () => {
      renderWithAuth();

      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
      const toggleBtn = screen.getByRole('button', { name: /Show password/i });

      expect(passwordInput.type).toBe('password');
      fireEvent.click(toggleBtn);
      expect(passwordInput.type).toBe('text');
      fireEvent.click(screen.getByRole('button', { name: /Hide password/i }));
      expect(passwordInput.type).toBe('password');
    });

    it('switches to sign up view and shows password strength meter', async () => {
      renderWithAuth();

      const createAccountBtn = screen.getByRole('button', { name: /Create Account/i });
      fireEvent.click(createAccountBtn);

      expect(screen.getByText('Create Your Account')).toBeInTheDocument();
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();

      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
      fireEvent.change(passwordInput, { target: { value: 'Secret123!' } });

      await waitFor(() => {
        expect(screen.getByText(/Strength:/i)).toBeInTheDocument();
        expect(screen.getByText(/Strong|Fair/i)).toBeInTheDocument();
      });
    });

    it('validates password mismatch during registration', async () => {
      renderWithAuth({ defaultView: 'signup' });

      fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Kaveri' } });
      fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'kaveri@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123' } });
      fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'DifferentPassword' } });

      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
    });

    it('switches to forgot password view and handles reset link request', async () => {
      const resetSpy = vi.spyOn(authService, 'resetPassword').mockResolvedValue({ data: undefined });
      renderWithAuth();

      fireEvent.click(screen.getByText(/Forgot password\?/i));
      expect(screen.getByText('Reset Password')).toBeInTheDocument();

      const emailInput = screen.getByLabelText(/Your Account Email/i);
      fireEvent.change(emailInput, { target: { value: 'reset@karnataka.gov.in' } });
      fireEvent.click(screen.getByRole('button', { name: /Send Reset Link/i }));

      await waitFor(() => {
        expect(resetSpy).toHaveBeenCalledWith('reset@karnataka.gov.in');
        expect(screen.getByText(/Password reset link sent!/i)).toBeInTheDocument();
      });
    });

    it('displays verification pending view with registered email', () => {
      renderWithAuth({ defaultView: 'verification_pending' });

      expect(screen.getByText('Verify Your Email')).toBeInTheDocument();
      expect(screen.getByText(/Confirm your email address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Resend verification email/i })).toBeInTheDocument();
    });

    it('registers user when email confirmation is enabled and displays verification prompt', async () => {
      const signUpSpy = vi.spyOn(authService, 'signUp').mockResolvedValue({
        data: {
          user: { id: 'user-1', email: 'kaveri@example.com' } as any,
          session: null,
        },
      });

      renderWithAuth({ defaultView: 'signup' });

      fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Kaveri Rao' } });
      fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'kaveri@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'StrongPass123!' } });
      fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'StrongPass123!' } });
      fireEvent.click(screen.getByRole('checkbox'));

      fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

      await waitFor(() => {
        expect(signUpSpy).toHaveBeenCalledWith({
          fullName: 'Kaveri Rao',
          email: 'kaveri@example.com',
          password: 'StrongPass123!',
        });
      });

      // Verify email confirmation prompt is displayed
      await waitFor(() => {
        expect(screen.getAllByText(/Check your email to verify your account/i).length).toBeGreaterThan(0);
        expect(screen.getByText('kaveri@example.com')).toBeInTheDocument();
        expect(screen.getByTestId('verification-goto-signin-btn')).toBeInTheDocument();
      });

      // Clicking Proceed to Sign In transitions to sign in view with email preserved
      fireEvent.click(screen.getByTestId('verification-goto-signin-btn'));
      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
      expect((screen.getByLabelText(/Email Address/i) as HTMLInputElement).value).toBe('kaveri@example.com');
    });

    it('registers user when email confirmation is disabled and displays success banner', async () => {
      vi.spyOn(authService, 'signUp').mockResolvedValue({
        data: {
          user: { id: 'user-2', email: 'arjun@example.com' } as any,
          session: { access_token: 'live-token-123' } as any,
        },
      });

      renderWithAuth({ defaultView: 'signup' });

      fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Arjun Das' } });
      fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'arjun@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'SecureKey99!' } });
      fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'SecureKey99!' } });
      fireEvent.click(screen.getByRole('checkbox'));

      fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

      await waitFor(() => {
        expect(screen.getByText(/Account created successfully! Welcome to Namma Karnataka/i)).toBeInTheDocument();
      });
    });

    it('handles duplicate email error during registration', async () => {
      vi.spyOn(authService, 'signUp').mockResolvedValue({
        error: 'An account with this email address already exists. Please sign in instead.',
      });

      renderWithAuth({ defaultView: 'signup' });

      fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Duplicate User' } });
      fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'existing@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123!' } });
      fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Password123!' } });
      fireEvent.click(screen.getByRole('checkbox'));

      fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

      await waitFor(() => {
        expect(screen.getByText(/An account with this email address already exists/i)).toBeInTheDocument();
      });
    });

    it('validates invalid email format and weak password on registration submit', async () => {
      renderWithAuth({ defaultView: 'signup' });

      fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Test User' } });
      fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'invalid-email-no-domain' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: '123' } });
      fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: '123' } });
      fireEvent.click(screen.getByRole('checkbox'));

      fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

      expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();

      // Fix email but keep short password
      fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'valid@example.com' } });
      fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

      expect(screen.getByText(/Password must be at least 6 characters long/i)).toBeInTheDocument();
    });

    it('handles network failure during registration gracefully', async () => {
      vi.spyOn(authService, 'signUp').mockRejectedValue(new Error('Failed to fetch'));

      renderWithAuth({ defaultView: 'signup' });

      fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Network User' } });
      fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'network@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'NetworkPass123!' } });
      fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'NetworkPass123!' } });
      fireEvent.click(screen.getByRole('checkbox'));

      fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

      await waitFor(() => {
        expect(screen.getByText(/Network error\. Unable to reach authentication server/i)).toBeInTheDocument();
      });
    });

    it('handles unconfirmed email during sign in with helpful guidance', async () => {
      vi.spyOn(authService, 'signIn').mockResolvedValue({
        error: 'Email not confirmed',
      });

      renderWithAuth({ defaultView: 'login' });

      fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'unconfirmed@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'MySecretPass123!' } });
      fireEvent.click(screen.getByTestId('signin-submit-btn'));

      await waitFor(() => {
        expect(screen.getByText(/Your email address has not been verified yet/i)).toBeInTheDocument();
      });
    });

    it('renders password reset view and updates password', async () => {
      const updateSpy = vi.spyOn(authService, 'updatePassword').mockResolvedValue({ data: undefined });
      renderWithAuth({ defaultView: 'reset_password' });

      expect(screen.getByText('Set New Password')).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'BrandNewPassword123!' } });
      fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'BrandNewPassword123!' } });

      fireEvent.click(screen.getByRole('button', { name: /Update Password/i }));

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledWith('BrandNewPassword123!');
      });
    });
  });
});
