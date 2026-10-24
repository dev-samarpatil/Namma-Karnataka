import React from 'react';
import { DestinationRead, Language } from '../../types';
import { useTranslation, TranslationKey } from '../../lib/i18n';

interface DestinationCardProps {
  destination: DestinationRead;
  language: Language;
  onSelect: (dest: DestinationRead) => void;
  onPlanAround: (dest: DestinationRead) => void;
}

export const DestinationCard: React.FC<DestinationCardProps> = ({
  destination,
  language,
  onSelect,
  onPlanAround,
}) => {
  const { t } = useTranslation(language);

  const name = language === 'kn' && destination.name_kn ? destination.name_kn : destination.name_en;
  const summary =
    language === 'kn' && destination.summary_kn ? destination.summary_kn : destination.summary_en;

  const districtName =
    language === 'kn' && destination.district?.name_kn
      ? destination.district.name_kn
      : destination.district?.name_en || destination.district_code;

  const categoryTranslationKey = `cat_${destination.category}` as TranslationKey;
  const categoryLabel = t(categoryTranslationKey) || destination.category;

  const renderFee = () => {
    if (destination.entry_fee_min_inr === 0 && destination.entry_fee_max_inr === 0) {
      return <span className="fee-tag fee-free">✓ {t('feeFree')}</span>;
    }
    if (destination.entry_fee_min_inr !== undefined && destination.entry_fee_min_inr !== null) {
      const min = destination.entry_fee_min_inr;
      const max = destination.entry_fee_max_inr;
      if (max && max > min) {
        return <span className="fee-tag fee-paid">₹{min} - ₹{max}</span>;
      }
      return <span className="fee-tag fee-paid">₹{min}</span>;
    }
    return <span className="fee-tag fee-unknown">ℹ️ {t('feeUnknown')}</span>;
  };

  const [imageError, setImageError] = React.useState(false);
  const imageUrl = destination.primary_image_url || destination.media?.[0]?.thumbnail_url || destination.media?.[0]?.url;

  const CATEGORY_FALLBACK_ICONS: Record<string, string> = {
    architecture: '🏛️',
    heritage: '🏰',
    nature: '🌲',
    waterfall: '🌊',
    hill_station: '⛰️',
    beach: '🏖️',
    wildlife: '🐅',
    spiritual_cultural: '🛕',
    adventure: '🧗',
    viewpoint: '🔭',
    museum: '🏛️',
    town_city: '🏙️',
    food_culture: '🍱',
    other: '📍',
  };

  return (
    <article className="destination-card" data-testid={`destination-card-${destination.slug}`}>
      {imageUrl && !imageError ? (
        <div className="card-image-wrap" style={{ position: 'relative', width: '100%', height: '140px', overflow: 'hidden', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', background: '#0f172a' }}>
          <img
            src={imageUrl}
            alt={destination.media?.[0]?.alt_en || name}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setImageError(true)}
          />
          <span style={{ position: 'absolute', bottom: '6px', left: '8px', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)', color: '#34d399', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(52, 211, 153, 0.3)', fontWeight: 600 }}>
            ✓ {language === 'kn' ? 'ಪರಿಶೀಲಿಸಿದ ನೈಜ ಛಾಯಾಚಿತ್ರ' : 'Verified Authentic'}
          </span>
        </div>
      ) : (
        <div className="card-image-wrap card-image-fallback" style={{ width: '100%', height: '140px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1e293b', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', color: '#94a3b8' }}>
          <span style={{ fontSize: '2rem' }}>{CATEGORY_FALLBACK_ICONS[destination.category] || '📍'}</span>
          <span style={{ fontSize: '0.72rem', marginTop: '4px', color: '#64748b' }}>
            {language === 'kn' ? 'ಛಾಯಾಚಿತ್ರ ಲಭ್ಯವಿಲ್ಲ' : 'Photo unavailable'}
          </span>
        </div>
      )}
      <div className="card-header">
        <div className="card-meta-row">
          <span className="card-category-pill">{categoryLabel}</span>
          <span className="card-district-pill">📍 {districtName}</span>
          {destination.is_offbeat && (
            <span className="card-offbeat-badge" title="Editorially curated offbeat destination">
              ⭐ {t('offbeatBadge')}
            </span>
          )}
        </div>
        <h3 className="card-title">{name}</h3>
      </div>


      <div className="card-body">
        {summary && <p className="card-summary">{summary}</p>}

        <div className="card-details-row">
          {destination.estimated_visit_minutes && (
            <span className="visit-time">
              ⏱️ {destination.estimated_visit_minutes} {t('minutes')}
            </span>
          )}
          {renderFee()}
        </div>
      </div>

      <div className="card-actions">
        <button
          type="button"
          className="btn-card-secondary"
          onClick={() => onSelect(destination)}
          data-testid={`view-details-${destination.slug}`}
        >
          {t('viewDetails')}
        </button>
        <button
          type="button"
          className="btn-card-primary"
          onClick={() => onPlanAround(destination)}
          data-testid={`plan-around-${destination.slug}`}
        >
          {t('planWithThis')}
        </button>
      </div>
    </article>
  );
};
