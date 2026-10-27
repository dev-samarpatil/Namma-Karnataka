import React, { useEffect, useState, useCallback } from 'react';
import {
  DestinationRead,
  DestinationCategory,
  Language,
  KARNATAKA_DISTRICTS,
} from '../../types';
import { listDestinations, ApiClientError } from '../../lib/api';
import { useTranslation, TranslationKey } from '../../lib/i18n';
import {
  saveOfflineDestinations,
  getOfflineDestinations,
  getOfflineCatalogueMetadata,
  filterOfflineDestinations,
} from '../../services/offlineStorage';
import { DestinationCard } from './DestinationCard';
import { DestinationModal } from './DestinationModal';
import { DestinationInteractiveMap } from './DestinationInteractiveMap';
import { VisualDiscoveryModal } from './VisualDiscoveryModal';
import { VisualDiscoveryCard } from './VisualDiscoveryCard';
import { VisualDiscoveryCandidate } from '../../types';

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
  const [isOfflineData, setIsOfflineData] = useState<boolean>(false);
  const [cachedTime, setCachedTime] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [feeType, setFeeType] = useState<string>('');
  const [durationFilter, setDurationFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('');
  const [isOffbeatOnly, setIsOffbeatOnly] = useState<boolean>(false);

  // Phase 7: Interactive Map & Visual Discovery
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isVisualDiscoveryOpen, setIsVisualDiscoveryOpen] = useState<boolean>(false);
  const [mapActiveDestId, setMapActiveDestId] = useState<string | null>(null);

  // Modal
  const [activeDestination, setActiveDestination] = useState<DestinationRead | null>(null);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setErrorMessage(null);

    let minDur: number | undefined;
    let maxDur: number | undefined;
    if (durationFilter === 'under_1h') {
      maxDur = 59;
    } else if (durationFilter === '1_to_2h') {
      minDur = 60;
      maxDur = 120;
    } else if (durationFilter === 'over_2h') {
      minDur = 121;
    }

    const filterParams = {
      q: searchQuery.trim() || undefined,
      district: selectedDistrict || undefined,
      category: (selectedCategory as DestinationCategory) || undefined,
      fee_type: (feeType as 'free' | 'paid' | 'unknown') || undefined,
      min_duration: minDur,
      max_duration: maxDur,
      sort_by: (sortBy as 'name' | 'district' | 'duration_asc' | 'duration_desc') || undefined,
      is_offbeat: isOffbeatOnly ? true : undefined,
      lang: language,
      limit: 100,
      offset: 0,
    };

    try {
      const response = await listDestinations(filterParams, signal);
      setDestinations(response.items);
      setTotalCount(response.total);
      setIsOfflineData(false);

      // Cache catalogue for offline PWA availability
      if (!searchQuery && !selectedDistrict && !selectedCategory && !isOffbeatOnly && !feeType && !durationFilter && !sortBy) {
        saveOfflineDestinations(response.items, response.has_more);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;

      // Resilient Offline Fallback from local device cache
      const cached = getOfflineDestinations();
      if (cached && cached.length > 0) {
        const filtered = filterOfflineDestinations(cached, filterParams);
        setDestinations(filtered);
        setTotalCount(filtered.length);
        setIsOfflineData(true);
        const meta = getOfflineCatalogueMetadata();
        if (meta?.cached_at) {
          setCachedTime(new Date(meta.cached_at).toLocaleTimeString());
        }
      } else if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(t('networkError'));
      }
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedDistrict, selectedCategory, feeType, durationFilter, sortBy, isOffbeatOnly, language, t]);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedDistrict('');
    setSelectedCategory('');
    setFeeType('');
    setDurationFilter('');
    setSortBy('');
    setIsOffbeatOnly(false);
  };

  const hasActiveFilters = Boolean(
    searchQuery || selectedDistrict || selectedCategory || feeType || durationFilter || sortBy || isOffbeatOnly
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
        <div className="search-bar-row">
          <div className="search-bar" style={{ width: '100%' }}>
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

          <div className="filter-group">
            <label htmlFor="fee-select" className="visually-hidden">
              {t('feeTypeFilter')}
            </label>
            <select
              id="fee-select"
              value={feeType}
              onChange={(e) => setFeeType(e.target.value)}
              className="filter-select"
              data-testid="fee-filter-select"
            >
              <option value="">{t('feeAll')}</option>
              <option value="free">{t('feeFreeOnly')}</option>
              <option value="paid">{t('feePaidOnly')}</option>
              <option value="unknown">{t('feeUnknownOnly')}</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="duration-select" className="visually-hidden">
              {t('durationFilter')}
            </label>
            <select
              id="duration-select"
              value={durationFilter}
              onChange={(e) => setDurationFilter(e.target.value)}
              className="filter-select"
              data-testid="duration-filter-select"
            >
              <option value="">{t('durationAll')}</option>
              <option value="under_1h">{t('durationUnder1h')}</option>
              <option value="1_to_2h">{t('duration1to2h')}</option>
              <option value="over_2h">{t('durationOver2h')}</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="sort-select" className="visually-hidden">
              {t('sortBy')}
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
              data-testid="sort-filter-select"
            >
              <option value="">{t('sortBy')}</option>
              <option value="name">{t('sortName')}</option>
              <option value="district">{t('sortDistrict')}</option>
              <option value="duration_asc">{t('sortDurationAsc')}</option>
              <option value="duration_desc">{t('sortDurationDesc')}</option>
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
              ✕ {t('clearAll')}
            </button>
          )}
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="active-filter-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>{t('activeFilters')}:</span>
            {searchQuery && (
              <span className="filter-chip" style={{ background: '#e0e7ff', color: '#3730a3', padding: '3px 8px', borderRadius: '16px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                "{searchQuery}" <button type="button" onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
              </span>
            )}
            {selectedDistrict && (
              <span className="filter-chip" style={{ background: '#e0e7ff', color: '#3730a3', padding: '3px 8px', borderRadius: '16px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {KARNATAKA_DISTRICTS.find(d => d.code === selectedDistrict)?.name_en} <button type="button" onClick={() => setSelectedDistrict('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
              </span>
            )}
            {selectedCategory && (
              <span className="filter-chip" style={{ background: '#e0e7ff', color: '#3730a3', padding: '3px 8px', borderRadius: '16px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {t(`cat_${selectedCategory}` as TranslationKey)} <button type="button" onClick={() => setSelectedCategory('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
              </span>
            )}
            {feeType && (
              <span className="filter-chip" style={{ background: '#e0e7ff', color: '#3730a3', padding: '3px 8px', borderRadius: '16px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {feeType === 'free' ? t('feeFreeOnly') : feeType === 'paid' ? t('feePaidOnly') : t('feeUnknownOnly')} <button type="button" onClick={() => setFeeType('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
              </span>
            )}
            {durationFilter && (
              <span className="filter-chip" style={{ background: '#e0e7ff', color: '#3730a3', padding: '3px 8px', borderRadius: '16px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {durationFilter === 'under_1h' ? t('durationUnder1h') : durationFilter === '1_to_2h' ? t('duration1to2h') : t('durationOver2h')} <button type="button" onClick={() => setDurationFilter('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
              </span>
            )}
            {sortBy && (
              <span className="filter-chip" style={{ background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '16px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {sortBy === 'name' ? t('sortName') : sortBy === 'district' ? t('sortDistrict') : sortBy === 'duration_asc' ? t('sortDurationAsc') : t('sortDurationDesc')} <button type="button" onClick={() => setSortBy('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
              </span>
            )}
            {isOffbeatOnly && (
              <span className="filter-chip" style={{ background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '16px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                ⭐ {t('offbeatBadge')} <button type="button" onClick={() => setIsOffbeatOnly(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* NK-FIX-05: Dedicated Visual Discovery Card */}
      <VisualDiscoveryCard
        language={language}
        onSelectCandidate={(candidate: VisualDiscoveryCandidate) => {
          const query = language === 'kn' && candidate.name_kn ? candidate.name_kn : candidate.name_en;
          setSearchQuery(query);
        }}
        onOpenDestinationDetailsBySlug={(slug: string) => {
          const match = destinations.find((d) => d.slug === slug);
          if (match) {
            setActiveDestination(match);
          } else {
            setSearchQuery(slug);
          }
        }}
      />

      <div className="results-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="results-counter" data-testid="results-counter">
            {totalCount} {t('destinationsFound')}
          </span>
          {isOfflineData && (
            <span className="badge badge-cached" data-testid="offline-cached-badge" style={{ fontSize: '0.85rem', color: '#b45309', background: '#fef3c7', padding: '4px 8px', borderRadius: '4px' }}>
              ⚡ {t('cachedBadge')} {cachedTime ? `(${t('cachedAt')} ${cachedTime})` : ''}
            </span>
          )}
        </div>

        <div className="view-mode-toggle-group" style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`btn-mode-toggle ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            data-testid="toggle-view-list"
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: viewMode === 'list' ? '#4f46e5' : '#ffffff',
              color: viewMode === 'list' ? '#ffffff' : '#374151',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            📋 {t('toggleListView')}
          </button>
          <button
            type="button"
            className={`btn-mode-toggle ${viewMode === 'map' ? 'active' : ''}`}
            onClick={() => setViewMode('map')}
            data-testid="toggle-view-map"
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: viewMode === 'map' ? '#4f46e5' : '#ffffff',
              color: viewMode === 'map' ? '#ffffff' : '#374151',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            🗺️ {t('toggleMapView')}
          </button>
        </div>
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
        viewMode === 'map' ? (
          <DestinationInteractiveMap
            destinations={destinations}
            selectedDistrict={selectedDistrict}
            language={language}
            activeDestinationId={mapActiveDestId}
            onSelectDestination={(dest) => setMapActiveDestId(dest.id)}
            onOpenDetails={(dest) => setActiveDestination(dest)}
            onPlanWithDestination={onPlanWithDestination}
          />
        ) : (
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
        )
      )}

      {activeDestination && (
        <DestinationModal
          destination={activeDestination}
          language={language}
          onClose={() => setActiveDestination(null)}
          onPlanAround={onPlanWithDestination}
        />
      )}

      {isVisualDiscoveryOpen && (
        <VisualDiscoveryModal
          isOpen={isVisualDiscoveryOpen}
          onClose={() => setIsVisualDiscoveryOpen(false)}
          language={language}
          onSelectCandidate={(candidate: VisualDiscoveryCandidate) => {
            const matched = destinations.find((d) => d.id === candidate.destination_id || d.slug === candidate.slug);
            if (matched) {
              onPlanWithDestination(matched);
            }
          }}
          onOpenDestinationDetailsBySlug={(slug: string) => {
            const matched = destinations.find((d) => d.slug === slug);
            if (matched) {
              setActiveDestination(matched);
            }
          }}
        />
      )}
    </section>
  );
};
