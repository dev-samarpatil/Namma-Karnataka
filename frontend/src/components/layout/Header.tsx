import React from 'react';
import { Language } from '../../types';
import { useTranslation } from '../../lib/i18n';

export type ActiveTab = 'discovery' | 'planner' | 'itinerary' | 'saved-trips';

interface HeaderProps {
  currentTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  hasActivePlan: boolean;
  savedTripsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  language,
  onLanguageChange,
  hasActivePlan,
  savedTripsCount,
}) => {
  const { t } = useTranslation(language);

  const toggleLanguage = () => {
    onLanguageChange(language === 'en' ? 'kn' : 'en');
  };

  return (
    <header className="app-header" role="banner">
      <div className="header-top">
        <div className="brand" onClick={() => onTabChange('discovery')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onTabChange('discovery')}>
          <div className="brand-icon" aria-hidden="true">🏛️</div>
          <div className="brand-text">
            <h1 className="brand-title">
              {language === 'kn' ? t('appTitle') : 'Namma Karnataka'}{' '}
              <span className="brand-title-kn">(ನಮ್ಮ ಕರ್ನಾಟಕ)</span>
            </h1>
            <p className="brand-subtitle">{t('appSubtitle')}</p>
          </div>
        </div>

        <div className="header-controls">
          <button
            type="button"
            className="lang-switcher-btn"
            onClick={toggleLanguage}
            aria-label={`Switch language to ${language === 'en' ? 'Kannada' : 'English'}`}
            data-testid="language-toggle-btn"
          >
            <span className="lang-icon" aria-hidden="true">🌐</span>
            <span className="lang-label">{t('switchLanguage')}</span>
          </button>
        </div>
      </div>

      <nav className="header-nav" aria-label="Main Navigation">
        <button
          type="button"
          className={`nav-tab ${currentTab === 'discovery' ? 'active' : ''}`}
          onClick={() => onTabChange('discovery')}
          aria-current={currentTab === 'discovery' ? 'page' : undefined}
          data-testid="nav-tab-discovery"
        >
          🔍 {t('navExplore')}
        </button>

        <button
          type="button"
          className={`nav-tab ${currentTab === 'planner' ? 'active' : ''}`}
          onClick={() => onTabChange('planner')}
          aria-current={currentTab === 'planner' ? 'page' : undefined}
          data-testid="nav-tab-planner"
        >
          ✨ {t('navPlan')}
        </button>

        <button
          type="button"
          className={`nav-tab ${currentTab === 'itinerary' ? 'active' : ''}`}
          onClick={() => onTabChange('itinerary')}
          aria-current={currentTab === 'itinerary' ? 'page' : undefined}
          data-testid="nav-tab-itinerary"
        >
          🗺️ {t('navItinerary')}
          {hasActivePlan && <span className="tab-badge" aria-label="Active plan available">●</span>}
        </button>

        <button
          type="button"
          className={`nav-tab ${currentTab === 'saved-trips' ? 'active' : ''}`}
          onClick={() => onTabChange('saved-trips')}
          aria-current={currentTab === 'saved-trips' ? 'page' : undefined}
          data-testid="nav-tab-saved"
        >
          💾 {t('navSavedTrips')}
          {savedTripsCount > 0 && <span className="tab-count-badge">{savedTripsCount}</span>}
        </button>
      </nav>
    </header>
  );
};
