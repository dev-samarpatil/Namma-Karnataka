import React from 'react';
import { Language } from '../../types';
import { useTranslation } from '../../lib/i18n';

export type ActiveTab = 'home' | 'discovery' | 'planner' | 'itinerary' | 'saved-trips';

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
    <>
      <header className="app-header" role="banner">
        <div className="header-top">
          <div
            className="brand"
            onClick={() => onTabChange('home')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onTabChange('home')}
            aria-label="Namma Karnataka Home"
          >
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

        {/* Desktop Top Navigation Tabs (Hidden on viewports < 768px via CSS) */}
        <nav className="header-nav desktop-nav" aria-label="Main Navigation">
          <button
            type="button"
            className={`nav-tab ${currentTab === 'home' ? 'active' : ''}`}
            onClick={() => onTabChange('home')}
            aria-current={currentTab === 'home' ? 'page' : undefined}
            data-testid="nav-tab-home"
          >
            🏛️ {t('navHome')}
          </button>

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

      {/* Mobile Bottom Navigation Bar (Visible on viewports < 768px) */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <button
          type="button"
          className={`mobile-nav-item ${currentTab === 'home' ? 'active' : ''}`}
          onClick={() => onTabChange('home')}
          aria-current={currentTab === 'home' ? 'page' : undefined}
          data-testid="mobile-nav-tab-home"
        >
          <span className="mobile-nav-icon" aria-hidden="true">🏛️</span>
          <span className="mobile-nav-label">{t('navHome')}</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-item ${currentTab === 'discovery' ? 'active' : ''}`}
          onClick={() => onTabChange('discovery')}
          aria-current={currentTab === 'discovery' ? 'page' : undefined}
          data-testid="mobile-nav-tab-discovery"
        >
          <span className="mobile-nav-icon" aria-hidden="true">🔍</span>
          <span className="mobile-nav-label">{t('navExplore')}</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-item ${currentTab === 'planner' ? 'active' : ''}`}
          onClick={() => onTabChange('planner')}
          aria-current={currentTab === 'planner' ? 'page' : undefined}
          data-testid="mobile-nav-tab-planner"
        >
          <span className="mobile-nav-icon" aria-hidden="true">✨</span>
          <span className="mobile-nav-label">{t('navPlan')}</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-item ${currentTab === 'itinerary' ? 'active' : ''}`}
          onClick={() => onTabChange('itinerary')}
          aria-current={currentTab === 'itinerary' ? 'page' : undefined}
          data-testid="mobile-nav-tab-itinerary"
        >
          <span className="mobile-nav-icon-wrapper" aria-hidden="true">
            <span className="mobile-nav-icon">🗺️</span>
            {hasActivePlan && <span className="mobile-tab-badge" aria-label="Active plan available">●</span>}
          </span>
          <span className="mobile-nav-label">{t('navItinerary')}</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-item ${currentTab === 'saved-trips' ? 'active' : ''}`}
          onClick={() => onTabChange('saved-trips')}
          aria-current={currentTab === 'saved-trips' ? 'page' : undefined}
          data-testid="mobile-nav-tab-saved"
        >
          <span className="mobile-nav-icon-wrapper" aria-hidden="true">
            <span className="mobile-nav-icon">💾</span>
            {savedTripsCount > 0 && <span className="mobile-tab-count">{savedTripsCount}</span>}
          </span>
          <span className="mobile-nav-label">{t('navSavedTrips')}</span>
        </button>
      </nav>
    </>
  );
};
