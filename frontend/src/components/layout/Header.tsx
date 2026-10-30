import React from 'react';
import { Landmark, Globe } from 'lucide-react';
import { Language } from '../../types';
import { useTranslation } from '../../lib/i18n';
import { LiquidMorphFloatingMenu } from '../ui/liquid-morph-floating-menu';

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

  const toggleLanguage = () => {
    onLanguageChange(language === 'en' ? 'kn' : 'en');
  };

  return (
    <header className="app-header" role="banner">
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
            <Landmark size={22} strokeWidth={2.2} />
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
        </div>
      </div>
    </header>
  );
};

