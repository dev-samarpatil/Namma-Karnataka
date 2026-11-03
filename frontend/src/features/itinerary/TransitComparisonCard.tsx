import React, { useState } from 'react';
import { Bus, Car, AlertTriangle, Leaf, Loader2, Info } from 'lucide-react';
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
    <div className="transit-comparison-wrapper">
      <button
        type="button"
        className={`btn-transit-toggle ${isOpen ? 'btn-transit-toggle-open' : ''}`}
        onClick={handleToggle}
        data-testid="toggle-transit-comparison-btn"
      >
        <Bus size={13} strokeWidth={2} />
        <span>{isOpen ? t('hideTransitComparison') : t('compareTransit')}</span>
      </button>

      {isOpen && (
        <div
          className="transit-comparison-panel"
          data-testid="transit-comparison-panel"
        >
          <h5 className="transit-comparison-title">
            {t('transitComparisonTitle')}
          </h5>

          {loading && (
            <div className="transit-comparison-loading">
              <Loader2 size={13} className="spin" />
              <span>Querying KSRTC, BMTC & SWR schedules...</span>
            </div>
          )}

          {error && (
            <div className="transit-comparison-error">
              <AlertTriangle size={13} />
              <span>{error}</span>
            </div>
          )}

          {comparison && !loading && (
            <div className="comparison-grid">
              {/* Road / Cab Option */}
              <div className="comparison-card road-card">
                <div className="comparison-card-header road-header">
                  <Car size={14} />
                  <span>{t('roadOption')}</span>
                </div>
                <div className="comparison-card-body">
                  <div><strong>Distance:</strong> ~{comparison.road_distance_km} km</div>
                  <div><strong>Est. Time:</strong> {comparison.road_duration_minutes} mins</div>
                  <div><strong>Est. Cab Cost:</strong> ₹{comparison.road_estimated_cab_cost_inr}</div>
                  <div className="comparison-footnote">
                    * Terrain-adjusted geographic estimate
                  </div>
                </div>
              </div>

              {/* Public Transit Option */}
              <div className={`comparison-card transit-card ${comparison.transit_available ? 'transit-card-avail' : 'transit-card-unavail'}`}>
                <div className={`comparison-card-header ${comparison.transit_available ? 'transit-header-avail' : 'transit-header-unavail'}`}>
                  <Bus size={14} />
                  <span>{t('transitOption')}</span>
                </div>
                {comparison.transit_available && comparison.transit_options.length > 0 ? (
                  <div className="comparison-card-body">
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
                          <div className="comparison-eco-note">
                            <Leaf size={12} color="#059669" />
                            <span>{language === 'kn' ? comparison.carbon_comparison_note_kn : comparison.carbon_comparison_note_en}</span>
                          </div>
                          <div className="comparison-disclaimer">
                            <Info size={11} />
                            <span>{opt.disclaimer}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="transit-unavailable-notice">
                    <Info size={12} />
                    <span>{t('transitUnavailable')}</span>
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

export default TransitComparisonCard;
