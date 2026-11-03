import React from 'react';
import { DayPlan, CulturalEvent, Language } from '../../types';
import { Calendar, MapPin, ExternalLink, ShieldCheck, Ticket, Info } from 'lucide-react';
import './DayWiseItinerary.css';

export interface DayEventsSectionProps {
  day: DayPlan;
  events?: CulturalEvent[];
  language: Language;
}

export const DayEventsSection: React.FC<DayEventsSectionProps> = ({
  day,
  events: propEvents,
  language,
}) => {
  const isKn = language === 'kn';

  // Events matching this day: from day.recommended_events or propEvents matching day's district/stops
  const dayEvents = (day.recommended_events && day.recommended_events.length > 0)
    ? day.recommended_events
    : (propEvents || []);

  return (
    <div
      className="nk-card"
      data-testid={`day-events-section-day-${day.day_number}`}
      style={{
        border: '1px solid #FDE68A',
        background: 'linear-gradient(180deg, #FFFFFF 0%, #FFFDF5 100%)',
      }}
    >
      <div className="nk-card-header" style={{ borderBottom: '1px solid #FEF3C7' }}>
        <div className="nk-card-title-group">
          <div className="nk-card-icon" style={{ background: '#FEF3C7', color: '#92400E' }}>
            <Ticket size={18} />
          </div>
          <div>
            <h3 className="nk-card-title">
              {isKn ? `ನಿಮ್ಮ ಪ್ರವಾಸದ ಅವಧಿಯಲ್ಲಿ ನಡೆಯುವ ಉತ್ಸವಗಳು (ದಿನ ${day.day_number})` : `Happening During Your Trip — Day ${day.day_number}`}
            </h3>
            <p className="nk-card-desc">
              {isKn
                ? 'ನಿಮ್ಮ ಪ್ರಯಾಣದ ದಿನಾಂಕಗಳು ಮತ್ತು ತಾಣಗಳೊಂದಿಗೆ ಹೊಂದಿಕೆಯಾಗುವ ಅಧಿಕೃತ ಕರ್ನಾಟಕ ಉತ್ಸವಗಳು.'
                : 'Verified regional celebrations and cultural festivals coinciding with your travel dates.'}
            </p>
          </div>
        </div>

        {dayEvents.length > 0 && (
          <span style={{ background: '#FEF3C7', color: '#78350F', padding: '3px 10px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 700 }}>
            {dayEvents.length} {dayEvents.length === 1 ? (isKn ? 'ಉತ್ಸವ' : 'Event') : (isKn ? 'ಉತ್ಸವಗಳು' : 'Events')}
          </span>
        )}
      </div>

      {dayEvents.length === 0 ? (
        /* Empty State */
        <div
          data-testid={`no-events-day-${day.day_number}`}
          style={{
            marginTop: '12px',
            borderRadius: '8px',
            border: '1px dashed #CBD5E1',
            background: '#F8FAFC',
            padding: '16px',
            textAlign: 'center',
            fontSize: '0.82rem',
            color: '#64748B',
          }}
        >
          {isKn
            ? 'ಈ ದಿನಾಂಕಗಳಲ್ಲಿ ಈ ತಾಣಗಳ ಸಮೀಪ ಯಾವುದೇ ದೃಢಪಡಿಸಿದ ಸಾಂಸ್ಕೃತಿಕ ಉತ್ಸವಗಳು ಪಟ್ಟಿಯಾಗಿಲ್ಲ. ನಿಮ್ಮ ಭೇಟಿಯ ಸಮೀಪದಲ್ಲಿ ಸ್ಥಳೀಯ ಮಾಹಿತಿ ಕೇಂದ್ರಗಳನ್ನು ಸಂಪರ್ಕಿಸಿ.'
            : 'No confirmed cultural festivals or fairs are currently listed near these destinations for your travel dates. Check official local announcements closer to your trip.'}
        </div>
      ) : (
        /* Events Cards */
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {dayEvents.map((event) => {
            const eventName = isKn && event.name_kn ? event.name_kn : event.name_en;
            const eventDesc = isKn && event.description_kn ? event.description_kn : event.description_en;

            return (
              <div
                key={event.id}
                data-testid={`event-card-${event.id}`}
                style={{
                  borderRadius: '10px',
                  border: '1px solid #FDE68A',
                  background: '#FFFFFF',
                  padding: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  {event.image_url && (
                    <img
                      src={event.image_url}
                      alt={eventName}
                      loading="lazy"
                      style={{
                        width: '100px',
                        height: '76px',
                        objectFit: 'cover',
                        borderRadius: '6px',
                        border: '1px solid #E2E8F0',
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>{eventName}</h4>
                        <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '0.78rem', color: '#64748B' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#334155', fontWeight: 600 }}>
                            <MapPin size={12} color="#B45309" />
                            <span>{event.location_name}</span>
                          </span>

                          {event.typical_start_date && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#334155', fontWeight: 600 }}>
                              <Calendar size={12} color="#0891B2" />
                              <span>{event.typical_start_date} {event.typical_end_date ? `– ${event.typical_end_date}` : ''}</span>
                            </span>
                          )}

                          <span style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, color: '#92400E' }}>
                            {event.event_category || 'Festival'}
                          </span>
                        </div>
                      </div>

                      {/* Fee badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', fontWeight: 700, color: '#047857' }}>
                        <Ticket size={14} />
                        <span>
                          {event.ticket_cost_min_inr === 0
                            ? isKn ? 'ಉಚಿತ ಪ್ರವೇಶ' : 'Free Entry'
                            : `₹${event.ticket_cost_min_inr}`}
                        </span>
                      </div>
                    </div>

                    <p style={{ marginTop: '8px', fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, margin: '8px 0 0 0' }}>
                      {eventDesc}
                    </p>
                  </div>
                </div>

                {event.travel_advisory && (
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#92400E', background: '#FFFBEB', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Info size={13} style={{ flexShrink: 0 }} />
                    <span>{event.travel_advisory}</span>
                  </div>
                )}

                {/* Footer / Source verification */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: '8px', fontSize: '0.75rem', color: '#94A3B8' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#047857', fontWeight: 600 }}>
                    <ShieldCheck size={12} />
                    <span>{isKn ? 'ಅಧಿಕೃತ ಮೂಲದಿಂದ ಪರಿಶೀಲಿಸಲಾಗಿದೆ' : 'Verified by'} {event.source_name}</span>
                  </div>

                  {event.source_url && (
                    <a
                      href={event.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#0891B2', textDecoration: 'underline' }}
                    >
                      <span>{isKn ? 'ಅಧಿಕೃತ ಪುಟ' : 'Official Portal'}</span>
                      <ExternalLink size={10} />
                    </a>
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

export default DayEventsSection;
