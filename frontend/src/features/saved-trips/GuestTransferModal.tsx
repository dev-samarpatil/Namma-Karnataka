import React, { useState } from 'react';
import { SavedTrip, Language, SaveCloudTripPayload } from '../../types';
import { useTranslation } from '../../lib/i18n';
import { saveCloudTrip } from '../../lib/api';
import { updateGuestTripSyncStatus } from '../../services/guestStorage';

interface GuestTransferModalProps {
  isOpen: boolean;
  savedTrips: SavedTrip[];
  authToken: string;
  language: Language;
  onClose: () => void;
  onTransferComplete?: (importedCount: number) => void;
}

export const GuestTransferModal: React.FC<GuestTransferModalProps> = ({
  isOpen,
  savedTrips,
  authToken,
  language,
  onClose,
  onTransferComplete,
}) => {
  const { t } = useTranslation(language);

  // Filter out any invalid trips or trips already synced
  const availableTrips = savedTrips.filter((t) => !t.cloud_trip_id);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    return new Set(availableTrips.map((trip) => trip.id));
  });

  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importStatusMap, setImportStatusMap] = useState<
    Record<string, 'pending' | 'importing' | 'success' | 'error'>
  >({});
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggleSelect = (tripId: string) => {
    if (isImporting) return;
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

  const handleSelectAll = () => {
    if (isImporting) return;
    setSelectedIds(new Set(availableTrips.map((t) => t.id)));
  };

  const handleDeselectAll = () => {
    if (isImporting) return;
    setSelectedIds(new Set());
  };

  const handleStartImport = async () => {
    if (selectedIds.size === 0 || isImporting) return;

    setIsImporting(true);
    setFeedbackMessage(null);
    let successCount = 0;
    let failCount = 0;

    for (const trip of availableTrips) {
      if (!selectedIds.has(trip.id)) continue;

      setImportStatusMap((prev) => ({ ...prev, [trip.id]: 'importing' }));

      try {
        const payload: SaveCloudTripPayload = {
          title: trip.title,
          origin_label: trip.request.origin_label,
          duration_days: trip.request.duration_days,
          pace: trip.request.pace,
          is_offbeat_preferred: trip.request.is_offbeat_preferred,
          budget_min_inr: trip.plan.items.reduce(
            (sum, item) => sum + (item.entry_fee_min_inr || 0),
            0
          ),
          budget_max_inr: trip.plan.items.reduce(
            (sum, item) => sum + (item.entry_fee_max_inr || 0),
            0
          ),
          currency_code: 'INR',
          itinerary: trip.plan,
        };

        const idempotencyKey = `import-${trip.id}`;
        const cloudTrip = await saveCloudTrip(payload, authToken, idempotencyKey);

        // Update local guest storage to link cloud trip id and mark synced
        updateGuestTripSyncStatus(trip.id, 'synced', cloudTrip.id);
        setImportStatusMap((prev) => ({ ...prev, [trip.id]: 'success' }));
        successCount++;
      } catch (err) {
        console.error(`Failed to import trip ${trip.id}:`, err);
        setImportStatusMap((prev) => ({ ...prev, [trip.id]: 'error' }));
        failCount++;
      }
    }

    setIsImporting(false);

    if (failCount === 0) {
      setFeedbackMessage(t('guestTransferSuccess'));
      if (onTransferComplete) {
        onTransferComplete(successCount);
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setFeedbackMessage(
        `${t('guestTransferPartial')} (${successCount} imported, ${failCount} failed)`
      );
      if (onTransferComplete) {
        onTransferComplete(successCount);
      }
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-modal-title"
      data-testid="guest-transfer-modal"
    >
      <div className="modal-card" style={{ maxWidth: '560px' }}>
        <div className="modal-header">
          <h3 id="transfer-modal-title">☁️ {t('guestTransferPromptTitle')}</h3>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            disabled={isImporting}
            aria-label={t('close')}
            data-testid="close-transfer-modal-btn"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.95rem' }}>
            {t('guestTransferPromptDesc')}
          </p>

          {feedbackMessage && (
            <div
              className={`app-error-banner ${
                feedbackMessage.includes(t('guestTransferSuccess')) ? 'bg-success' : ''
              }`}
              style={{
                marginBottom: '1rem',
                backgroundColor: feedbackMessage.includes(t('guestTransferSuccess'))
                  ? '#dcfce7'
                  : '#fee2e2',
                color: feedbackMessage.includes(t('guestTransferSuccess')) ? '#15803d' : '#b91c1c',
                border: '1px solid currentColor',
              }}
              data-testid="transfer-feedback"
            >
              <span>{feedbackMessage}</span>
            </div>
          )}

          {availableTrips.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
              <p>✓ All itineraries on this device are already synced to your cloud account.</p>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  {selectedIds.size} of {availableTrips.length} selected
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={handleSelectAll}
                    disabled={isImporting}
                    data-testid="select-all-btn"
                  >
                    {t('guestTransferSelectAll')}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={handleDeselectAll}
                    disabled={isImporting}
                    data-testid="deselect-all-btn"
                  >
                    {t('guestTransferDeselectAll')}
                  </button>
                </div>
              </div>

              <div
                style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
                data-testid="transfer-trips-list"
              >
                {availableTrips.map((trip) => {
                  const isSelected = selectedIds.has(trip.id);
                  const status = importStatusMap[trip.id];

                  return (
                    <label
                      key={trip.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: isSelected ? 'var(--bg-highlight, #f8fafc)' : 'transparent',
                        border: '1px solid',
                        borderColor: isSelected ? 'var(--border-focus, #94a3b8)' : 'transparent',
                        cursor: isImporting ? 'not-allowed' : 'pointer',
                      }}
                      data-testid={`transfer-item-${trip.id}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(trip.id)}
                        disabled={isImporting}
                        data-testid={`checkbox-${trip.id}`}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{trip.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {trip.plan.duration_days} {language === 'kn' ? 'ದಿನಗಳು' : 'Days'} ·{' '}
                          {trip.plan.items.length} stops · {trip.request.origin_label}
                        </div>
                      </div>
                      <div>
                        {status === 'importing' && (
                          <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                            ⏳ {t('guestTransferStatusImporting')}
                          </span>
                        )}
                        {status === 'success' && (
                          <span
                            className="badge badge-success"
                            style={{ fontSize: '0.75rem' }}
                            data-testid={`status-success-${trip.id}`}
                          >
                            ✓ {t('guestTransferStatusImported')}
                          </span>
                        )}
                        {status === 'error' && (
                          <span
                            className="badge badge-danger"
                            style={{ fontSize: '0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c' }}
                            data-testid={`status-error-${trip.id}`}
                          >
                            ⚠️ {t('guestTransferStatusFailed')}
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </>
          )}

          <div
            style={{
              marginTop: '1.25rem',
              display: 'flex',
              gap: '0.5rem',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isImporting}
              data-testid="cancel-transfer-btn"
            >
              {t('guestTransferKeepLocal')}
            </button>
            {availableTrips.length > 0 && (
              <button
                type="button"
                className="btn-primary"
                onClick={handleStartImport}
                disabled={isImporting || selectedIds.size === 0}
                data-testid="start-transfer-btn"
              >
                {isImporting ? '⏳ ...' : `✓ ${t('guestTransferAction')}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
