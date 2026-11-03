import React from 'react';
import { DayPlan, CulturalEvent, Language } from '../../types';
import { Sparkles, Info } from 'lucide-react';
import { FestivalCard } from './FestivalCard';
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

  // Events matching this day: from day.recommended_events or propEvents
  const dayEvents = (day.recommended_events && day.recommended_events.length > 0)
    ? day.recommended_events
    : (propEvents || []);

  return (
    <section
      className="nk-card nk-events-wrapper"
      data-testid={`day-events-section-day-${day.day_number}`}
      aria-labelledby={`day-events-heading-day-${day.day_number}`}
    >
      <div className="nk-card-header">
        <div className="nk-card-title-group">
          <div className="nk-card-icon nk-card-icon-festival" aria-hidden="true">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 id={`day-events-heading-day-${day.day_number}`} className="nk-card-title">
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
          <span className="nk-events-count-badge">
            {dayEvents.length} {dayEvents.length === 1 ? (isKn ? 'ಉತ್ಸವ' : 'Event') : (isKn ? 'ಉತ್ಸವಗಳು' : 'Events')}
          </span>
        )}
      </div>

      {dayEvents.length === 0 ? (
        /* Empty State */
        <div
          data-testid={`no-events-day-${day.day_number}`}
          className="nk-events-empty-state"
        >
          <Info size={16} color="#64748B" style={{ flexShrink: 0 }} />
          <span>
            {isKn
              ? 'ಈ ದಿನಾಂಕಗಳಲ್ಲಿ ಈ ತಾಣಗಳ ಸಮೀಪ ಯಾವುದೇ ದೃಢಪಡಿಸಿದ ಸಾಂಸ್ಕೃತಿಕ ಉತ್ಸವಗಳು ಪಟ್ಟಿಯಾಗಿಲ್ಲ. ನಿಮ್ಮ ಭೇಟಿಯ ಸಮೀಪದಲ್ಲಿ ಸ್ಥಳೀಯ ಮಾಹಿತಿ ಕೇಂದ್ರಗಳನ್ನು ಸಂಪರ್ಕಿಸಿ.'
              : 'No confirmed cultural festivals or fairs are currently listed near these destinations for your travel dates. Check official local announcements closer to your trip.'}
          </span>
        </div>
      ) : (
        /* Responsive Festival Cards List */
        <div className="nk-events-list">
          {dayEvents.map((event) => (
            <FestivalCard
              key={event.id}
              event={event}
              language={language}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default DayEventsSection;
