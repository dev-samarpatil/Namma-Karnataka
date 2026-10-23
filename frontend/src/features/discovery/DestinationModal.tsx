import React, { useEffect } from 'react';
import { DestinationRead, Language } from '../../types';
import { useTranslation, TranslationKey } from '../../lib/i18n';

interface DestinationModalProps {
  destination: DestinationRead;
  language: Language;
  onClose: () => void;
  onPlanAround: (dest: DestinationRead) => void;
}

export const DestinationModal: React.FC<DestinationModalProps> = ({
  destination,
  language,
  onClose,
  onPlanAround,
}) => {
  const { t } = useTranslation(language);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const name = language === 'kn' && destination.name_kn ? destination.name_kn : destination.name_en;
  const summary =
    language === 'kn' && destination.summary_kn ? destination.summary_kn : destination.summary_en;
  const description =
    language === 'kn' && destination.description_kn
      ? destination.description_kn
      : destination.description_en;
  const howToReach =
    language === 'kn' && destination.how_to_reach_kn
      ? destination.how_to_reach_kn
      : destination.how_to_reach_en;
  const accessibility =
    language === 'kn' && destination.accessibility_notes_kn
      ? destination.accessibility_notes_kn
      : destination.accessibility_notes_en;

  const districtName =
    language === 'kn' && destination.district?.name_kn
      ? destination.district.name_kn
      : destination.district?.name_en || destination.district_code;

  const categoryTranslationKey = `cat_${destination.category}` as TranslationKey;
  const categoryLabel = t(categoryTranslationKey) || destination.category;

  const accessStatusKey = `access_${destination.access_status}` as TranslationKey;
  const accessStatusLabel = t(accessStatusKey) || destination.access_status;

  const renderFeeDetails = () => {
    if (destination.entry_fee_min_inr === 0 && destination.entry_fee_max_inr === 0) {
      return <strong className="text-free">{t('feeFree')}</strong>;
    }
    if (destination.entry_fee_min_inr !== undefined && destination.entry_fee_min_inr !== null) {
      const min = destination.entry_fee_min_inr;
      const max = destination.entry_fee_max_inr;
      if (max && max > min) {
        return <strong>₹{min} – ₹{max} ({destination.currency_code})</strong>;
      }
      return <strong>₹{min} ({destination.currency_code})</strong>;
    }
    return <span className="text-unknown">{t('feeUnknown')}</span>;
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-dest-title">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-badges">
            <span className="card-category-pill">{categoryLabel}</span>
            <span className="card-district-pill">📍 {districtName}</span>
            {destination.is_offbeat && (
              <span className="card-offbeat-badge">⭐ {t('offbeatBadge')}</span>
            )}
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label={t('close')}
            data-testid="modal-close-button"
          >
            ✕
          </button>
        </div>

        <h2 id="modal-dest-title" className="modal-title">
          {name}
        </h2>
        {summary && <p className="modal-summary">{summary}</p>}

        <div className="modal-body">
          <div className="modal-info-grid">
            <div className="info-block">
              <span className="info-label">{t('entryFee')}</span>
              <div className="info-value">{renderFeeDetails()}</div>
            </div>

            <div className="info-block">
              <span className="info-label">{t('estimatedTime')}</span>
              <div className="info-value">
                {destination.estimated_visit_minutes
                  ? `⏱️ ${destination.estimated_visit_minutes} ${t('minutes')}`
                  : 'N/A'}
              </div>
            </div>

            <div className="info-block">
              <span className="info-label">{t('accessStatus')}</span>
              <div className="info-value">ℹ️ {accessStatusLabel}</div>
            </div>

            {destination.coordinates && (
              <div className="info-block">
                <span className="info-label">Coordinates (WGS84)</span>
                <div className="info-value text-mono">
                  {destination.coordinates.lat.toFixed(4)}° N, {destination.coordinates.lon.toFixed(4)}° E
                </div>
              </div>
            )}
          </div>

          {description && (
            <div className="modal-section">
              <h4>Overview</h4>
              <p>{description}</p>
            </div>
          )}

          {howToReach && (
            <div className="modal-section">
              <h4>{t('howToReach')}</h4>
              <p>{howToReach}</p>
            </div>
          )}

          {accessibility && (
            <div className="modal-section">
              <h4>{t('accessibilityNotes')}</h4>
              <p>{accessibility}</p>
            </div>
          )}

          {destination.sources && destination.sources.length > 0 && (
            <div className="modal-section">
              <h4>{t('verifiedSources')}</h4>
              <ul className="source-list">
                {destination.sources.map((src, idx) => (
                  <li key={idx}>
                    {src.url ? (
                      <a href={src.url} target="_blank" rel="noopener noreferrer">
                        {src.title} ({src.source_type})
                      </a>
                    ) : (
                      <span>{src.title} ({src.source_type})</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('close')}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              onClose();
              onPlanAround(destination);
            }}
          >
            {t('planWithThis')}
          </button>
        </div>
      </div>
    </div>
  );
};
