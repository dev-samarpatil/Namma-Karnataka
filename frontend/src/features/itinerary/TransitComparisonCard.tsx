import React, { useState } from 'react';
import { TransitComparison, Language } from '../../types';
import { compareTransitAndRoad, ApiClientError } from '../../lib/api';
import { useTranslation } from '../../lib/i18n';

interface TransitComparisonCardProps {
  originLat: number;
  originLon: number;
  destLat: number;
  destLon: number;
  language: Language;
}

export const TransitComparisonCard: React.FC<TransitComparisonCardProps> = ({
  originLat,
  originLon,
  destLat,
  destLon,
  language,
}) => {
  const { t } = useTranslation(language);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [comparison, setComparison] = useState<TransitComparison | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
    if (comparison) return;

    setLoading(true);
    setError(null);
    try {
      const data = await compareTransitAndRoad(originLat, originLon, destLat, destLon);
      setComparison(data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Unable to fetch public transit schedules. Network offline.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="transit-comparison-wrapper" style={{ marginTop: '8px', marginBottom: '8px' }}>
      <button
        type="button"
        className="btn-transit-toggle"
        onClick={handleToggle}
        data-testid="toggle-transit-comparison-btn"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: '#f0fdf4',
          border: '1px solid #86efac',
          color: '#166534',
          fontSize: '0.82rem',
          fontWeight: 600,
          padding: '4px 10px',
          borderRadius: '6px',
          cursor: 'pointer',
        }}
      >
        🚌 {isOpen ? t('hideTransitComparison') : t('compareTransit')}
      </button>

      {isOpen && (
        <div
          className="transit-comparison-panel"
          data-testid="transit-comparison-panel"
          style={{
            marginTop: '8px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px 16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <h5 style={{ margin: '0 0 10px 0', fontSize: '0.92rem', color: '#0f172a' }}>
            {t('transitComparisonTitle')}
          </h5>

          {loading && (
            <div style={{ fontSize: '0.85rem', color: '#64748b', padding: '8px 0' }}>
              ⏳ Querying KSRTC, BMTC & SWR schedules...
            </div>
          )}

          {error && (
            <div style={{ fontSize: '0.85rem', color: '#b91c1c', padding: '6px 0' }}>
              ⚠️ {error}
            </div>
          )}

          {comparison && !loading && (
            <div className="comparison-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Road / Cab Option */}
              <div
                className="comparison-card road-card"
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '10px',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155', marginBottom: '4px' }}>
                  🚗 {t('roadOption')}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                  <div><strong>Distance:</strong> ~{comparison.road_distance_km} km</div>
                  <div><strong>Est. Time:</strong> {comparison.road_duration_minutes} mins</div>
                  <div><strong>Est. Cab Cost:</strong> ₹{comparison.road_estimated_cab_cost_inr}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                    * Terrain-adjusted geographic estimate
                  </div>
                </div>
              </div>

              {/* Public Transit Option */}
              <div
                className="comparison-card transit-card"
                style={{
                  background: comparison.transit_available ? '#f0fdf4' : '#fef2f2',
                  border: comparison.transit_available ? '1px solid #bbf7d0' : '1px solid #fecaca',
                  borderRadius: '6px',
                  padding: '10px',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: comparison.transit_available ? '#166534' : '#991b1b', marginBottom: '4px' }}>
                  🚌 {t('transitOption')}
                </div>
                {comparison.transit_available && comparison.transit_options.length > 0 ? (
                  <div style={{ fontSize: '0.82rem', color: '#1e293b' }}>
                    {(() => {
                      const opt = comparison.transit_options[0];
                      return (
                        <>
                          <div><strong>Operator:</strong> {opt.operator_name}</div>
                          <div><strong>Duration:</strong> {opt.total_duration_minutes} mins</div>
                          <div>
                            <strong>{t('estimatedTransitFare')}:</strong> ₹{opt.total_fare_min_inr} – ₹{opt.total_fare_max_inr}
                          </div>
                          <div>
                            <strong>{t('transfersCount')}:</strong>{' '}
                            {opt.transfers_count === 0 ? t('directService') : t('viaHubTransfer')}
                          </div>
                          <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#047857' }}>
                            🌱 {language === 'kn' ? comparison.carbon_comparison_note_kn : comparison.carbon_comparison_note_en}
                          </div>
                          <div
                            style={{
                              marginTop: '6px',
                              background: '#ecfdf5',
                              border: '1px dashed #6ee7b7',
                              padding: '4px 6px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              color: '#065f46',
                            }}
                          >
                            ℹ️ {opt.disclaimer}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.8rem', color: '#991b1b' }}>
                    ℹ️ {t('transitUnavailable')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
