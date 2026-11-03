/**
 * Production Authentication Modal for Namma Karnataka.
 *
 * Implements conditional states:
 * State A: Supabase Configured (Sign In, Sign Up, Forgot Password, Verification, Reset Password)
 * State B: Supabase Not Configured (Clear explanation, Guest Mode CTA, Demo Account if Dev)
 * State C: Loading & Submission lock (no duplicate submissions)
 * State D: Sanitized, user-friendly error messages (no leaked stack traces)
 * State E: Password Reset / Recovery view
 */

import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import {
  X,
  Eye,
  EyeOff,
  Mail,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Compass,
  LogIn,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthModalView } from '../../types';
import './AuthModal.css';

interface AuthModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  defaultView?: AuthModalView;
}

function sanitizeAuthError(err: string | null): string | null {
  if (!err) return null;
  const lower = err.toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Incorrect email or password. Please verify your credentials and try again.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Your email address has not been verified yet. Please check your inbox or click resend.';
  }
  if (
    lower.includes('user already registered') ||
    lower.includes('already registered') ||
    lower.includes('user already exists') ||
    lower.includes('already exists')
  ) {
    return 'An account with this email address already exists. Please sign in instead.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many attempts. Please wait a few moments before trying again.';
  }
  if (
    lower.includes('network') ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('connection')
  ) {
    return 'Network error. Unable to reach authentication server. Please check your internet connection.';
  }
  if (
    lower.includes('password should be at least') ||
    lower.includes('weak password') ||
    lower.includes('password is too weak') ||
    lower.includes('pwned') ||
    lower.includes('password must be at least')
  ) {
    return 'Password is too weak or too short. Please choose a password with at least 6 characters.';
  }
  if (
    lower.includes('invalid format') ||
    lower.includes('valid email') ||
    lower.includes('invalid email') ||
    lower.includes('unable to validate email')
  ) {
    return 'Please enter a valid email address.';
  }
  return err;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
  defaultView,
}) => {
  const {
    authModalOpen,
    authModalView: contextView,
    pendingVerificationEmail,
    isConfigured,
    closeAuthModal,
    signIn,
    signUp,
    resetPassword,
    updateUserPassword,
    resendVerification,
    loginAsDemo,
  } = useAuth();

  const isModalOpen = propIsOpen !== undefined ? propIsOpen : authModalOpen;
  const handleClose = propOnClose || closeAuthModal;

  const [view, setView] = useState<AuthModalView>(defaultView || contextView || 'login');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Sync view when modal opens or context view changes
  useEffect(() => {
    if (isModalOpen) {
      if (defaultView) {
        setView(defaultView);
      } else if (contextView) {
        setView(contextView);
      }
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isModalOpen, contextView, defaultView]);

  // Sync email if pending verification
  useEffect(() => {
    if (pendingVerificationEmail && view === 'verification_pending') {
      setEmail(pendingVerificationEmail);
    }
  }, [pendingVerificationEmail, view]);

  // Reset errors on view change, preserving success banner when entering verification view
  useEffect(() => {
    setErrorMessage(null);
    if (view !== 'verification_pending') {
      setSuccessMessage(null);
    }
  }, [view]);

  // Handle Escape key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, handleClose]);

  // Resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Password strength calculation helper
  const calculateStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: 'None', className: '' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/\d/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak', className: 'active-weak' };
    if (score <= 3) return { score: 2, label: 'Fair', className: 'active-medium' };
    return { score: 3, label: 'Strong', className: 'active-strong' };
  };

  const passwordStrength = useMemo(() => calculateStrength(password), [password]);
  const newPasswordStrength = useMemo(() => calculateStrength(newPassword), [newPassword]);

  if (!isModalOpen) return null;

  // Sign In Handler
  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!isConfigured || submitting) return;
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await signIn({ email: cleanEmail, password });
      if (!res.success) {
        const errorMsg = res.error || 'Failed to sign in. Please verify your credentials.';
        if (errorMsg.toLowerCase().includes('email not confirmed')) {
          setErrorMessage('Your email address has not been verified yet. Please check your inbox or click resend.');
        } else {
          setErrorMessage(sanitizeAuthError(errorMsg));
        }
      } else {
        handleClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorMessage(sanitizeAuthError(msg));
    } finally {
      setSubmitting(false);
    }
  };

  // Sign Up Handler
  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    if (!isConfigured || submitting) return;
    setErrorMessage(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanName) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (!termsAccepted) {
      setErrorMessage('Please accept the Terms of Service to create an account.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await signUp({
        fullName: cleanName,
        email: cleanEmail,
        password,
      });

      if (!res.success) {
        setErrorMessage(sanitizeAuthError(res.error || 'Could not complete registration. Please try again.'));
      } else if (res.requiresVerification) {
        setSuccessMessage('Registration successful! Check your email to verify your account.');
        setView('verification_pending');
      } else {
        setSuccessMessage('Account created successfully! Welcome to Namma Karnataka.');
        setTimeout(() => {
          handleClose();
        }, 1200);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred during registration.';
      setErrorMessage(sanitizeAuthError(msg));
    } finally {
      setSubmitting(false);
    }
  };

  // Forgot Password Handler
  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!isConfigured || submitting) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address to receive reset instructions.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await resetPassword(cleanEmail);
      if (!res.success) {
        setErrorMessage(sanitizeAuthError(res.error || 'Failed to send password reset email.'));
      } else {
        setSuccessMessage('Password reset link sent! Check your inbox for instructions.');
        setResendCooldown(60);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to process password reset request.';
      setErrorMessage(sanitizeAuthError(msg));
    } finally {
      setSubmitting(false);
    }
  };

  // Update Password (Recovery Flow) Handler
  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await updateUserPassword(newPassword);
      if (!res.success) {
        setErrorMessage(sanitizeAuthError(res.error || 'Failed to update password.'));
      } else {
        setSuccessMessage('Your password has been successfully updated! You can now sign in.');
        setTimeout(() => {
          setView('login');
        }, 1800);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update password.';
      setErrorMessage(sanitizeAuthError(msg));
    } finally {
      setSubmitting(false);
    }
  };

  // Resend Verification Handler
  const handleResendVerification = async () => {
    if (resendCooldown > 0 || !email || submitting) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    setSubmitting(true);
    try {
      const res = await resendVerification(email);
      if (!res.success) {
        setErrorMessage(sanitizeAuthError(res.error || 'Could not resend verification email.'));
      } else {
        setSuccessMessage('Verification email resent! Please check your inbox.');
        setResendCooldown(60);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend email.';
      setErrorMessage(sanitizeAuthError(msg));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="nk-auth-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="nk-auth-card">
        {/* Header */}
        <div className="nk-auth-header">
          <div className="nk-auth-header-top">
            <span className="nk-auth-brand-badge">
              <Sparkles size={14} />
              Namma Karnataka
            </span>
            <button
              className="nk-auth-close-btn"
              onClick={handleClose}
              aria-label="Close authentication modal"
              type="button"
            >
              <X size={20} />
            </button>
          </div>

          <h2 id="auth-modal-title" className="nk-auth-title">
            {!isConfigured && view !== 'reset_password' && 'Authentication Unavailable'}
            {isConfigured && view === 'login' && 'Welcome Back'}
            {isConfigured && view === 'signup' && 'Create Your Account'}
            {isConfigured && view === 'forgot_password' && 'Reset Password'}
            {view === 'reset_password' && 'Set New Password'}
            {isConfigured && view === 'verification_pending' && 'Verify Your Email'}
          </h2>

          <p className="nk-auth-subtitle">
            {!isConfigured && view !== 'reset_password' && 'Cloud account synchronization is currently unavailable.'}
            {isConfigured && view === 'login' && 'Sign in to access and synchronize your saved Karnataka journeys.'}
            {isConfigured && view === 'signup' && 'Join to create, save, and collaboratively explore travel itineraries.'}
            {isConfigured && view === 'forgot_password' && "Enter your email address and we'll send you a recovery link."}
            {view === 'reset_password' && 'Enter and confirm your new account password.'}
            {isConfigured && view === 'verification_pending' && 'Confirm your email address to activate your account.'}
          </p>
        </div>

        {/* Body */}
        <div className="nk-auth-body">
          {errorMessage && (
            <div className="nk-auth-alert nk-auth-alert-error" role="alert">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="nk-auth-alert nk-auth-alert-success" role="status">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* =========================================================================
              STATE B: SUPABASE NOT CONFIGURED
              Explicitly displays a clear explanation, Continue as Guest, and Demo mode.
              NEVER displays functional email/password inputs or a broken Sign In button.
              ========================================================================= */}
          {!isConfigured && view !== 'reset_password' && (
            <div className="nk-auth-unconfigured-box" data-testid="auth-unconfigured-state">
              <div className="nk-auth-unconfigured-icon">
                <ShieldAlert size={32} />
              </div>
              <h3 className="nk-auth-unconfigured-title">Cloud Authentication Unavailable</h3>
              <p className="nk-auth-unconfigured-desc">
                Cloud authentication is unavailable because Supabase is not configured.
                You can continue exploring as a guest.
              </p>

              <button
                type="button"
                className="nk-auth-guest-cta-btn"
                onClick={handleClose}
                data-testid="continue-as-guest-btn"
              >
                <Compass size={18} />
                Continue Exploring as Guest
              </button>

              {/* Development Demo Mode CTA */}
              {import.meta.env.DEV && (
                <>
                  <div className="nk-auth-divider">or explore in development</div>
                  <button
                    type="button"
                    className="nk-auth-demo-btn"
                    onClick={() => loginAsDemo(1)}
                    data-testid="dev-demo-btn"
                  >
                    <span className="nk-auth-demo-badge">DEV DEMO</span>
                    Continue as Demo User
                  </button>
                </>
              )}
            </div>
          )}

          {/* =========================================================================
              STATE A: SUPABASE CONFIGURED — 1. SIGN IN VIEW
              ========================================================================= */}
          {isConfigured && view === 'login' && (
            <form onSubmit={handleSignIn} className="nk-auth-form" noValidate>
              <div className="nk-auth-field">
                <label className="nk-auth-label" htmlFor="nk-login-email">
                  Email Address
                </label>
                <div className="nk-auth-input-wrapper">
                  <input
                    id="nk-login-email"
                    type="email"
                    className="nk-auth-input"
                    placeholder="name@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>
              </div>

              <div className="nk-auth-field">
                <div className="nk-auth-label">
                  <label htmlFor="nk-login-password">Password</label>
                  <button
                    type="button"
                    className="nk-auth-link"
                    onClick={() => setView('forgot_password')}
                    disabled={submitting}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="nk-auth-input-wrapper">
                  <input
                    id="nk-login-password"
                    type={showPassword ? 'text' : 'password'}
                    className="nk-auth-input nk-auth-input-has-toggle"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    required
                  />
                  <button
                    type="button"
                    className="nk-auth-toggle-visibility"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    disabled={submitting}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="nk-auth-submit-btn"
                disabled={submitting}
                data-testid="signin-submit-btn"
              >
                {submitting ? (
                  <>
                    <span className="nk-auth-spinner" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* Dev Demo Mode Button (Strictly in DEV environment) */}
              {import.meta.env.DEV && (
                <>
                  <div className="nk-auth-divider">or explore in development</div>
                  <button
                    type="button"
                    className="nk-auth-demo-btn"
                    onClick={() => loginAsDemo(1)}
                  >
                    <span className="nk-auth-demo-badge">DEV DEMO</span>
                    Continue as Demo User
                  </button>
                </>
              )}
            </form>
          )}

          {/* =========================================================================
              STATE A: SUPABASE CONFIGURED — 2. SIGN UP VIEW
              ========================================================================= */}
          {isConfigured && view === 'signup' && (
            <form onSubmit={handleSignUp} className="nk-auth-form" noValidate>
              <div className="nk-auth-field">
                <label className="nk-auth-label" htmlFor="nk-signup-name">
                  Full Name
                </label>
                <div className="nk-auth-input-wrapper">
                  <input
                    id="nk-signup-name"
                    type="text"
                    className="nk-auth-input"
                    placeholder="Kaveri Rao"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>
              </div>

              <div className="nk-auth-field">
                <label className="nk-auth-label" htmlFor="nk-signup-email">
                  Email Address
                </label>
                <div className="nk-auth-input-wrapper">
                  <input
                    id="nk-signup-email"
                    type="email"
                    className="nk-auth-input"
                    placeholder="name@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>
              </div>

              <div className="nk-auth-field">
                <label className="nk-auth-label" htmlFor="nk-signup-password">
                  Password
                </label>
                <div className="nk-auth-input-wrapper">
                  <input
                    id="nk-signup-password"
                    type={showPassword ? 'text' : 'password'}
                    className="nk-auth-input nk-auth-input-has-toggle"
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    required
                  />
                  <button
                    type="button"
                    className="nk-auth-toggle-visibility"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    disabled={submitting}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {password.length > 0 && (
                  <div className="nk-auth-strength-meter">
                    <div className="nk-auth-strength-bars">
                      <div
                        className={`nk-auth-strength-segment ${
                          passwordStrength.score >= 1 ? passwordStrength.className : ''
                        }`}
                      />
                      <div
                        className={`nk-auth-strength-segment ${
                          passwordStrength.score >= 2 ? passwordStrength.className : ''
                        }`}
                      />
                      <div
                        className={`nk-auth-strength-segment ${
                          passwordStrength.score >= 3 ? passwordStrength.className : ''
                        }`}
                      />
                    </div>
                    <div className="nk-auth-strength-text">
                      <span>Strength: {passwordStrength.label}</span>
                      <span>{password.length >= 8 ? '✓ Length OK' : 'Use 8+ characters for safety'}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="nk-auth-field">
                <label className="nk-auth-label" htmlFor="nk-signup-confirm-password">
                  Confirm Password
                </label>
                <div className="nk-auth-input-wrapper">
                  <input
                    id="nk-signup-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="nk-auth-input nk-auth-input-has-toggle"
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={submitting}
                    required
                  />
                  <button
                    type="button"
                    className="nk-auth-toggle-visibility"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    disabled={submitting}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <span className="text-xs text-red-500 mt-1">Passwords do not match.</span>
                )}
              </div>

              <label className="nk-auth-checkbox-row">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  disabled={submitting}
                />
                <span>
                  I agree to Namma Karnataka's Terms of Service and acknowledge the Privacy Policy.
                </span>
              </label>

              <button
                type="submit"
                className="nk-auth-submit-btn"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="nk-auth-spinner" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* =========================================================================
              STATE A: SUPABASE CONFIGURED — 3. FORGOT PASSWORD VIEW
              ========================================================================= */}
          {isConfigured && view === 'forgot_password' && (
            <form onSubmit={handleForgotPassword} className="nk-auth-form" noValidate>
              <div className="nk-auth-field">
                <label className="nk-auth-label" htmlFor="nk-reset-email">
                  Your Account Email
                </label>
                <div className="nk-auth-input-wrapper">
                  <input
                    id="nk-reset-email"
                    type="email"
                    className="nk-auth-input"
                    placeholder="name@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="nk-auth-submit-btn"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="nk-auth-spinner" />
                    Sending link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          )}

          {/* =========================================================================
              STATE E: RESET PASSWORD / RECOVERY VIEW
              ========================================================================= */}
          {view === 'reset_password' && (
            <form onSubmit={handleUpdatePassword} className="nk-auth-form" noValidate>
              <div className="nk-auth-field">
                <label className="nk-auth-label" htmlFor="nk-new-password">
                  New Password
                </label>
                <div className="nk-auth-input-wrapper">
                  <input
                    id="nk-new-password"
                    type={showPassword ? 'text' : 'password'}
                    className="nk-auth-input nk-auth-input-has-toggle"
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={submitting}
                    required
                  />
                  <button
                    type="button"
                    className="nk-auth-toggle-visibility"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    disabled={submitting}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {newPassword.length > 0 && (
                  <div className="nk-auth-strength-meter">
                    <div className="nk-auth-strength-bars">
                      <div
                        className={`nk-auth-strength-segment ${
                          newPasswordStrength.score >= 1 ? newPasswordStrength.className : ''
                        }`}
                      />
                      <div
                        className={`nk-auth-strength-segment ${
                          newPasswordStrength.score >= 2 ? newPasswordStrength.className : ''
                        }`}
                      />
                      <div
                        className={`nk-auth-strength-segment ${
                          newPasswordStrength.score >= 3 ? newPasswordStrength.className : ''
                        }`}
                      />
                    </div>
                    <div className="nk-auth-strength-text">
                      <span>Strength: {newPasswordStrength.label}</span>
                      <span>{newPassword.length >= 8 ? '✓ Length OK' : 'Use 8+ characters'}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="nk-auth-field">
                <label className="nk-auth-label" htmlFor="nk-confirm-new-password">
                  Confirm New Password
                </label>
                <div className="nk-auth-input-wrapper">
                  <input
                    id="nk-confirm-new-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="nk-auth-input nk-auth-input-has-toggle"
                    placeholder="Re-enter new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    disabled={submitting}
                    required
                  />
                  <button
                    type="button"
                    className="nk-auth-toggle-visibility"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    disabled={submitting}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmNewPassword && newPassword !== confirmNewPassword && (
                  <span className="text-xs text-red-500 mt-1">Passwords do not match.</span>
                )}
              </div>

              <button
                type="submit"
                className="nk-auth-submit-btn"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="nk-auth-spinner" />
                    Updating password...
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          )}

          {/* =========================================================================
              STATE A: SUPABASE CONFIGURED — 4. VERIFICATION PENDING VIEW
              ========================================================================= */}
          {isConfigured && view === 'verification_pending' && (
            <div className="nk-auth-verification-box" data-testid="verification-pending-box">
              <div className="nk-auth-mail-icon-circle">
                <Mail size={32} />
              </div>

              <div className="nk-auth-alert nk-auth-alert-success w-full text-left" role="status">
                <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                <span>Check your email to verify your account</span>
              </div>

              <p className="text-sm text-slate-600 mt-2">
                A verification link has been sent to:
                <br />
                <span className="nk-auth-target-email font-semibold text-slate-800">{email}</span>
              </p>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mt-1">
                Click the confirmation link in your email to activate your account. Once verified, return here to sign in with your credentials.
              </p>

              <button
                type="button"
                className="nk-auth-submit-btn mt-3"
                onClick={() => {
                  setView('login');
                  setSuccessMessage('Email verified? Please sign in with your credentials.');
                }}
                data-testid="verification-goto-signin-btn"
              >
                <LogIn size={16} />
                Proceed to Sign In
              </button>

              <button
                type="button"
                className="nk-auth-link mt-2"
                disabled={submitting || resendCooldown > 0}
                onClick={handleResendVerification}
                data-testid="resend-verification-btn"
              >
                {resendCooldown > 0
                  ? `Resend link in ${resendCooldown}s`
                  : 'Didn’t receive it? Resend verification email'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="nk-auth-footer">
          {isConfigured && view === 'login' && (
            <div>
              Don't have an account?{' '}
              <button
                type="button"
                className="nk-auth-link"
                onClick={() => setView('signup')}
                data-testid="switch-to-signup-btn"
              >
                Create Account
              </button>
            </div>
          )}

          {isConfigured && (view === 'signup' || view === 'forgot_password' || view === 'verification_pending' || view === 'reset_password') && (
            <div>
              Already have an account?{' '}
              <button
                type="button"
                className="nk-auth-link"
                onClick={() => setView('login')}
                data-testid="switch-to-login-btn"
              >
                Sign In
              </button>
            </div>
          )}

          <button
            type="button"
            className="nk-auth-guest-btn"
            onClick={handleClose}
            data-testid="auth-modal-guest-btn"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
};
