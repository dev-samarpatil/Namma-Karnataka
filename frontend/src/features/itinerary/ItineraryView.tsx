import React, { useState } from 'react';
import {
  PlanningRecommendationResponse,
  RecommendedDestination,
  Language,
} from '../../types';
import { useTranslation, TranslationKey } from '../../lib/i18n';
import { BudgetSummary } from './BudgetSummary';
import { MapView } from './MapView';

interface ItineraryViewProps {
  plan: PlanningRecommendationResponse | null;
  language: Language;
  onReplan: () => void;
  onSaveTrip: (plan: PlanningRecommendationResponse) => void;
  isSaved?: boolean;
}

export const ItineraryView: React.FC<ItineraryViewProps> = ({
  plan,
  language,
  onReplan,
  onSaveTrip,
  isSaved = false,
}) => {
  const { t } = useTranslation(language);
  const [showMap, setShowMap] = useState<boolean>(true);

  if (!plan || plan.items.length === 0) {
    return (
      <section className="itinerary-empty-section" data-testid="itinerary-empty">
        <div className="empty-icon" aria-hidden="true">🗺️</div>
        <h2>{t('navItinerary')}</h2>
        <p>No active itinerary yet. Tell us where you want to go in the Trip Planner to craft one.</p>
        <button type="button" className="btn-primary" onClick={onReplan}>
          ✨ {t('navPlan')}
        </button>
      </section>
    );
  }

  // Group stops by day number in strict chronological order
  const dayGroups: Record<number, RecommendedDestination[]> = {};
  for (const item of plan.items) {
    if (!dayGroups[item.day_number]) {
      dayGroups[item.day_number] = [];
    }
    dayGroups[item.day_number].push(item);
  }

  // Sort stops within each day by order
  Object.keys(dayGroups).forEach((dayStr) => {
    const day = Number(dayStr);
    dayGroups[day].sort((a, b) => a.order - b.order);
  });

  const sortedDays = Object.keys(dayGroups)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <section className="itinerary-section" aria-label="Generated Itinerary">
      <div className="itinerary-header">
        <div>
          <div className="itinerary-badges">
            {plan.generation_mode === 'ai' ? (
              <span className="badge badge-ai" data-testid="generation-mode-ai">
                ✨ {t('modeAi')} ({plan.provider_used.toUpperCase()})
              </span>
            ) : (
              <span className="badge badge-fallback" data-testid="generation-mode-fallback">
                🛡️ {t('modeFallback')}
              </span>
            )}
            <span className="badge badge-neutral">
              📅 {plan.duration_days} {language === 'kn' ? 'ದಿನಗಳು' : 'Days'} · {plan.total_destinations} {t('destinationsFound')}
            </span>
          </div>
          <h2>{t('itineraryTitle')}</h2>
        </div>

        <div className="itinerary-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowMap(!showMap)}
            data-testid="toggle-map-btn"
          >
            {showMap ? `🗺️ ${t('hideMap')}` : `🗺️ ${t('viewOnMap')}`}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={onReplan}
            data-testid="adjust-preferences-btn"
          >
            ⚙️ {t('adjustPreferences')}
          </button>
          <button
            type="button"
            className={`btn-primary ${isSaved ? 'btn-saved' : ''}`}
            onClick={() => onSaveTrip(plan)}
            data-testid="save-trip-btn"
          >
            {isSaved ? `✓ Saved` : `💾 ${t('saveItinerary')}`}
          </button>
        </div>
      </div>

      {/* Embedded Map Section */}
      {showMap && <MapView stops={plan.items} language={language} />}

      {/* Embedded Budget Breakdown Section */}
      <BudgetSummary stops={plan.items} language={language} />

      {/* Chronological Day-by-Day Timeline */}
      <div className="timeline-container" data-testid="itinerary-timeline">
        {sortedDays.map((dayNum) => (
          <div key={dayNum} className="timeline-day-block" data-testid={`day-block-${dayNum}`}>
            <div className="day-header">
              <span className="day-pill">{t('day')} {dayNum}</span>
              <span className="day-stops-count">{dayGroups[dayNum].length} stops</span>
            </div>

            <div className="day-stops-list">
              {dayGroups[dayNum].map((stop) => {
                const categoryKey = `cat_${stop.category}` as TranslationKey;
                const categoryLabel = t(categoryKey) || stop.category;

                return (
                  <article key={stop.id} className="timeline-stop-card" data-testid={`stop-card-${stop.slug}`}>
                    <div className="stop-order-indicator">
                      <span className="order-number">{stop.order}</span>
                    </div>

                    <div className="stop-content">
                      <div className="stop-header-row">
                        <h4 className="stop-name">{stop.name}</h4>
                        <div className="stop-pills">
                          <span className="card-category-pill">{categoryLabel}</span>
                          <span className="card-district-pill">📍 {stop.district_name || stop.district_code}</span>
                          {stop.is_offbeat && (
                            <span className="card-offbeat-badge">⭐ {t('offbeatBadge')}</span>
                          )}
                        </div>
                      </div>

                      {stop.summary && <p className="stop-summary">{stop.summary}</p>}

                      <div className="stop-rationale-box">
                        <strong>{t('whyThisStop')}</strong> {stop.rationale}
                      </div>

                      <div className="stop-footer-row">
                        <span className="stop-fee-info">
                          🎟️ Entry:{' '}
                          {stop.entry_fee_min_inr === 0 && stop.entry_fee_max_inr === 0 ? (
                            <span className="text-free">{t('feeFree')}</span>
                          ) : stop.entry_fee_min_inr !== undefined && stop.entry_fee_min_inr !== null ? (
                            <span>
                              ₹{stop.entry_fee_min_inr}
                              {stop.entry_fee_max_inr && stop.entry_fee_max_inr > stop.entry_fee_min_inr
                                ? ` - ₹${stop.entry_fee_max_inr}`
                                : ''}
                            </span>
                          ) : (
                            <span className="text-unknown">{t('feeUnknown')}</span>
                          )}
                        </span>

                        {stop.coordinates && (
                          <span className="stop-coords-text">
                            📍 {stop.coordinates.lat.toFixed(4)}° N, {stop.coordinates.lon.toFixed(4)}° E
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
