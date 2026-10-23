import React from 'react';
import { SavedTrip, Language } from '../../types';
import { useTranslation } from '../../lib/i18n';

interface SavedTripsViewProps {
  savedTrips: SavedTrip[];
  language: Language;
  onSelectTrip: (trip: SavedTrip) => void;
  onDeleteTrip: (id: string) => void;
  onNavigatePlanner: () => void;
}

export const SavedTripsView: React.FC<SavedTripsViewProps> = ({
  savedTrips,
  language,
  onSelectTrip,
  onDeleteTrip,
  onNavigatePlanner,
}) => {
  const { t } = useTranslation(language);

  return (
    <section className="saved-trips-section" aria-label="Saved Itineraries">
      <div className="section-intro">
        <h2>{t('savedTripsTitle')}</h2>
        <p className="section-description">
          Review, reopen, or manage itineraries you have planned and saved on this device.
        </p>
      </div>

      {/* Cloud Sync Status Notice */}
      <div className="supabase-status-notice" data-testid="supabase-status-notice">
        <div className="notice-icon" aria-hidden="true">☁️</div>
        <div>
          <h4>{t('supabaseNoticeTitle')}</h4>
          <p>{t('supabaseNoticeDesc')}</p>
        </div>
      </div>

      {savedTrips.length === 0 ? (
        <div className="empty-saved-trips" data-testid="no-saved-trips">
          <div className="empty-icon" aria-hidden="true">📭</div>
          <h3>{t('noSavedTrips')}</h3>
          <p>{t('noSavedTripsDesc')}</p>
          <button
            type="button"
            className="btn-primary"
            onClick={onNavigatePlanner}
            data-testid="create-trip-btn"
          >
            ✨ {t('navPlan')}
          </button>
        </div>
      ) : (
        <div className="saved-trips-grid" data-testid="saved-trips-grid">
          {savedTrips.map((trip) => (
            <article key={trip.id} className="saved-trip-card" data-testid={`saved-trip-${trip.id}`}>
              <div className="saved-trip-header">
                <span className="badge badge-neutral">
                  📅 {trip.plan.duration_days} {language === 'kn' ? 'ದಿನಗಳು' : 'Days'} · {trip.plan.items.length} stops
                </span>
                <span className="saved-trip-date">
                  {t('savedOn')} {new Date(trip.saved_at).toLocaleDateString()}
                </span>
              </div>

              <h3 className="saved-trip-title">{trip.title}</h3>
              <p className="saved-trip-origin">
                Origin: <strong>{trip.request.origin_label}</strong> · Pace:{' '}
                <strong>{trip.request.pace}</strong>
              </p>

              <div className="saved-trip-stops-preview">
                {trip.plan.items.slice(0, 4).map((stop) => (
                  <span key={stop.id} className="preview-pill">
                    {stop.name}
                  </span>
                ))}
                {trip.plan.items.length > 4 && (
                  <span className="preview-more">+{trip.plan.items.length - 4} more</span>
                )}
              </div>

              <div className="saved-trip-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => onSelectTrip(trip)}
                  data-testid={`view-saved-${trip.id}`}
                >
                  {t('viewSavedTrip')}
                </button>
                <button
                  type="button"
                  className="btn-danger-outline"
                  onClick={() => onDeleteTrip(trip.id)}
                  data-testid={`delete-saved-${trip.id}`}
                >
                  {t('deleteTrip')}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
