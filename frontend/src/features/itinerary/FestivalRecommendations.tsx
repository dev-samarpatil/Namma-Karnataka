import React from 'react';
import { CulturalEvent, Language } from '../../types';

interface FestivalRecommendationsProps {
  events: CulturalEvent[];
  language: Language;
  onAddEventToDay?: (event: CulturalEvent) => void;
}

export const FestivalRecommendations: React.FC<FestivalRecommendationsProps> = ({
  events,
  language,
  onAddEventToDay,
}) => {
  const isKn = language === 'kn';

  return (
    <div
      className="festivals-recommendations-container"
      data-testid="festival-recommendations-section"
      style={{
        marginTop: '24px',
        marginBottom: '24px',
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(245, 158, 11, 0.35)',
        borderRadius: '12px',
        padding: '20px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎪</span>
            <span>{isKn ? 'ನಿಮ್ಮ ಮಾರ್ಗದ ಸಮೀಪದ ಹಬ್ಬಗಳು ಮತ್ತು ಉತ್ಸವಗಳು' : 'Festivals & Cultural Events Near Your Route'}</span>
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#cbd5e1' }}>
            {isKn
              ? 'ನಿಮ್ಮ ಪ್ರಯಾಣದ ದಿನಾಂಕಗಳು ಮತ್ತು ತಾಣಗಳಿಗೆ ಹೊಂದಿಕೆಯಾಗುವ ಅಧಿಕೃತ ಸಾಂಸ್ಕೃತಿಕ ಅನುಭವಗಳು.'
              : 'Verified cultural celebrations and heritage fairs coinciding with your travel dates and itinerary route.'}
          </p>
        </div>
      </div>

      {events.length === 0 ? (
        <div
          data-testid="no-festivals-empty-state"
          style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px dashed rgba(148, 163, 184, 0.3)',
            borderRadius: '8px',
            padding: '18px',
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: '0.88rem',
          }}
        >
          {isKn
            ? 'ಈ ದಿನಾಂಕಗಳಲ್ಲಿ ಯಾವುದೇ ದೃಢಪಡಿಸಿದ ಸಾಂಸ್ಕೃತಿಕ ಉತ್ಸವಗಳು ಕಂಡುಬಂದಿಲ್ಲ. ನಿಮ್ಮ ಪ್ರವಾಸದ ಸಮೀಪದಲ್ಲಿ ಅಧಿಕೃತ ಸ್ಥಳೀಯ ಪ್ರಕಟಣೆಗಳನ್ನು ಗಮನಿಸಿ.'
            : 'No confirmed cultural events found for these dates. Check official local announcements closer to your trip.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {events.map((event) => {
            const title = isKn && event.name_kn ? event.name_kn : event.name_en;
            const desc = isKn && event.description_kn ? event.description_kn : event.description_en;
            const isConfirmed = event.date_status === 'annual_recurring' || event.date_status === 'confirmed';

            const costText =
              event.ticket_cost_status === 'free'
                ? isKn ? 'ಉಚಿತ ಪ್ರವೇಶ' : 'Free Entry'
                : event.ticket_cost_min_inr > 0
                ? `₹${event.ticket_cost_min_inr} – ₹${event.ticket_cost_max_inr || event.ticket_cost_min_inr}`
                : isKn ? 'ಶುಲ್ಕ ಅನ್ವಯಿಸಬಹುದು' : 'Entry Fee Applicable';

            return (
              <div
                key={event.id}
                data-testid={`festival-card-${event.id}`}
                style={{
                  background: 'rgba(30, 41, 59, 0.85)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '9999px',
                        background: isConfirmed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: isConfirmed ? '#34d399' : '#fbbf24',
                        border: `1px solid ${isConfirmed ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {isConfirmed ? (isKn ? '✓ ಪರಿಶೀಲಿತ ಆಚರಣೆ' : '✓ Verified Event') : (isKn ? 'ℹ️ ಕಾಲಿಕ' : 'ℹ️ Seasonal')}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                      📍 {event.district_code}
                    </span>
                  </div>

                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', color: '#f8fafc', fontWeight: 700 }}>
                    {title}
                  </h4>

                  <div style={{ fontSize: '0.78rem', color: '#fbbf24', marginBottom: '8px' }}>
                    🏛️ {event.location_name}
                  </div>

                  <p style={{ margin: '0 0 10px 0', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                    {desc}
                  </p>

                  <div style={{ background: 'rgba(15, 23, 42, 0.6)', borderRadius: '6px', padding: '8px 10px', fontSize: '0.75rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>
                      <strong style={{ color: '#cbd5e1' }}>{isKn ? 'ಪ್ರವೇಶ ಶುಲ್ಕ:' : 'Admission:'}</strong> {costText}
                    </div>
                    {event.travel_advisory && (
                      <div style={{ color: '#fed7aa' }}>
                        ⚠️ <strong style={{ color: '#fed7aa' }}>{isKn ? 'ಪ್ರಯಾಣ ಸಲಹೆ:' : 'Advisory:'}</strong> {event.travel_advisory}
                      </div>
                    )}
                    <div style={{ color: '#64748b', fontSize: '0.7rem' }}>
                      🏛️ {isKn ? 'ಮೂಲ:' : 'Source:'} {event.source_name}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                  {event.source_url && (
                    <a
                      href={event.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: 'rgba(56, 189, 248, 0.12)',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        color: '#38bdf8',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      🔗 {isKn ? 'ಅಧಿಕೃತ ವಿವರ ↗' : 'Official Details ↗'}
                    </a>
                  )}
                  {onAddEventToDay && (
                    <button
                      type="button"
                      onClick={() => onAddEventToDay(event)}
                      data-testid={`add-festival-btn-${event.id}`}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: '#0284c7',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      ➕ {isKn ? 'ಪ್ರವಾಸಕ್ಕೆ ಸೇರಿಸಿ' : 'Add to Day Itinerary'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
