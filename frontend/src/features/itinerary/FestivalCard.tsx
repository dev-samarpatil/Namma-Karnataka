import React from 'react';
import { MapPin, Calendar, ExternalLink, ShieldCheck, Ticket, Info } from 'lucide-react';
import { CulturalEvent, FestivalEvent, Language } from '../../types';
import { EventImage } from '../../components/ui/EventImage';
import { toFestivalEvent } from '../../lib/festivalImages';
import './DayWiseItinerary.css';

export interface FestivalCardProps {
  event: CulturalEvent | FestivalEvent;
  language?: Language;
  className?: string;
  style?: React.CSSProperties;
}

export const FestivalCard: React.FC<FestivalCardProps> = ({
  event,
  language = 'en',
  className = '',
  style,
}) => {
  const isKn = language === 'kn';
  const data = toFestivalEvent(event, language);

  // Format date range text
  const dateRange = data.startDate
    ? data.endDate && data.endDate !== data.startDate
      ? `${data.startDate} – ${data.endDate}`
      : data.startDate
    : null;

  // Format entry fee text
  const feeText =
    data.entryFee === 0 || data.entryFee === undefined
      ? isKn
        ? 'ಉಚಿತ ಪ್ರವೇಶ'
        : 'Free Entry'
      : `₹${data.entryFee}`;

  return (
    <article
      className={`nk-event-card ${className}`}
      data-testid={`event-card-${data.id}`}
      style={style}
    >
      {/* LEFT: Festival Image / Designed Graceful Fallback */}
      <div className="nk-event-card-left">
        <EventImage
          src={data.imageUrl}
          eventId={data.id}
          alt={data.imageAlt || data.name}
          category={data.category}
          loading="lazy"
        />
      </div>

      {/* RIGHT: Structured Festival Content */}
      <div className="nk-event-card-right">
        {/* Header Row: Title & Badges */}
        <div className="nk-event-header-row">
          <h4 className="nk-event-title">{data.name}</h4>

          <div className="nk-event-badges-group">
            {/* Category Badge */}
            <span className="nk-event-category-pill">
              {data.category ? data.category.replace(/_/g, ' ') : 'Festival'}
            </span>

            {/* Entry Fee Badge */}
            <div className="nk-event-fee-badge">
              <Ticket size={12} />
              <span>{feeText}</span>
            </div>
          </div>
        </div>

        {/* Metadata Row: Location & Date Range */}
        <div className="nk-event-meta-row">
          <span className="nk-event-meta-item">
            <MapPin size={13} color="#0891B2" />
            <span>{data.location}</span>
          </span>

          {dateRange && (
            <span className="nk-event-meta-item">
              <Calendar size={13} color="#0891B2" />
              <span>{dateRange}</span>
            </span>
          )}
        </div>

        {/* Short Narrative Description */}
        <p className="nk-event-description">{data.description}</p>

        {/* Important Visitor Information / Travel Advisory */}
        {data.travelAdvisory && (
          <div className="nk-event-advisory" role="note">
            <Info size={14} color="#0891B2" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{data.travelAdvisory}</span>
          </div>
        )}

        {/* Footer: Official Verification & Portal Link */}
        <div className="nk-event-footer">
          <div className="nk-event-verification">
            <ShieldCheck size={13} color="#15803D" />
            <span>
              {isKn ? 'ಅಧಿಕೃತ ಮೂಲದಿಂದ ಪರಿಶೀಲಿಸಲಾಗಿದೆ' : 'Verified by'}{' '}
              {data.verificationSource || (isKn ? 'ಕರ್ನಾಟಕ ಪ್ರವಾಸೋದ್ಯಮ' : 'Karnataka Tourism')}
            </span>
          </div>

          {data.officialUrl && (
            <a
              href={data.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="nk-event-source-link"
              aria-label={`${isKn ? 'ಅಧಿಕೃತ ಪುಟ' : 'Official website'} for ${data.name}`}
            >
              <span>{isKn ? 'ಅಧಿಕೃತ ಪುಟ' : 'Official Portal'}</span>
              <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
};

export default FestivalCard;
