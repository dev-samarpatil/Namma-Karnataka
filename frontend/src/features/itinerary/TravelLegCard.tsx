import React, { useState } from 'react';
import {
  Car,
  Bus,
  Train,
  Footprints,
  Route,
  MapPin,
  AlertTriangle,
  Info,
  Check,
  ArrowRight,
  GitCompare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { TravelLegDetails, Language } from '../../types';

interface TravelLegCardProps {
  travelLeg?: TravelLegDetails | null;
  distanceKm?: number | null;
  transitMinutes?: number | null;
  prevStopName?: string;
  destStopName: string;
  language: Language;
}

const renderModeIcon = (mode: string, size = 15) => {
  const m = mode.toLowerCase();
  if (m.includes('train')) return <Train size={size} strokeWidth={2} />;
  if (m.includes('bus') || m.includes('transit')) return <Bus size={size} strokeWidth={2} />;
  if (m.includes('walk')) return <Footprints size={size} strokeWidth={2} />;
  if (m.includes('mixed')) return <Route size={size} strokeWidth={2} />;
  return <Car size={size} strokeWidth={2} />;
};

const MODE_LABELS: Record<string, { en: string; kn: string }> = {
  driving_car: { en: 'Private Car', kn: 'ಸ್ವಂತ ಕಾರು' },
  cab_taxi: { en: 'Taxi / Cab', kn: 'ಟ್ಯಾಕ್ಸಿ / ಕ್ಯಾಬ್' },
  public_transit: { en: 'Public Transit', kn: 'ಸಾರ್ವಜನಿಕ ಸಾರಿಗೆ' },
  mixed: { en: 'Mixed (Transit + Auto)', kn: 'ಮಿಶ್ರ ಸಾರಿಗೆ' },
  walking: { en: 'Walking', kn: 'ಕಾಲ್ನಡಿಗೆ' },
  auto_rickshaw: { en: 'Auto-Rickshaw', kn: 'ಆಟೋ ರಿಕ್ಷಾ' },
};

export const TravelLegCard: React.FC<TravelLegCardProps> = ({
  travelLeg,
  distanceKm,
  transitMinutes,
  prevStopName,
  destStopName,
  language,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  const dist = travelLeg?.distance_km ?? distanceKm ?? 0;
  const mins = travelLeg?.duration_minutes ?? transitMinutes ?? 0;
  const recModeKey = travelLeg?.recommended_mode || travelLeg?.selected_mode || 'driving_car';
  const modeIcon = renderModeIcon(recModeKey, 15);
  const modeName =
    language === 'kn'
      ? MODE_LABELS[recModeKey]?.kn || recModeKey
      : MODE_LABELS[recModeKey]?.en || recModeKey;

  const origin = travelLeg?.origin_name || prevStopName || (language === 'kn' ? 'ಹಿಂದಿನ ತಾಣ' : 'Previous Location');
  const destination = travelLeg?.destination_name || destStopName;

  const reason =
    language === 'kn' && travelLeg?.recommendation_reason_kn
      ? travelLeg.recommendation_reason_kn
      : travelLeg?.recommendation_reason ||
        (language === 'kn'
          ? `ರಸ್ತೆ ಜಾಲದ ಮೂಲಕ ಪ್ರಯಾಣ (${dist.toFixed(1)} ಕಿ.ಮೀ, ~${mins} ನಿಮಿಷಗಳು).`
          : `Point-to-point road connection (${dist.toFixed(1)} km, ~${mins} mins).`);

  const fareStatusLabel =
    travelLeg?.cost_group_inr === 0
      ? language === 'kn' ? 'ಉಚಿತ (ಕಾಲ್ನಡಿಗೆ)' : 'Free (Walk)'
      : travelLeg?.fare_status === 'verified'
      ? language === 'kn' ? 'ಪರಿಶೀಲಿಸಿದ ದರ' : 'Verified Fare'
      : language === 'kn' ? 'ಅಂದಾಜು ದರ' : 'Estimated Fare';

  const hasSegments = travelLeg?.segments && travelLeg.segments.length > 0;
  const hasAlternatives = travelLeg?.alternatives && travelLeg.alternatives.length > 0;

  return (
    <div
      className="travel-leg-panel compact-travel-card"
      data-testid="travel-leg-card"
    >
      {/* Top Summary Bar */}
      <div className="travel-leg-summary-bar">
        {/* Left: Origin ──→ Destination with Icon & Metrics */}
        <div className="travel-leg-route-group">
          <span className="travel-leg-mode-icon" aria-hidden="true">{modeIcon}</span>
          <div className="travel-leg-route-text">
            <span className="travel-leg-node-name">{origin}</span>
            <ArrowRight size={13} strokeWidth={2.5} className="travel-leg-arrow" />
            <span className="travel-leg-node-name">{destination}</span>
            <span className="travel-leg-metric-pill">
              ~{dist.toFixed(1)} km · {mins} min
            </span>
          </div>
        </div>

        {/* Right: Recommended Mode, Fare, and Action Controls */}
        <div className="travel-leg-controls-group">
          <div className="travel-leg-cost-summary">
            <span className="travel-leg-cost-label">
              {language === 'kn' ? 'ಶಿಫಾರಸು:' : 'Recommended:'}
            </span>
            <strong className="travel-leg-cost-mode">{modeName}</strong>
            <span className="travel-leg-cost-divider">·</span>
            <span className="travel-leg-cost-amount">
              {travelLeg?.cost_group_inr !== undefined && travelLeg.cost_group_inr !== null ? (
                travelLeg.cost_group_inr === 0 ? (
                  language === 'kn' ? 'ಉಚಿತ (ಕಾಲ್ನಡಿಗೆ)' : 'Free (Walk)'
                ) : (
                  `₹${travelLeg.cost_group_inr.toFixed(0)}`
                )
              ) : (
                language === 'kn' ? 'ದರ ಅಲಭ್ಯ' : 'Fare unavailable'
              )}
            </span>
            {travelLeg?.cost_per_person_inr && travelLeg.cost_group_inr !== 0 ? (
              <span className="travel-leg-per-person">
                (₹{travelLeg.cost_per_person_inr.toFixed(0)}/p)
              </span>
            ) : null}
          </div>

          {/* Action buttons */}
          <div className="travel-leg-actions">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className={`travel-leg-btn ${showDetails ? 'travel-leg-btn-active' : ''}`}
              aria-expanded={showDetails}
            >
              <span>{language === 'kn' ? 'ವಿವರ' : 'Details'}</span>
              {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {hasAlternatives && (
              <button
                type="button"
                onClick={() => setShowAlternatives(!showAlternatives)}
                className={`travel-leg-btn travel-leg-btn-compare ${showAlternatives ? 'travel-leg-btn-compare-active' : ''}`}
                aria-expanded={showAlternatives}
              >
                <GitCompare size={12} />
                <span>
                  {language === 'kn'
                    ? `ಹೋಲಿಸಿ (${travelLeg?.alternatives?.length})`
                    : `Compare (${travelLeg?.alternatives?.length})`}
                </span>
                {showAlternatives ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* EXPANDABLE SECTION: Travel Details */}
      {showDetails && (
        <div className="travel-leg-expanded-details">
          {/* Rationale */}
          <div className="travel-leg-rationale">
            <strong>{language === 'kn' ? 'ಶಿಫಾರಸು ಕಾರಣ:' : 'Recommendation rationale:'}</strong>{' '}
            {reason}
          </div>

          {/* Multimodal Segments Breakdown */}
          {hasSegments && (
            <div className="travel-leg-segments-box">
              <div className="travel-leg-segments-title">
                <Route size={13} strokeWidth={2} />
                <span>{language === 'kn' ? 'ಪ್ರಯಾಣದ ಹಂತಗಳು:' : 'Journey Segments Breakdown:'}</span>
              </div>
              <div className="travel-leg-segments-list">
                {travelLeg?.segments?.map((seg) => (
                  <div key={seg.segment_order} className="travel-leg-segment-row">
                    <div className="travel-leg-segment-info">
                      <span className="travel-leg-segment-mode">
                        {renderModeIcon(seg.mode, 12)}
                        <span>{language === 'kn' && seg.mode_label_kn ? seg.mode_label_kn : seg.mode_label}:</span>
                      </span>
                      <span className="travel-leg-segment-desc">
                        {language === 'kn' && seg.description_kn ? seg.description_kn : seg.description}
                      </span>
                      {seg.distance_km ? (
                        <span className="travel-leg-segment-dist">({seg.distance_km.toFixed(1)} km)</span>
                      ) : null}
                    </div>
                    <div className="travel-leg-segment-cost">
                      {seg.cost_inr !== undefined && seg.cost_inr !== null ? (
                        seg.cost_inr === 0 ? '₹0' : `₹${seg.cost_inr.toFixed(0)}`
                      ) : (
                        language === 'kn' ? 'ದರ ಅಲಭ್ಯ' : 'Unpriced'
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Private Car Fuel & Toll Breakdown */}
          {recModeKey === 'driving_car' && travelLeg?.fuel_cost_inr !== undefined && travelLeg.fuel_cost_inr !== null && (
            <div className="travel-leg-fuel-box">
              <div className="travel-leg-fuel-title">
                <Car size={13} strokeWidth={2} />
                <span>{language === 'kn' ? 'ಸ್ವಂತ ವಾಹನ ಇಂಧನ ಮತ್ತು ರಸ್ತೆ ವೆಚ್ಚ ವಿವರ:' : 'Self-Drive Fuel & Road Expense Details:'}</span>
              </div>
              <div className="travel-leg-fuel-items">
                <div>• {language === 'kn' ? 'ರಸ್ತೆ ದೂರ:' : 'Road Distance:'} <strong>{dist.toFixed(1)} km</strong></div>
                <div>• {language === 'kn' ? 'ಅಂದಾಜು ಇಂಧನ ಬಳಕೆ:' : 'Estimated Fuel:'} <strong>₹{travelLeg.fuel_cost_inr.toFixed(0)}</strong> {travelLeg.fuel_litres ? `(~${travelLeg.fuel_litres} Litres)` : ''}</div>
                <div className="travel-leg-muted">• {language === 'kn' ? travelLeg.toll_note_kn || travelLeg.toll_note : travelLeg.toll_note || 'Toll estimate unavailable — not included in the total.'}</div>
                <div className="travel-leg-muted">• {language === 'kn' ? travelLeg.parking_note_kn || travelLeg.parking_note : travelLeg.parking_note || 'Parking excluded — pay locally where applicable.'}</div>
              </div>
            </div>
          )}

          {/* Terminals guidance if available */}
          {(travelLeg?.origin_terminal || travelLeg?.destination_terminal) && (
            <div className="travel-leg-terminals-badge">
              <MapPin size={13} strokeWidth={2} />
              <span>
                {language === 'kn' ? 'ನಿಲ್ದಾಣಗಳು:' : 'Terminals:'}{' '}
                {travelLeg.origin_terminal ? `${travelLeg.origin_terminal} → ` : ''}
                {travelLeg.destination_terminal || ''}
              </span>
            </div>
          )}

          {/* Walking Notes */}
          {travelLeg?.walking_feasible && (
            <div className="travel-leg-walking-badge">
              <Check size={13} strokeWidth={2.5} />
              <span>{language === 'kn' ? travelLeg.walking_notes_kn || travelLeg.walking_notes : travelLeg.walking_notes}</span>
            </div>
          )}

          {/* Warnings */}
          {travelLeg?.warnings && travelLeg.warnings.length > 0 && (
            <div className="travel-leg-warning-badge">
              <AlertTriangle size={13} strokeWidth={2} />
              <span>{travelLeg.warnings.join(' · ')}</span>
            </div>
          )}

          {/* Calculation Basis & Source Footnote */}
          <div className="travel-leg-footnote">
            <Info size={12} strokeWidth={2} />
            <span>
              {travelLeg?.calculation_basis ? `${travelLeg.calculation_basis} · ` : ''}
              {fareStatusLabel} ·{' '}
              {travelLeg?.source_reference ||
                (language === 'kn'
                  ? 'ಕರ್ನಾಟಕ ರಸ್ತೆ ಜಾಲದ ಅಂದಾಜು.'
                  : 'Karnataka Road Network / Transport Cost Calculator.')}
            </span>
          </div>
        </div>
      )}

      {/* EXPANDABLE SECTION: Compare Alternative Modes */}
      {showAlternatives && hasAlternatives && (
        <div className="travel-leg-expanded-compare">
          <div className="travel-leg-compare-title">
            <GitCompare size={13} strokeWidth={2} />
            <span>{language === 'kn' ? 'ಪರ್ಯಾಯ ಸಾರಿಗೆ ಆಯ್ಕೆಗಳ ಹೋಲಿಕೆ:' : 'Compare Alternative Transport Modes:'}</span>
          </div>
          <div className="travel-leg-table-wrap">
            <table className="travel-leg-compare-table">
              <thead>
                <tr>
                  <th>{language === 'kn' ? 'ವಿಧಾನ' : 'Mode'}</th>
                  <th>{language === 'kn' ? 'ಸಮಯ' : 'Duration'}</th>
                  <th>{language === 'kn' ? 'ವೆಚ್ಚ' : 'Est. Cost'}</th>
                  <th>{language === 'kn' ? 'ಮಾಹಿತಿ' : 'Details'}</th>
                </tr>
              </thead>
              <tbody>
                {travelLeg?.alternatives?.map((alt, aIdx) => (
                  <tr key={aIdx}>
                    <td className="travel-leg-mode-cell">
                      <span className="travel-leg-cell-wrap">
                        {renderModeIcon(alt.mode, 12)}
                        <span>{language === 'kn' && alt.mode_label_kn ? alt.mode_label_kn : alt.mode_label}</span>
                      </span>
                    </td>
                    <td className="travel-leg-duration-cell">~{alt.duration_minutes}m</td>
                    <td className="travel-leg-cost-cell">
                      {alt.cost_inr !== undefined && alt.cost_inr !== null ? (
                        alt.cost_inr === 0 ? '₹0' : `₹${alt.cost_inr.toFixed(0)}`
                      ) : (
                        <span className="travel-leg-muted">{language === 'kn' ? 'ಲಭ್ಯವಿಲ್ಲ' : 'N/A'}</span>
                      )}
                    </td>
                    <td className="travel-leg-notes-cell">
                      {language === 'kn' && alt.notes_kn ? alt.notes_kn : alt.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TravelLegCard;
