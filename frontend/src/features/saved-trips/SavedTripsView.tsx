import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles,
  Cloud,
  Check,
  User,
  Lock,
  X,
  Smartphone,
  AlertTriangle,
  CloudUpload,
  LogOut,
  MapPin,
  Trash2,
  CheckSquare,
  Square,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  SavedTrip,
  SavedTripSummary,
  SavedTripDetail,
  Language,
  SaveCloudTripPayload,
} from '../../types';
import { useTranslation } from '../../lib/i18n';
import {
  listCloudTrips,
  deleteCloudTrip,
  getCloudTrip,
  saveCloudTrip,
  ApiClientError,
} from '../../lib/api';
import { updateGuestTripSyncStatus } from '../../services/guestStorage';
import { useAuth } from '../../context/useAuth';
import { AuthModal } from '../authentication/AuthModal';
import './SavedTripsView.css';

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
  const auth = useAuth();
  const effectiveAuthToken = auth.token || authToken;
  const isAuthenticated = Boolean(effectiveAuthToken);

  const [activeSubTab, setActiveSubTab] = useState<'local' | 'cloud'>('local');

  // Cloud trips state
  const [cloudTrips, setCloudTrips] = useState<SavedTripSummary[]>([]);
  const [isLoadingCloud, setIsLoadingCloud] = useState<boolean>(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modals & action states
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [tripToDeleteCloud, setTripToDeleteCloud] = useState<SavedTripSummary | null>(null);
  const [isDeletingCloud, setIsDeletingCloud] = useState<boolean>(false);
  const [transferringId, setTransferringId] = useState<string | null>(null);

  // Batch selection state for device trips
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchImporting, setIsBatchImporting] = useState<boolean>(false);
  const [dismissBanner, setDismissBanner] = useState<boolean>(false);

  // Unlinked device trips (not yet pushed to cloud)
  const unlinkedTrips = useMemo(
    () => savedTrips.filter((t) => !t.cloud_trip_id),
    [savedTrips]
  );

  const fetchCloudTrips = useCallback(() => {
    if (!effectiveAuthToken) {
      setCloudTrips([]);
      return;
    }
    setIsLoadingCloud(true);
    setCloudError(null);

    listCloudTrips(effectiveAuthToken)
      .then((res) => {
        setCloudTrips(res.items || []);
      })
      .catch((err) => {
        if (err instanceof ApiClientError) {
          setCloudError(
            err.status === 401
              ? 'Session expired. Please sign in again.'
              : `${err.message} (Using local fallback)`
          );
        } else {
          setCloudError('Unable to load cloud itineraries. Please check connection.');
        }
      })
      .finally(() => {
        setIsLoadingCloud(false);
      });
  }, [effectiveAuthToken]);

  // Sync cloud trips when switching to cloud tab or auth token changes
  useEffect(() => {
    if (activeSubTab === 'cloud' && effectiveAuthToken) {
      fetchCloudTrips();
    } else if (!effectiveAuthToken) {
      setCloudTrips([]);
    }
  }, [activeSubTab, effectiveAuthToken, fetchCloudTrips]);

  const handleSignOut = () => {
    auth.signOut();
    if (onAuthTokenChange) {
      onAuthTokenChange(null);
    }
    setCloudTrips([]);
    setActiveSubTab('local');
    setSuccessToast('Signed out of cloud account. Device trips remain safe.');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Normalizes an itinerary into the canonical SaveCloudTripPayload
  const buildCanonicalPayload = (trip: SavedTrip): SaveCloudTripPayload => {
    const rawPace = trip.request?.pace;
    const normalizedPace: 'relaxed' | 'balanced' | 'packed' =
      rawPace === 'relaxed' || rawPace === 'packed' ? rawPace : 'balanced';

    const originLabel = trip.request?.origin_label || trip.plan.origin_label || 'Bengaluru';
    const durationDays = trip.request?.duration_days || trip.plan.duration_days || 1;

    const minBudget =
      trip.plan.budget_breakdown?.grand_total_min_inr ??
      trip.plan.items.reduce((sum, item) => sum + (item.entry_fee_min_inr || 0), 0);
    const maxBudget =
      trip.plan.budget_breakdown?.grand_total_max_inr ??
      trip.plan.items.reduce((sum, item) => sum + (item.entry_fee_max_inr || 0), 0);

    return {
      title: trip.title,
      origin_label: originLabel,
      duration_days: durationDays,
      pace: normalizedPace,
      is_offbeat_preferred: Boolean(trip.request?.is_offbeat_preferred),
      preferences: {
        ...(((trip.request as unknown as Record<string, unknown>)?.preferences as Record<string, unknown> | undefined) || {}),
        total_stops: trip.plan.items.length,
        language: trip.plan.language || 'en',
      },
      budget_min_inr: minBudget,
      budget_max_inr: maxBudget,
      currency_code: 'INR',
      itinerary: trip.plan,
    };
  };

  // Single trip transfer: Copy to Cloud + Preserve Device Copy
  const handleSingleTripTransfer = async (trip: SavedTrip) => {
    if (!effectiveAuthToken) {
      setShowAuthModal(true);
      return;
    }

    setTransferringId(trip.id);
    setCloudError(null);

    try {
      const payload = buildCanonicalPayload(trip);
      const idempotencyKey = `transfer-${trip.id}`;
      const cloudTrip = await saveCloudTrip(payload, effectiveAuthToken, idempotencyKey);

      // Link cloud ID in local guest storage
      updateGuestTripSyncStatus(trip.id, 'synced', cloudTrip.id);
      trip.cloud_trip_id = cloudTrip.id;
      trip.sync_status = 'synced';

      fetchCloudTrips();
      setSuccessToast(`"${trip.title}" synced to cloud successfully.`);
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err) {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : 'Failed to transfer trip to cloud. Please try again.';
      setCloudError(msg);
    } finally {
      setTransferringId(null);
    }
  };

  // Toggle single item selection
  const handleToggleSelect = (tripId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(tripId)) {
        next.delete(tripId);
      } else {
        next.add(tripId);
      }
      return next;
    });
  };

  // Select all or clear
  const handleToggleSelectAll = () => {
    if (selectedIds.size === savedTrips.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(savedTrips.map((t) => t.id)));
    }
  };

  // Batch import selected device trips to cloud
  const handleImportSelected = async () => {
    if (!effectiveAuthToken) {
      setShowAuthModal(true);
      return;
    }

    const tripsToImport = savedTrips.filter((t) => selectedIds.has(t.id));
    if (tripsToImport.length === 0) return;

    setIsBatchImporting(true);
    setCloudError(null);

    let importedCount = 0;
    let duplicateCount = 0;
    let failedCount = 0;

    for (const trip of tripsToImport) {
      if (trip.cloud_trip_id) {
        duplicateCount++;
        continue;
      }
      try {
        const payload = buildCanonicalPayload(trip);
        const idempotencyKey = `batch-import-${trip.id}`;
        const cloudTrip = await saveCloudTrip(payload, effectiveAuthToken, idempotencyKey);
        updateGuestTripSyncStatus(trip.id, 'synced', cloudTrip.id);
        trip.cloud_trip_id = cloudTrip.id;
        trip.sync_status = 'synced';
        importedCount++;
      } catch (err) {
        console.error(`Failed importing trip ${trip.id}:`, err);
        failedCount++;
      }
    }

    setIsBatchImporting(false);
    setSelectedIds(new Set());
    fetchCloudTrips();

    setSuccessToast(
      `${tripsToImport.length} selected → ${importedCount} imported, ${duplicateCount} already synced${failedCount > 0 ? `, ${failedCount} failed` : ''
      }`
    );
    setTimeout(() => setSuccessToast(null), 4500);
  };

  const handleConfirmDeleteCloudTrip = async () => {
    if (!effectiveAuthToken || !tripToDeleteCloud) return;
    setIsDeletingCloud(true);
    try {
      await deleteCloudTrip(tripToDeleteCloud.id, effectiveAuthToken);
      setCloudTrips((prev) => prev.filter((item) => item.id !== tripToDeleteCloud.id));
      setTripToDeleteCloud(null);
      setSuccessToast('Cloud itinerary removed.');
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to delete cloud trip';
      setCloudError(msg);
    } finally {
      setIsDeletingCloud(false);
    }
  };

  const handleViewCloudTrip = async (tripId: string) => {
    if (!effectiveAuthToken || !onSelectCloudTrip) return;
    try {
      const detail = await getCloudTrip(tripId, effectiveAuthToken);
      onSelectCloudTrip(detail);
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to load cloud trip details';
      setCloudError(msg);
    }
  };

  const userDisplayName =
    auth.profile?.full_name ||
    auth.user?.email ||
    (effectiveAuthToken ? 'Connected User' : null);

  return (
    <section className="saved-trips-dashboard" aria-label="Saved Itineraries">
      {/* 1. Page Header */}
      <div className="saved-trips-header">
        <div className="saved-trips-header-top">
          <h2 className="saved-trips-title">
            <span>{t('savedTripsTitle')}</span>
            <span className="saved-trips-title-kn">
              {language === 'kn' ? '(ನಿಮ್ಮ ಉಳಿಸಿದ ಪ್ರವಾಸಗಳು)' : ''}
            </span>
          </h2>
        </div>
        <p className="saved-trips-subtitle">
          Manage, revisit, and synchronize your Karnataka journeys.
        </p>
      </div>

      {/* 2. Compact Account & Sync Status */}
      <div className="saved-trips-status-bar" data-testid="supabase-status-notice">
        <div className="saved-trips-status-left">
          {isAuthenticated ? (
            <>
              <span
                className="status-indicator-badge connected"
                data-testid="auth-status-badge"
              >
                <Check size={13} strokeWidth={2.5} />
                <span>Cloud Connected</span>
              </span>
              <span className="status-user-identity" data-testid="status-user-identity">
                <User size={14} className="text-slate-500" />
                <span>{userDisplayName}</span>
              </span>
            </>
          ) : (
            <span
              className="status-indicator-badge guest"
              data-testid="guest-status-badge"
            >
              <Smartphone size={13} strokeWidth={2} />
              <span>{t('guestModeActive')} (Offline Storage)</span>
            </span>
          )}
        </div>

        <div className="saved-trips-status-right">
          {isAuthenticated ? (
            <button
              type="button"
              className="btn-danger-outline btn-sm"
              onClick={handleSignOut}
              data-testid="sign-out-btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <LogOut size={13} />
              <span>{t('signOutButton')}</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setShowAuthModal(true)}
              data-testid="connect-account-btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <Lock size={12} strokeWidth={2} />
              <span>{t('signInButton')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications / Toast */}
      {cloudError && (
        <div
          className="app-error-banner"
          role="alert"
          style={{
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
          data-testid="cloud-error-banner"
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={15} strokeWidth={2} />
            <span>{cloudError}</span>
          </span>
          <button
            type="button"
            onClick={() => setCloudError(null)}
            aria-label="Dismiss error"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
            }}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      )}

      {successToast && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #86efac',
            color: '#166534',
            padding: '0.65rem 1rem',
            borderRadius: '10px',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
          role="status"
          data-testid="saved-trips-toast"
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} strokeWidth={2.5} />
            <span>{successToast}</span>
          </span>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            aria-label="Dismiss notification"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 3. Modern Segmented Tabs */}
      <div className="saved-trips-tabs-bar">
        <div className="saved-trips-segmented-tabs">
          <button
            type="button"
            onClick={() => setActiveSubTab('local')}
            className={`saved-trips-tab-btn ${activeSubTab === 'local' ? 'active' : ''}`}
            data-testid="subtab-local-trips"
          >
            <Smartphone size={15} />
            <span>{t('deviceTripsTab')}</span>
            <span className="saved-trips-tab-count">{savedTrips.length}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!effectiveAuthToken) {
                setShowAuthModal(true);
              } else {
                setActiveSubTab('cloud');
              }
            }}
            className={`saved-trips-tab-btn ${activeSubTab === 'cloud' ? 'active' : ''}`}
            data-testid="subtab-cloud-trips"
          >
            <Cloud size={15} />
            <span>{t('myCloudTripsTab')}</span>
            <span className="saved-trips-tab-count">
              {effectiveAuthToken ? cloudTrips.length : 0}
            </span>
          </button>
        </div>
      </div>

      {/* 4. Compact Device → Cloud Import Banner */}
      {activeSubTab === 'local' &&
        savedTrips.length > 0 &&
        !dismissBanner && (
          <div className="saved-trips-import-banner" data-testid="transfer-banner">
            <div className="import-banner-info">
              <Sparkles size={16} className="text-teal-600 shrink-0" />
              <span>
                {unlinkedTrips.length > 0
                  ? `${unlinkedTrips.length} device trip(s) ready to sync to your cloud account.`
                  : 'All device trips are synced to your cloud account.'}
              </span>
            </div>

            <div className="import-banner-actions">
              <button
                type="button"
                className="banner-action-btn secondary"
                onClick={handleToggleSelectAll}
                data-testid="select-all-btn"
              >
                {selectedIds.size === savedTrips.length ? (
                  <>
                    <CheckSquare size={13} />
                    <span>Deselect All</span>
                  </>
                ) : (
                  <>
                    <Square size={13} />
                    <span>Select All</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="banner-action-btn primary"
                disabled={selectedIds.size === 0 || isBatchImporting}
                onClick={handleImportSelected}
                data-testid="import-selected-btn"
              >
                {isBatchImporting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <CloudUpload size={13} />
                    <span>
                      Import Selected ({selectedIds.size})
                    </span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="banner-dismiss-btn"
                onClick={() => setDismissBanner(true)}
                title="Dismiss banner"
                aria-label="Dismiss banner"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}

      {/* 5. Tab Content: Device Trips */}
      {activeSubTab === 'local' && (
        <>
          {savedTrips.length === 0 ? (
            <div className="saved-trips-clean-empty" data-testid="no-saved-trips">
              <div className="clean-empty-icon-circle">
                <Smartphone size={28} />
              </div>
              <h3 className="clean-empty-title">{t('noSavedTrips')}</h3>
              <p className="clean-empty-desc">{t('noSavedTripsDesc')}</p>
              <button
                type="button"
                className="clean-empty-cta"
                onClick={onNavigatePlanner}
                data-testid="create-trip-btn"
              >
                <Sparkles size={16} />
                <span>Plan Your Next Journey</span>
              </button>
            </div>
          ) : (
            <div className="saved-trips-card-grid" data-testid="saved-trips-grid">
              {savedTrips.map((trip) => {
                const isSelected = selectedIds.has(trip.id);
                const firstImg = trip.plan.items[0]?.primary_image_url;
                const stops = trip.plan.items || [];
                const previewStops = stops.slice(0, 3);
                const extraCount = Math.max(0, stops.length - 3);

                return (
                  <article
                    key={trip.id}
                    className={`saved-trip-modern-card ${isSelected ? 'selected' : ''}`}
                    data-testid={`saved-trip-${trip.id}`}
                  >
                    {/* Checkbox for batch import selection */}
                    <div className="card-checkbox-container">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(trip.id)}
                        className="card-select-checkbox"
                        aria-label={`Select ${trip.title}`}
                      />
                    </div>

                    {/* Storage Badge */}
                    <div
                      className={`card-storage-badge ${trip.cloud_trip_id ? 'cloud' : 'device'
                        }`}
                      data-testid={
                        trip.cloud_trip_id
                          ? `badge-cloud-${trip.id}`
                          : `badge-device-${trip.id}`
                      }
                    >
                      {trip.cloud_trip_id ? (
                        <>
                          <Cloud size={11} />
                          <span>{t('cloudSavedBadge')}</span>
                        </>
                      ) : (
                        <>
                          <Smartphone size={11} />
                          <span>{t('localOnlyBadge')}</span>
                        </>
                      )}
                    </div>

                    {/* Card Thumbnail */}
                    <div className="saved-trip-thumbnail-area">
                      {firstImg ? (
                        <img
                          src={firstImg}
                          alt={trip.title}
                          className="saved-trip-thumbnail-img"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="saved-trip-thumbnail-placeholder">
                          <MapPin size={32} />
                        </div>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="saved-trip-body">
                      <div className="saved-trip-meta-row">
                        <div className="saved-trip-tags">
                          <span className="saved-trip-tag">
                            {trip.plan.duration_days} {language === 'kn' ? 'ದಿನಗಳು' : 'Days'}
                          </span>
                          <span className="saved-trip-tag">{stops.length} stops</span>
                        </div>
                        <span className="saved-trip-date">
                          {t('savedOn')} {new Date(trip.saved_at).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="saved-trip-card-title" title={trip.title}>
                        {trip.title}
                      </h3>

                      <p className="saved-trip-origin-pace">
                        Origin: <strong>{trip.request.origin_label}</strong> · Pace:{' '}
                        <strong>{trip.request.pace}</strong>
                      </p>

                      {/* Destination Chips Preview */}
                      <div className="saved-trip-destinations-chips">
                        {previewStops.map((stop) => (
                          <span
                            key={stop.id}
                            className="destination-chip"
                            title={stop.name}
                          >
                            {stop.name}
                          </span>
                        ))}
                        {extraCount > 0 && (
                          <span className="destination-chip-more">
                            +{extraCount} more
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="saved-trip-card-actions">
                        <button
                          type="button"
                          className="card-action-btn-primary"
                          onClick={() => onSelectTrip(trip)}
                          data-testid={`view-saved-${trip.id}`}
                        >
                          <span>{t('viewSavedTrip')}</span>
                        </button>

                        {!trip.cloud_trip_id && (
                          <button
                            type="button"
                            className="card-action-btn-secondary"
                            onClick={() => handleSingleTripTransfer(trip)}
                            disabled={transferringId === trip.id}
                            data-testid={`transfer-btn-${trip.id}`}
                            title="Transfer this trip to cloud storage"
                          >
                            {transferringId === trip.id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <CloudUpload size={13} />
                            )}
                            <span>{t('transferSelectedBtn')}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="card-action-btn-danger"
                          onClick={() => onDeleteTrip(trip.id)}
                          data-testid={`delete-saved-${trip.id}`}
                          title="Remove trip from this device"
                          aria-label="Remove trip"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* 6. Tab Content: Cloud Trips */}
      {activeSubTab === 'cloud' && (
        <>
          {isLoadingCloud ? (
            <div
              className="saved-trips-card-grid"
              data-testid="loading-cloud-trips"
              style={{ padding: '1rem 0' }}
            >
              {[1, 2, 3].map((n) => (
                <div key={n} className="saved-trips-skeleton-card">
                  <div
                    className="skeleton-shimmer"
                    style={{ height: '110px', width: '100%' }}
                  />
                  <div
                    className="skeleton-shimmer"
                    style={{ height: '22px', width: '70%' }}
                  />
                  <div
                    className="skeleton-shimmer"
                    style={{ height: '16px', width: '45%' }}
                  />
                  <div
                    className="skeleton-shimmer"
                    style={{ height: '36px', width: '100%', marginTop: 'auto' }}
                  />
                </div>
              ))}
            </div>
          ) : cloudTrips.length === 0 ? (
            <div className="saved-trips-clean-empty" data-testid="no-cloud-trips">
              <div className="clean-empty-icon-circle">
                <Cloud size={28} />
              </div>
              <h3 className="clean-empty-title">{t('cloudTripsEmpty')}</h3>
              <p className="clean-empty-desc">
                No itineraries found in your cloud account yet. Sync device trips or
                plan a new journey to access it from any device.
              </p>
              <button
                type="button"
                className="clean-empty-cta"
                onClick={onNavigatePlanner}
              >
                <Sparkles size={16} />
                <span>{t('navPlan')}</span>
              </button>
            </div>
          ) : (
            <div className="saved-trips-card-grid" data-testid="cloud-trips-grid">
              {cloudTrips.map((trip) => (
                <article
                  key={trip.id}
                  className="saved-trip-modern-card"
                  data-testid={`cloud-trip-${trip.id}`}
                >
                  <div
                    className="card-storage-badge cloud"
                    data-testid={`badge-cloud-${trip.id}`}
                  >
                    <Cloud size={11} />
                    <span>{t('cloudSavedBadge')}</span>
                  </div>

                  <div className="saved-trip-thumbnail-area">
                    <div className="saved-trip-thumbnail-placeholder">
                      <Cloud size={32} />
                    </div>
                  </div>

                  <div className="saved-trip-body">
                    <div className="saved-trip-meta-row">
                      <div className="saved-trip-tags">
                        <span className="saved-trip-tag">
                          {trip.duration_days} {language === 'kn' ? 'ದಿನಗಳು' : 'Days'}
                        </span>
                        <span className="saved-trip-tag">
                          {trip.total_stops || 0} stops
                        </span>
                      </div>
                      <span className="saved-trip-date">
                        {t('savedOn')} {new Date(trip.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="saved-trip-card-title" title={trip.title}>
                      {trip.title}
                    </h3>

                    <p className="saved-trip-origin-pace">
                      Origin: <strong>{trip.origin_label}</strong> · Pace:{' '}
                      <strong>{trip.pace}</strong>
                    </p>

                    <div className="saved-trip-card-actions">
                      {onSelectCloudTrip && (
                        <button
                          type="button"
                          className="card-action-btn-primary"
                          onClick={() => handleViewCloudTrip(trip.id)}
                          data-testid={`view-cloud-${trip.id}`}
                        >
                          <span>{t('viewSavedTrip')}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="card-action-btn-danger"
                        onClick={() => setTripToDeleteCloud(trip)}
                        data-testid={`delete-cloud-${trip.id}`}
                        title="Delete trip from cloud"
                        aria-label="Delete cloud trip"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {/* Cloud Deletion Confirmation Modal */}
      {tripToDeleteCloud && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          data-testid="delete-cloud-modal"
        >
          <div className="modal-card" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} color="#DC2626" />
                <span>{t('confirmDeleteCloudTitle')}</span>
              </h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setTripToDeleteCloud(null)}
                disabled={isDeletingCloud}
                aria-label={t('close')}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <X size={16} strokeWidth={2} />
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

      {/* Authentication Modal */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => {
            setShowAuthModal(false);
            if (auth.token && onAuthTokenChange) {
              onAuthTokenChange(auth.token);
            }
          }}
        />
      )}
    </section>
  );
};
