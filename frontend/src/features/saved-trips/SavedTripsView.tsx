import React, { useState, useEffect, useCallback } from 'react';
import { SavedTrip, SavedTripSummary, SavedTripDetail, Language } from '../../types';
import { useTranslation } from '../../lib/i18n';
import { listCloudTrips, deleteCloudTrip, getCloudTrip, saveCloudTrip, ApiClientError } from '../../lib/api';
import { updateGuestTripSyncStatus } from '../../services/guestStorage';
import { GuestTransferModal } from './GuestTransferModal';

interface SavedTripsViewProps {
  savedTrips: SavedTrip[];
  language: Language;
  onSelectTrip: (trip: SavedTrip) => void;
  onDeleteTrip: (id: string) => void;
  onNavigatePlanner: () => void;
  authToken?: string | null;
  onAuthTokenChange?: (token: string | null) => void;
  onSelectCloudTrip?: (tripDetail: SavedTripDetail) => void;
}

export const SavedTripsView: React.FC<SavedTripsViewProps> = ({
  savedTrips,
  language,
  onSelectTrip,
  onDeleteTrip,
  onNavigatePlanner,
  authToken = null,
  onAuthTokenChange,
  onSelectCloudTrip,
}) => {
  const { t } = useTranslation(language);
  const [activeSubTab, setActiveSubTab] = useState<'local' | 'cloud'>('local');

  // Cloud state
  const [cloudTrips, setCloudTrips] = useState<SavedTripSummary[]>([]);
  const [isLoadingCloud, setIsLoadingCloud] = useState<boolean>(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [tripToDeleteCloud, setTripToDeleteCloud] = useState<SavedTripSummary | null>(null);
  const [isDeletingCloud, setIsDeletingCloud] = useState<boolean>(false);
  const [tokenInput, setTokenInput] = useState<string>('');

  // Count unlinked local trips
  const unlinkedTripsCount = savedTrips.filter((t) => !t.cloud_trip_id).length;

  const fetchCloudTrips = useCallback(() => {
    if (!authToken) {
      setCloudTrips([]);
      return;
    }
    setIsLoadingCloud(true);
    setCloudError(null);

    listCloudTrips(authToken)
      .then((res) => {
        setCloudTrips(res.items);
      })
      .catch((err) => {
        if (err instanceof ApiClientError) {
          setCloudError(
            err.status === 401
              ? t('formValidationError')
              : `${err.message} (Using local fallback)`
          );
        } else {
          setCloudError(t('networkError'));
        }
      })
      .finally(() => {
        setIsLoadingCloud(false);
      });
  }, [authToken, t]);

  // Fetch cloud trips when switching to cloud tab or changing auth token
  useEffect(() => {
    if (activeSubTab === 'cloud' && authToken) {
      fetchCloudTrips();
    } else if (!authToken) {
      // Clear cloud state on sign-out to prevent cross-account cache leakage
      setCloudTrips([]);
    }
  }, [activeSubTab, authToken, fetchCloudTrips]);

  const handleSignIn = (token: string) => {
    if (onAuthTokenChange) {
      onAuthTokenChange(token);
    }
    setShowAuthModal(false);
    setActiveSubTab('cloud');
  };

  const handleSignOut = () => {
    if (onAuthTokenChange) {
      onAuthTokenChange(null);
    }
    setCloudTrips([]);
    setActiveSubTab('local');
  };

  const handleConfirmDeleteCloudTrip = async () => {
    if (!authToken || !tripToDeleteCloud) return;
    setIsDeletingCloud(true);
    try {
      await deleteCloudTrip(tripToDeleteCloud.id, authToken);
      setCloudTrips((prev) => prev.filter((item) => item.id !== tripToDeleteCloud.id));
      setTripToDeleteCloud(null);
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to delete cloud trip';
      setCloudError(msg);
    } finally {
      setIsDeletingCloud(false);
    }
  };

  const handleViewCloudTrip = async (tripId: string) => {
    if (!authToken || !onSelectCloudTrip) return;
    try {
      const detail = await getCloudTrip(tripId, authToken);
      onSelectCloudTrip(detail);
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to load cloud trip details';
      setCloudError(msg);
    }
  };

  const handleSingleTripTransfer = async (trip: SavedTrip) => {
    if (!authToken) {
      setShowAuthModal(true);
      return;
    }
    try {
      const payload = {
        title: trip.title,
        origin_label: trip.request.origin_label,
        duration_days: trip.request.duration_days,
        pace: trip.request.pace,
        is_offbeat_preferred: trip.request.is_offbeat_preferred,
        budget_min_inr: trip.plan.items.reduce((sum, item) => sum + (item.entry_fee_min_inr || 0), 0),
        budget_max_inr: trip.plan.items.reduce((sum, item) => sum + (item.entry_fee_max_inr || 0), 0),
        currency_code: 'INR',
        itinerary: trip.plan,
      };
      const idempotencyKey = `import-${trip.id}`;
      const cloudTrip = await saveCloudTrip(payload, authToken, idempotencyKey);
      updateGuestTripSyncStatus(trip.id, 'synced', cloudTrip.id);
      fetchCloudTrips();
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to transfer trip to cloud.';
      setCloudError(msg);
    }
  };

  return (
    <section className="saved-trips-section" aria-label="Saved Itineraries">
      <div className="section-intro">
        <h2>{t('savedTripsTitle')}</h2>
        <p className="section-description">
          Review, reopen, or manage itineraries you have planned and saved on this device or in your cloud account.
        </p>
      </div>

      {/* Cloud Persistence Notice & Account Controls */}
      <div className="supabase-status-notice" data-testid="supabase-status-notice">
        <div className="notice-icon" aria-hidden="true">☁️</div>
        <div style={{ flex: 1 }}>
          <h4>{t('accountOverviewTitle')}</h4>
          <p>{t('supabaseNoticeDesc')}</p>
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {authToken ? (
              <>
                <span className="badge badge-success" data-testid="auth-status-badge">
                  ✓ {t('signedInAs')}: {authToken.slice(0, 16)}...
                </span>
                <button
                  type="button"
                  className="btn-danger-outline btn-sm"
                  onClick={handleSignOut}
                  data-testid="sign-out-btn"
                >
                  {t('signOutButton')}
                </button>
              </>
            ) : (
              <>
                <span className="badge badge-neutral" data-testid="guest-status-badge">
                  👤 {t('guestModeActive')}
                </span>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => setShowAuthModal(true)}
                  data-testid="connect-account-btn"
                >
                  🔐 {t('signInButton')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Authentication Modal / Inline Token Form */}
      {showAuthModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" data-testid="auth-modal">
          <div className="modal-card" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>🔐 {t('signInButton')}</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowAuthModal(false)}
                aria-label={t('close')}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Enter your Supabase JWT or Bearer session token to synchronize and manage itineraries across devices.
              </p>
              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Bearer Token:
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="eyJhbGciOiJIUzI1Ni... or test-token-user-1"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}
                  data-testid="token-input"
                />
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    handleSignIn('test-token-user-1');
                  }}
                  data-testid="demo-user-btn"
                >
                  ⚡ Use Demo User
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    if (tokenInput.trim()) {
                      handleSignIn(tokenInput.trim());
                    }
                  }}
                  disabled={!tokenInput.trim()}
                  data-testid="submit-auth-btn"
                >
                  ✓ Connect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guest-to-Account Transfer Modal */}
      {showTransferModal && authToken && (
        <GuestTransferModal
          isOpen={showTransferModal}
          savedTrips={savedTrips}
          authToken={authToken}
          language={language}
          onClose={() => setShowTransferModal(false)}
          onTransferComplete={() => {
            fetchCloudTrips();
          }}
        />
      )}

      {/* Cloud Deletion Confirmation Modal */}
      {tripToDeleteCloud && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" data-testid="delete-cloud-modal">
          <div className="modal-card" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3>🗑️ {t('confirmDeleteCloudTitle')}</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setTripToDeleteCloud(null)}
                disabled={isDeletingCloud}
                aria-label={t('close')}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                {t('confirmDeleteCloudMsg')}
              </p>
              <div style={{ fontWeight: 600, marginBottom: '1.25rem' }}>
                "{tripToDeleteCloud.title}"
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setTripToDeleteCloud(null)}
                  disabled={isDeletingCloud}
                >
                  {t('close')}
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={handleConfirmDeleteCloudTrip}
                  disabled={isDeletingCloud}
                  data-testid="confirm-delete-cloud-btn"
                >
                  {isDeletingCloud ? 'Deleting...' : t('deleteCloudTrip')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tabs: Device Trips (Guest) vs Cloud Account Trips */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '1.5rem' }}>
        <button
          type="button"
          onClick={() => setActiveSubTab('local')}
          className={`filter-btn ${activeSubTab === 'local' ? 'active' : ''}`}
          data-testid="subtab-local-trips"
        >
          📱 {t('deviceTripsTab')} ({savedTrips.length})
        </button>
        <button
          type="button"
          onClick={() => {
            if (!authToken) {
              setShowAuthModal(true);
            } else {
              setActiveSubTab('cloud');
            }
          }}
          className={`filter-btn ${activeSubTab === 'cloud' ? 'active' : ''}`}
          data-testid="subtab-cloud-trips"
        >
          ☁️ {t('myCloudTripsTab')} {authToken ? `(${cloudTrips.length})` : ''}
        </button>
      </div>

      {cloudError && (
        <div className="app-error-banner" role="alert" style={{ marginBottom: '1rem' }} data-testid="cloud-error-banner">
          <span>⚠️ {cloudError}</span>
          <button type="button" onClick={() => setCloudError(null)}>✕</button>
        </div>
      )}

      {/* 1. Device Local Trips View (Guest) */}
      {activeSubTab === 'local' && (
        <>
          {authToken && unlinkedTripsCount > 0 && (
            <div
              style={{
                backgroundColor: 'var(--bg-highlight, #f0fdf4)',
                border: '1px solid #86efac',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
              data-testid="transfer-banner"
            >
              <span style={{ fontSize: '0.9rem', color: '#166534', fontWeight: 500 }}>
                💡 {unlinkedTripsCount} {language === 'kn' ? 'ಪ್ರವಾಸಗಳು ಖಾತೆಗೆ ವರ್ಗಾಯಿಸಲು ಲಭ್ಯವಿದೆ.' : 'trip(s) saved on this device can be transferred to your account.'}
              </span>
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() => setShowTransferModal(true)}
                data-testid="open-transfer-modal-btn"
              >
                ☁️ {t('guestTransferAction')}
              </button>
            </div>
          )}

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
                    {trip.cloud_trip_id ? (
                      <span
                        className="badge badge-success"
                        style={{ fontSize: '0.75rem' }}
                        data-testid={`badge-cloud-${trip.id}`}
                      >
                        ☁️ {t('cloudSavedBadge')}
                      </span>
                    ) : (
                      <span
                        className="badge badge-cached"
                        style={{ background: '#fef3c7', color: '#b45309', fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px' }}
                        data-testid={`badge-device-${trip.id}`}
                      >
                        📱 {t('localOnlyBadge')}
                      </span>
                    )}
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
                    {authToken && !trip.cloud_trip_id && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleSingleTripTransfer(trip)}
                        data-testid={`transfer-btn-${trip.id}`}
                      >
                        ☁️ {t('transferSelectedBtn')}
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-danger-outline"
                      onClick={() => onDeleteTrip(trip.id)}
                      data-testid={`delete-saved-${trip.id}`}
                    >
                      {t('removeLocalTrip')}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {/* 2. Cloud Account Trips View */}
      {activeSubTab === 'cloud' && (
        isLoadingCloud ? (
          <div style={{ textAlign: 'center', padding: '3rem' }} data-testid="loading-cloud-trips">
            <div className="loading-spinner" aria-hidden="true" />
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading cloud trips...</p>
          </div>
        ) : cloudTrips.length === 0 ? (
          <div className="empty-saved-trips" data-testid="no-cloud-trips">
            <div className="empty-icon" aria-hidden="true">☁️</div>
            <h3>{t('cloudTripsEmpty')}</h3>
            <p>Save an itinerary to the cloud using the planner to access it across devices.</p>
            <button
              type="button"
              className="btn-primary"
              onClick={onNavigatePlanner}
            >
              ✨ {t('navPlan')}
            </button>
          </div>
        ) : (
          <div className="saved-trips-grid" data-testid="cloud-trips-grid">
            {cloudTrips.map((trip) => (
              <article key={trip.id} className="saved-trip-card" data-testid={`cloud-trip-${trip.id}`}>
                <div className="saved-trip-header">
                  <span className="badge badge-success">
                    ☁️ {t('cloudSavedBadge')} · {trip.duration_days} {language === 'kn' ? 'ದಿನಗಳು' : 'Days'} · {trip.total_stops} stops
                  </span>
                  <span className="saved-trip-date">
                    {t('savedOn')} {new Date(trip.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="saved-trip-title">{trip.title}</h3>
                <p className="saved-trip-origin">
                  Origin: <strong>{trip.origin_label}</strong> · Pace: <strong>{trip.pace}</strong>
                </p>

                <div className="saved-trip-actions">
                  {onSelectCloudTrip && (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleViewCloudTrip(trip.id)}
                      data-testid={`view-cloud-${trip.id}`}
                    >
                      {t('viewSavedTrip')}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-danger-outline"
                    onClick={() => setTripToDeleteCloud(trip)}
                    data-testid={`delete-cloud-${trip.id}`}
                  >
                    {t('deleteCloudTrip')}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )
      )}
    </section>
  );
};
