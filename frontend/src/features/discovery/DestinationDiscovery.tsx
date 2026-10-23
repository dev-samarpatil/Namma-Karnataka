import React, { useEffect, useState, useCallback } from 'react';
import {
  DestinationRead,
  DestinationCategory,
  Language,
  KARNATAKA_DISTRICTS,
} from '../../types';
import { listDestinations, ApiClientError } from '../../lib/api';
import { useTranslation, TranslationKey } from '../../lib/i18n';
import { DestinationCard } from './DestinationCard';
import { DestinationModal } from './DestinationModal';

interface DestinationDiscoveryProps {
  language: Language;
  onPlanWithDestination: (dest: DestinationRead) => void;
}

const CATEGORIES: DestinationCategory[] = [
  'heritage',
  'nature',
  'waterfall',
  'hill_station',
  'viewpoint',
  'architecture',
  'beach',
  'wildlife',
  'spiritual_cultural',
  'food_culture',
  'adventure',
  'museum',
];

export const DestinationDiscovery: React.FC<DestinationDiscoveryProps> = ({
  language,
  onPlanWithDestination,
}) => {
  const { t } = useTranslation(language);

  const [destinations, setDestinations] = useState<DestinationRead[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isOffbeatOnly, setIsOffbeatOnly] = useState<boolean>(false);

  // Modal
  const [activeDestination, setActiveDestination] = useState<DestinationRead | null>(null);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await listDestinations(
        {
          q: searchQuery.trim() || undefined,
          district: selectedDistrict || undefined,
          category: (selectedCategory as DestinationCategory) || undefined,
          is_offbeat: isOffbeatOnly ? true : undefined,
          lang: language,
          limit: 50,
          offset: 0,
        },
        signal
      );

      setDestinations(response.items);
      setTotalCount(response.total);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(t('networkError'));
      }
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedDistrict, selectedCategory, isOffbeatOnly, language, t]);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedDistrict('');
    setSelectedCategory('');
    setIsOffbeatOnly(false);
  };

  const hasActiveFilters = Boolean(
    searchQuery || selectedDistrict || selectedCategory || isOffbeatOnly
  );

  return (
    <section className="discovery-section" aria-label="Explore Destinations">
      <div className="section-intro">
        <h2>{t('navExplore')}</h2>
        <p className="section-description">
          {language === 'kn'
            ? 'ಕರ್ನಾಟಕದ ಸಂರಕ್ಷಿತ ಪರಂಪರೆ, ಗಿರಿಧಾಮಗಳು, ಜಲಪಾತಗಳು ಮತ್ತು ಪ್ರಕೃತಿ ಸೌಂದರ್ಯವನ್ನು ಪರಿಶೀಲಿಸಿ.'
            : 'Browse verified heritage monuments, hill stations, waterfalls, and nature retreats across Karnataka.'}
        </p>
      </div>

      <div className="filter-panel" role="search" aria-label="Destination filters">
        <div className="search-bar">
          <span className="search-icon" aria-hidden="true">🔍</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label="Search destinations"
            className="search-input"
            data-testid="destination-search-input"
          />
        </div>

        <div className="filter-controls-row">
          <div className="filter-group">
            <label htmlFor="district-select" className="visually-hidden">
              {t('district')}
            </label>
            <select
              id="district-select"
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="filter-select"
              data-testid="district-filter-select"
            >
              <option value="">{t('allDistricts')}</option>
              {KARNATAKA_DISTRICTS.map((d) => (
                <option key={d.code} value={d.code}>
                  {language === 'kn' ? d.name_kn : d.name_en}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="category-select" className="visually-hidden">
              {t('category')}
            </label>
            <select
              id="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="filter-select"
              data-testid="category-filter-select"
            >
              <option value="">{t('allCategories')}</option>
              {CATEGORIES.map((cat) => {
                const key = `cat_${cat}` as TranslationKey;
                return (
                  <option key={cat} value={cat}>
                    {t(key)}
                  </option>
                );
              })}
            </select>
          </div>

          <label className="checkbox-label" htmlFor="offbeat-toggle">
            <input
              id="offbeat-toggle"
              type="checkbox"
              checked={isOffbeatOnly}
              onChange={(e) => setIsOffbeatOnly(e.target.checked)}
              data-testid="offbeat-filter-checkbox"
            />
            <span>⭐ {t('offbeatOnly')}</span>
          </label>

          {hasActiveFilters && (
            <button
              type="button"
              className="btn-reset-filters"
              onClick={resetFilters}
              data-testid="reset-filters-btn"
            >
              ✕ {t('filterReset')}
            </button>
          )}
        </div>
      </div>

      <div className="results-header">
        <span className="results-counter" data-testid="results-counter">
          {totalCount} {t('destinationsFound')}
        </span>
      </div>

      {loading && (
        <div className="loading-state" data-testid="discovery-loading">
          <div className="spinner" aria-hidden="true" />
          <p>{t('loadingDestinations')}</p>
        </div>
      )}

      {!loading && errorMessage && (
        <div className="error-panel" data-testid="discovery-error">
          <div className="error-icon" aria-hidden="true">⚠️</div>
          <h3>{t('errorTitle')}</h3>
          <p>{errorMessage}</p>
          <button type="button" className="btn-primary" onClick={() => loadData()}>
            {t('retryButton')}
          </button>
        </div>
      )}

      {!loading && !errorMessage && destinations.length === 0 && (
        <div className="empty-state" data-testid="discovery-empty">
          <div className="empty-icon" aria-hidden="true">🏞️</div>
          <h3>{t('noDestinationsFound')}</h3>
          <p>{t('clearFiltersToSeeMore')}</p>
          {hasActiveFilters && (
            <button type="button" className="btn-secondary" onClick={resetFilters}>
              {t('filterReset')}
            </button>
          )}
        </div>
      )}

      {!loading && !errorMessage && destinations.length > 0 && (
        <div className="destinations-grid" data-testid="destinations-grid">
          {destinations.map((dest) => (
            <DestinationCard
              key={dest.id}
              destination={dest}
              language={language}
              onSelect={setActiveDestination}
              onPlanAround={onPlanWithDestination}
            />
          ))}
        </div>
      )}

      {activeDestination && (
        <DestinationModal
          destination={activeDestination}
          language={language}
          onClose={() => setActiveDestination(null)}
          onPlanAround={onPlanWithDestination}
        />
      )}
    </section>
  );
};
