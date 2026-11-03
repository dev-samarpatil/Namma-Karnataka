import React from 'react';
import { Globe, LogIn, LogOut, UserPlus } from 'lucide-react';
import { Language } from '../../types';
import { useTranslation } from '../../lib/i18n';
import { LiquidMorphFloatingMenu } from '../ui/liquid-morph-floating-menu';
import { useAuth } from '../../context/useAuth';

export type ActiveTab = 'home' | 'discovery' | 'planner' | 'itinerary' | 'saved-trips';

export interface HeaderProps {
  currentTab?: ActiveTab;
  onTabChange?: (tab: ActiveTab) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  hasActivePlan?: boolean;
  savedTripsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab = 'home',
  onTabChange,
  language,
  onLanguageChange,
  hasActivePlan = false,
  savedTripsCount = 0,
}) => {
  const { t } = useTranslation(language);
  const { user, profile, openAuthModal, signOut } = useAuth();
  const isLanding = currentTab === 'home';

  const toggleLanguage = () => {
    onLanguageChange(language === 'en' ? 'kn' : 'en');
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Traveler';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header
      className={`app-header ${isLanding ? 'is-landing' : ''}`}
      role="banner"
      data-testid="app-header"
    >
      <div className="header-top">
        <div
          className="brand"
          onClick={() => onTabChange?.('home')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onTabChange?.('home')}
          aria-label="Namma Karnataka Home"
        >
          <div className="brand-icon" aria-hidden="true">
            <img
              src="/assets/namma-karnataka-logo.png"
              alt="Namma Karnataka Logo"
              className="brand-logo-img"
            />
          </div>
          <div className="brand-text">
            <h1 className="brand-title">
              {language === 'kn' ? t('appTitle') : 'Namma Karnataka'}{' '}
              <span className="brand-title-kn">(ನಮ್ಮ ಕರ್ನಾಟಕ)</span>
            </h1>
            <p className="brand-subtitle">{t('appSubtitle')}</p>
          </div>
        </div>

        <div className="header-controls">
          <LiquidMorphFloatingMenu
            currentTab={currentTab}
            onTabChange={onTabChange || (() => {})}
            language={language}
            hasActivePlan={hasActivePlan}
            savedTripsCount={savedTripsCount}
          />

          <button
            type="button"
            className="lang-switcher-btn"
            onClick={toggleLanguage}
            aria-label={`Switch language to ${language === 'en' ? 'Kannada' : 'English'}`}
            data-testid="language-toggle-btn"
          >
            <span className="lang-icon" aria-hidden="true">
              <Globe size={16} strokeWidth={2} />
            </span>
            <span className="lang-label">{t('switchLanguage')}</span>
          </button>

          {user ? (
            <div className="user-profile-badge" data-testid="header-user-badge">
              <div className="user-avatar-circle" title={displayName}>
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                  />
                ) : (
                  initial
                )}
              </div>
              <span className="user-display-name">{displayName}</span>
              <button
                type="button"
                className="auth-signout-mini-btn"
                onClick={() => signOut()}
                title={t('signOutButton')}
                aria-label={t('signOutButton')}
                data-testid="header-signout-btn"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="header-auth-buttons" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="auth-signin-header-btn"
                onClick={() => openAuthModal('login')}
                aria-label={t('signInButton')}
                data-testid="header-signin-btn"
              >
                <LogIn size={15} />
                <span>{t('signInButton')}</span>
              </button>
              <button
                type="button"
                className="auth-signup-header-btn"
                onClick={() => openAuthModal('signup')}
                aria-label="Create Account"
                data-testid="header-signup-btn"
              >
                <UserPlus size={15} />
                <span>Create Account</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
