import React from 'react';
import { DayPlan, Language } from '../../types';
import { Bed, MapPin, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import './DayWiseItinerary.css';

export interface OvernightStayCardProps {
  day: DayPlan;
  nextDay?: DayPlan;
  isLastDay: boolean;
  travelersCount?: number;
  originLabel?: string;
  language: Language;
}

export const OvernightStayCard: React.FC<OvernightStayCardProps> = ({
  day,
  nextDay,
  isLastDay,
  travelersCount = 1,
  originLabel = 'Bengaluru',
  language,
}) => {
  const isKn = language === 'kn';
  const travelers = Math.max(1, travelersCount);

  // Look for accommodation stop in day stops
  const stayStop = day.stops.find((s) => s.stop_type === 'accommodation');

  // Determine stay location and name
  const stayName =
    stayStop?.name ||
    day.accommodation_name ||
    (isLastDay
      ? isKn
        ? `ಮರಳಿ ಪ್ರಯಾಣ (${originLabel})`
        : `Return Transit (${originLabel})`
      : isKn
      ? `ರಾತ್ರಿ ವಾಸ್ತವ್ಯ (${day.end_location_name || 'ಸ್ಥಳೀಯ ಪ್ರದೇಶ'})`
      : `Overnight Stay (${day.end_location_name || 'Local District'})`);

  const stayLocation = day.end_location_name || originLabel;

  const distanceFromLast = stayStop?.distance_from_prev_km
    ? `~${stayStop.distance_from_prev_km} km`
    : isKn
    ? 'ಕೊನೆಯ ತಾಣದ ಸಮೀಪದಲ್ಲೇ'
    : 'Near final scheduled stop';

  const roomsNeeded = Math.ceil(travelers / 2);
  const roomConfig =
    travelers === 1
      ? isKn
        ? '1 ಸಿಂಗಲ್ / ಡಬಲ್ ಕೊಠಡಿ'
        : '1 Single / Double Room'
      : isKn
      ? `${roomsNeeded} ಕೊಠಡಿಗಳು (${travelers} ಪ್ರಯಾಣಿಕರು)`
      : `${roomsNeeded} Rooms (${travelers} travelers)`;

  const costMin = stayStop?.cost_min_inr ?? (isLastDay ? 0 : 1600 * roomsNeeded);
  const costMax = stayStop?.cost_max_inr ?? (isLastDay ? 0 : 2800 * roomsNeeded);
  const isVerified = stayStop?.cost_status === 'verified';

  return (
    <div
      className="nk-card"
      data-testid={`overnight-stay-card-day-${day.day_number}`}
    >
      <div className="nk-card-header">
        <div className="nk-card-title-group">
          <div className="nk-card-icon" style={{ background: '#EEF2FF', color: '#4F46E5' }}>
            <Bed size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 className="nk-card-title">
                {isKn ? `ದಿನ ${day.day_number} ವಾಸ್ತವ್ಯ ಮತ್ತು ರಾತ್ರಿ ವಿಶ್ರಾಂತಿ` : `Day ${day.day_number} Overnight Accommodation`}
              </h3>
              {isVerified ? (
                <span className="nk-badge-verified">
                  <CheckCircle2 size={10} />
                  <span>{isKn ? 'ದೃಢೀಕೃತ ವಾಸ್ತವ್ಯ' : 'Verified Tariff'}</span>
                </span>
              ) : (
                <span className="nk-badge-est">
                  <span>≈ {isKn ? 'ಶಿಫಾರಸು ಮಾಡಿದ ವಲಯ' : 'Recommended Cluster'}</span>
                </span>
              )}
            </div>
            <p className="nk-card-desc">
              {stayStop?.description ||
                (isKn
                  ? 'ದಿನದ ಕೊನೆಯ ತಾಣಕ್ಕೆ ಸಮೀಪವಿರುವ ಅಧಿಕೃತ ಕೆ.ಎಸ್.ಟಿ.ಡಿ.ಸಿ ಅಥವಾ ಗುಣಮಟ್ಟದ ಹೋಟೆಲ್.'
                  : 'Centrally located accommodation minimizing transit time and enabling convenient morning departure.')}
            </p>
          </div>
        </div>

        {/* Price Tag */}
        <div className="nk-price-box">
          <div className="nk-price-box-label">
            {isKn ? 'ಅಂದಾಜು ದರ' : 'Estimated Lodging'}
          </div>
          <div className="nk-price-box-val" style={{ color: '#4338CA' }}>
            {costMin === 0 && costMax === 0
              ? isKn ? 'ಮನೆಗೆ ಮರಳುವಿಕೆ' : 'Home Return'
              : `₹${costMin.toLocaleString('en-IN')} – ₹${costMax.toLocaleString('en-IN')}`}
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="nk-grid-3">
        <div className="nk-grid-item">
          <span className="nk-grid-item-label">
            {isKn ? 'ಹೋಟೆಲ್ / ವಾಸ್ತವ್ಯ:' : 'Property / Area:'}
          </span>
          <span className="nk-grid-item-val" title={stayName} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Bed size={14} color="#0798B5" /> {stayName}
          </span>
        </div>

        <div className="nk-grid-item">
          <span className="nk-grid-item-label">
            {isKn ? 'ಸ್ಥಳ ಮತ್ತು ಕೊನೆಯ ತಾಣದಿಂದ ದೂರ:' : 'Location & Distance from Last Stop:'}
          </span>
          <span className="nk-grid-item-val">
            <MapPin size={12} color="#4F46E5" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {stayLocation} ({distanceFromLast})
            </span>
          </span>
        </div>

        <div className="nk-grid-item">
          <span className="nk-grid-item-label">
            {isKn ? 'ಕೊಠಡಿಗಳ ಸಂರಚನೆ:' : 'Room Configuration:'}
          </span>
          <span className="nk-grid-item-val">
            {roomConfig}
          </span>
        </div>
      </div>

      {/* Next Day Continuity Notice */}
      <div
        style={{
          marginTop: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderRadius: '8px',
          background: '#EEF2FF',
          border: '1px solid #E0E7FF',
          padding: '8px 12px',
          fontSize: '0.82rem',
          color: '#312E81',
        }}
      >
        <ArrowRight size={14} color="#4F46E5" style={{ flexShrink: 0 }} />
        <span>
          {nextDay ? (
            isKn ? (
              <>
                <strong>ದಿನ {nextDay.day_number}</strong> ಪ್ರಾರಂಭವಾಗುವುದು ಇಲ್ಲಿಂದಲೇ:{' '}
                <span style={{ fontWeight: 600 }}>{stayLocation}</span>. (ಮರಳಿ ಮೂಲ ಸ್ಥಳಕ್ಕೆ ಅನಗತ್ಯವಾಗಿ ಓಡಾಡುವ ಅಗತ್ಯವಿಲ್ಲ).
              </>
            ) : (
              <>
                <strong>Day {nextDay.day_number}</strong> will start directly from{' '}
                <span style={{ fontWeight: 600 }}>{stayLocation}</span>, ensuring no geographical backtracking.
              </>
            )
          ) : isKn ? (
            <>
              <strong>ಪ್ರವಾಸದ ಅಂತಿಮ ದಿನ:</strong> ಈ ತಾಣದಿಂದ ನಿಮ್ಮ ಮೂಲ ಸ್ಥಳಕ್ಕೆ ಪ್ರಯಾಣ ಮುಕ್ತಾಯಗೊಳ್ಳಲಿದೆ.
            </>
          ) : (
            <>
              <strong>Final Day:</strong> This marks the conclusion of your scheduled Karnataka travel circuit.
            </>
          )}
        </span>
      </div>

      {/* Source Citation */}
      {stayStop?.source_reference && (
        <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ShieldCheck size={12} color="#059669" />
          <span>{isKn ? 'ಮೂಲ ಪರಿಶೀಲನೆ:' : 'Verified Source:'} {stayStop.source_reference}</span>
        </div>
      )}
    </div>
  );
};

export default OvernightStayCard;
