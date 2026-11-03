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

const renderModeIcon = (mode: string, size = 16) => {
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
  mixed: { en: 'Mixed (Transit + Auto)', kn: 'ಮಿಶ್ರ ಸಾರಿಗೆ (ಬಸ್ + ಆಟೋ)' },
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
  const modeIcon = renderModeIcon(recModeKey, 17);
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
      style={{
        margin: '8px 0 12px',
        padding: '10px 14px',
        background: '#FFFFFF',
        border: '1px solid #DCE5EF',
        borderLeft: '4px solid #0798B5',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
        fontSize: '0.82rem',
      }}
    >
      {/* Top Summary Bar - Compact Single/Two-Row Connector */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        {/* Left: Origin ──→ Destination with Icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '220px', flex: '1 1 auto' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', color: '#0798B5' }}>{modeIcon}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: '#172033' }}>{origin}</span>
            <ArrowRight size={14} strokeWidth={2} color="#0798B5" />
            <span style={{ fontWeight: 600, color: '#172033' }}>{destination}</span>
            <span
              style={{
                fontSize: '0.72rem',
                background: '#E0F2FE',
                color: '#0369A1',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 600,
                marginLeft: '4px',
              }}
            >
              ~{dist.toFixed(1)} km · {mins} min
            </span>
          </div>
        </div>

        {/* Right: Recommended Mode & Cost Summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748B', marginRight: '4px' }}>
              {language === 'kn' ? 'ಶಿಫಾರಸು:' : 'Recommended:'}
            </span>
            <strong style={{ color: '#059669', fontSize: '0.82rem' }}>{modeName}</strong>
            <span style={{ margin: '0 6px', color: '#CBD5E1' }}>·</span>
            <span style={{ color: '#D97706', fontWeight: 700, fontSize: '0.85rem' }}>
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
              <span style={{ fontSize: '0.72rem', color: '#64748B', marginLeft: '4px' }}>
                (₹{travelLeg.cost_per_person_inr.toFixed(0)}/p)
              </span>
            ) : null}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              style={{
                background: showDetails ? '#E0F2FE' : '#F8FAFC',
                border: showDetails ? '1px solid #7DD3FC' : '1px solid #DCE5EF',
                color: '#0369A1',
                fontSize: '0.72rem',
                padding: '3px 8px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {showDetails
                ? (language === 'kn' ? 'ವಿವರ ಮರೆಮಾಡಿ ▲' : 'Hide details ▲')
                : (language === 'kn' ? 'ವಿವರಗಳು ▼' : 'Details ▼')}
            </button>

            {hasAlternatives && (
              <button
                type="button"
                onClick={() => setShowAlternatives(!showAlternatives)}
                style={{
                  background: showAlternatives ? '#FEF3C7' : '#F8FAFC',
                  border: showAlternatives ? '1px solid #FCD34D' : '1px solid #DCE5EF',
                  color: '#B45309',
                  fontSize: '0.72rem',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {showAlternatives
                  ? (language === 'kn' ? 'ಹೋಲಿಕೆ ಮರೆಮಾಡಿ ▲' : 'Close compare ▲')
                  : (language === 'kn' ? `ಹೋಲಿಸಿ (${travelLeg?.alternatives?.length}) ▼` : `Compare (${travelLeg?.alternatives?.length}) ▼`)}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* EXPANDABLE SECTION: Travel Details */}
      {showDetails && (
        <div
          style={{
            marginTop: '10px',
            paddingTop: '10px',
            borderTop: '1px solid #E2E8F0',
          }}
        >
          {/* Rationale */}
          <div style={{ color: '#334155', marginBottom: '8px', fontSize: '0.78rem', lineHeight: 1.45 }}>
            <strong style={{ color: '#0798B5' }}>{language === 'kn' ? 'ಶಿಫಾರಸು ಕಾರಣ:' : 'Recommendation rationale:'}</strong>{' '}
            {reason}
          </div>

          {/* Multimodal Segments Breakdown */}
          {hasSegments && (
            <div style={{ marginBottom: '10px', background: '#F8FAFC', borderRadius: '6px', padding: '8px 10px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0798B5', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Route size={14} strokeWidth={2} />
                <span>{language === 'kn' ? 'ಪ್ರಯಾಣದ ಹಂತಗಳು (ಹಂತ-ಹಂತವಾಗಿ):' : 'Journey Segments Breakdown:'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {travelLeg?.segments?.map((seg) => (
                  <div
                    key={seg.segment_order}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.75rem',
                      background: '#FFFFFF',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: '#0369A1', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {renderModeIcon(seg.mode, 13)}
                        <span>{language === 'kn' && seg.mode_label_kn ? seg.mode_label_kn : seg.mode_label}:</span>
                      </span>
                      <span style={{ color: '#172033' }}>
                        {language === 'kn' && seg.description_kn ? seg.description_kn : seg.description}
                      </span>
                      {seg.distance_km ? (
                        <span style={{ color: '#64748B', marginLeft: '6px' }}>({seg.distance_km.toFixed(1)} km)</span>
                      ) : null}
                    </div>
                    <div style={{ fontWeight: 600, color: '#D97706', whiteSpace: 'nowrap', marginLeft: '8px' }}>
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
            <div
              style={{
                marginBottom: '8px',
                background: '#F8FAFC',
                padding: '8px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                border: '1px solid #E2E8F0',
              }}
            >
              <div style={{ color: '#0798B5', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Car size={13} strokeWidth={2} />
                <span>{language === 'kn' ? 'ಸ್ವಂತ ವಾಹನ ಇಂಧನ ಮತ್ತು ರಸ್ತೆ ವೆಚ್ಚ ವಿವರ:' : 'Self-Drive Fuel & Road Expense Details:'}</span>
              </div>
              <div style={{ color: '#334155', lineHeight: 1.5 }}>
                <div>• {language === 'kn' ? 'ರಸ್ತೆ ದೂರ:' : 'Road Distance:'} <strong>{dist.toFixed(1)} km</strong> (1 {language === 'kn' ? 'ವಾಹನ' : 'vehicle'})</div>
                <div>• {language === 'kn' ? 'ಅಂದಾಜು ಇಂಧನ ಬಳಕೆ:' : 'Estimated Fuel:'} <strong>₹{travelLeg.fuel_cost_inr.toFixed(0)}</strong> {travelLeg.fuel_litres ? `(~${travelLeg.fuel_litres} Litres)` : ''}</div>
                <div style={{ color: '#64748B' }}>• {language === 'kn' ? travelLeg.toll_note_kn || travelLeg.toll_note : travelLeg.toll_note || 'Toll estimate unavailable — not included in the total.'}</div>
                <div style={{ color: '#64748B' }}>• {language === 'kn' ? travelLeg.parking_note_kn || travelLeg.parking_note : travelLeg.parking_note || 'Parking excluded — pay locally where applicable.'}</div>
              </div>
            </div>
          )}

          {/* Terminals guidance if available */}
          {(travelLeg?.origin_terminal || travelLeg?.destination_terminal) && (
            <div
              style={{
                fontSize: '0.74rem',
                color: '#065F46',
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                padding: '4px 8px',
                borderRadius: '4px',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
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
            <div
              style={{
                fontSize: '0.74rem',
                color: '#15803D',
                marginBottom: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Check size={13} strokeWidth={2.5} />
              <span>{language === 'kn' ? travelLeg.walking_notes_kn || travelLeg.walking_notes : travelLeg.walking_notes}</span>
            </div>
          )}

          {/* Warnings */}
          {travelLeg?.warnings && travelLeg.warnings.length > 0 && (
            <div style={{ fontSize: '0.72rem', color: '#B45309', background: '#FFFBEB', border: '1px solid #FDE68A', padding: '4px 8px', borderRadius: '4px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <AlertTriangle size={13} strokeWidth={2} />
              <span>{travelLeg.warnings.join(' · ')}</span>
            </div>
          )}

          {/* Calculation Basis & Source Footnote */}
          <div
            style={{
              fontSize: '0.7rem',
              color: '#64748B',
              marginTop: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
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
        <div
          style={{
            marginTop: '10px',
            paddingTop: '10px',
            borderTop: '1px solid #E2E8F0',
          }}
        >
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#B45309', marginBottom: '6px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <GitCompare size={13} strokeWidth={2} />
            <span>{language === 'kn' ? 'ಪರ್ಯಾಯ ಸಾರಿಗೆ ಆಯ್ಕೆಗಳ ಹೋಲಿಕೆ:' : 'Compare Alternative Transport Modes:'}</span>
          </div>
          <table
            style={{
              width: '100%',
              fontSize: '0.75rem',
              borderCollapse: 'collapse',
              color: '#172033',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid #CBD5E1', textAlign: 'left', color: '#64748B' }}>
                <th style={{ padding: '4px 6px' }}>{language === 'kn' ? 'ವಿಧಾನ' : 'Mode'}</th>
                <th style={{ padding: '4px 6px' }}>{language === 'kn' ? 'ಸಮಯ' : 'Duration'}</th>
                <th style={{ padding: '4px 6px' }}>{language === 'kn' ? 'ವೆಚ್ಚ' : 'Est. Cost'}</th>
                <th style={{ padding: '4px 6px' }}>{language === 'kn' ? 'ಮಾಹಿತಿ' : 'Details'}</th>
              </tr>
            </thead>
            <tbody>
              {travelLeg?.alternatives?.map((alt, aIdx) => (
                <tr key={aIdx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '5px 6px', fontWeight: 600 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {renderModeIcon(alt.mode, 13)}
                      <span>{language === 'kn' && alt.mode_label_kn ? alt.mode_label_kn : alt.mode_label}</span>
                    </span>
                  </td>
                  <td style={{ padding: '5px 6px', color: '#0369A1' }}>~{alt.duration_minutes}m</td>
                  <td style={{ padding: '5px 6px', color: '#D97706', fontWeight: 600 }}>
                    {alt.cost_inr !== undefined && alt.cost_inr !== null ? (
                      alt.cost_inr === 0 ? '₹0' : `₹${alt.cost_inr.toFixed(0)}`
                    ) : (
                      <span style={{ color: '#94A3B8' }}>{language === 'kn' ? 'ಲಭ್ಯವಿಲ್ಲ' : 'N/A'}</span>
                    )}
                  </td>
                  <td style={{ padding: '5px 6px', color: '#64748B', fontSize: '0.7rem' }}>
                    {language === 'kn' && alt.notes_kn ? alt.notes_kn : alt.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
