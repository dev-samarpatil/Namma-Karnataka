import React from 'react';
import { DayPlan, Language } from '../../types';
import {
  Clock,
  Compass,
  Navigation,
  Sparkles,
  Plus,
  Bed,
  ChevronDown,
  ChevronUp,
  Utensils,
  ArrowRight,
} from 'lucide-react';
import './DayWiseItinerary.css';

export interface DayOverviewProps {
  day: DayPlan;
  totalDays: number;
  originLabel?: string;
  language: Language;
  showDetails: boolean;
  onToggleDetails: () => void;
  onAddStop?: (dayNumber: number) => void;
  onRegenerateDay?: (dayNumber: number) => void;
  isReadOnly?: boolean;
}

export const DayOverview: React.FC<DayOverviewProps> = ({
  day,
  totalDays,
  originLabel = 'Bengaluru',
  language,
  showDetails,
  onToggleDetails,
  onAddStop,
  onRegenerateDay,
  isReadOnly = false,
}) => {
  const isKn = language === 'kn';

  // Extract attractions
  const attractionStops = day.stops.filter(
    (s) => s.stop_type === 'attraction' || s.stop_type === 'activity'
  );

  // Sightseeing duration in minutes
  const sightseeingMinutes = attractionStops.reduce(
    (acc, s) => acc + (s.duration_minutes || 0),
    0
  );

  const formatHoursMins = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) {
      return isKn ? `${h} ಗಂ ${m} ನಿಮಿಷ` : `${h}h ${m}m`;
    }
    if (h > 0) {
      return isKn ? `${h} ಗಂಟೆ` : `${h} hrs`;
    }
    return isKn ? `${m} ನಿಮಿಷ` : `${m} mins`;
  };

  const travelTimeFormatted = day.transit_minutes
    ? formatHoursMins(day.transit_minutes)
    : isKn
    ? '~30 ನಿಮಿಷ'
    : '~30 mins';

  const sightseeingTimeFormatted = formatHoursMins(sightseeingMinutes);

  // Budget formatting
  const dailyCostMin =
    day.daily_cost_min_inr ??
    day.stops.reduce((sum, s) => sum + (s.cost_min_inr || 0), 0);
  const dailyCostMax =
    day.daily_cost_max_inr ??
    day.stops.reduce((sum, s) => sum + (s.cost_max_inr || s.cost_min_inr || 0), 0);

  const budgetFormatted =
    dailyCostMin === 0 && dailyCostMax === 0
      ? isKn
        ? 'ಉಚಿತ ಪ್ರವೇಶ'
        : 'Free Access'
      : dailyCostMax > dailyCostMin
      ? `₹${dailyCostMin.toLocaleString('en-IN')} – ₹${dailyCostMax.toLocaleString('en-IN')}`
      : `₹${dailyCostMin.toLocaleString('en-IN')}`;

  const startLoc = day.start_location_name || originLabel;
  const endLoc = day.end_location_name || day.accommodation_name || startLoc;
  const overnightStay = day.accommodation_name || day.end_location_name || startLoc;

  return (
    <div
      className="nk-selected-day-overview"
      data-testid={`day-overview-day-${day.day_number}`}
    >
      {/* Top Banner: Day Title & Badges */}
      <div className="nk-overview-header">
        <div>
          <div className="nk-overview-badges">
            <span
              className="nk-day-pill-badge"
              data-testid={`day-pill-${day.day_number}`}
            >
              {isKn
                ? (totalDays ? `ದಿನ ${day.day_number} / ${totalDays}` : `ದಿನ ${day.day_number}`)
                : (totalDays ? `Day ${day.day_number} of ${totalDays}` : `Day ${day.day_number}`)}
            </span>
            <span className="nk-corridor-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Navigation size={12} />
              <span>{startLoc}</span>
              <ArrowRight size={11} />
              <span>{endLoc === startLoc ? (isKn ? 'ಸ್ಥಳೀಯ ಸುತ್ತು' : 'Local Circuit') : endLoc}</span>
            </span>
            {day.meals_covered && day.meals_covered.length > 0 && (
              <span className="nk-meals-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Utensils size={12} />
                <span>{day.meals_covered.length} {isKn ? 'ಆಹಾರ ನಿಲುಗಡೆಗಳು' : 'Meals Planned'}</span>
              </span>
            )}
          </div>

          <h2 className="nk-overview-title">
            {`DAY ${day.day_number} — ${(day.theme || (isKn ? 'ಪ್ರವಾಸ ಪಟ್ಟಿ' : 'ITINERARY')).toUpperCase()}`}
          </h2>

          <p className="nk-overview-locations">
            {isKn ? 'ಆರಂಭ:' : 'Starting Point:'} <strong>{startLoc}</strong>
            {' · '}
            {isKn ? 'ಮುಕ್ತಾಯ / ವಾಸ್ತವ್ಯ:' : 'Ending / Stay:'} <strong>{endLoc}</strong>
          </p>
        </div>

        {/* Action Controls */}
        <div className="nk-overview-actions">
          {!isReadOnly && onAddStop && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onAddStop(day.day_number)}
              data-testid={`overview-add-stop-day-${day.day_number}`}
              aria-label="Add stop to this day"
              style={{ fontSize: '0.82rem', padding: '6px 12px' }}
            >
              <Plus size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              <span>{isKn ? 'ತಾಣ ಸೇರಿಸಿ' : 'Add Stop'}</span>
            </button>
          )}

          {!isReadOnly && onRegenerateDay && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onRegenerateDay(day.day_number)}
              data-testid={`overview-regen-day-${day.day_number}`}
              aria-label="Regenerate this day"
              style={{ fontSize: '0.82rem', padding: '6px 12px' }}
            >
              <Sparkles size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              <span>{isKn ? 'ಮರುರಚಿಸಿ' : 'Regenerate'}</span>
            </button>
          )}

          {/* Prominent View Details Button */}
          <button
            type="button"
            className="btn-primary"
            onClick={onToggleDetails}
            data-testid="toggle-view-details-btn"
            aria-expanded={showDetails}
            style={{ fontSize: '0.82rem', padding: '7px 16px' }}
          >
            {showDetails ? (
              <>
                <span style={{ marginRight: '4px' }}>{isKn ? 'ವಿವರಗಳನ್ನು ಮರೆಮಾಡಿ' : 'Hide Details'}</span>
                <ChevronUp size={15} style={{ verticalAlign: 'middle' }} />
              </>
            ) : (
              <>
                <span style={{ marginRight: '4px' }}>{isKn ? 'ಸಂಪೂರ್ಣ ವಿವರಗಳನ್ನು ವೀಕ್ಷಿಸಿ' : 'View Details'}</span>
                <ChevronDown size={15} style={{ verticalAlign: 'middle' }} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* 6 Key Metric Badges / Cards */}
      <div className="nk-stats-grid">
        {/* Metric 1: Destinations */}
        <div className="nk-stat-card">
          <div className="nk-stat-label">
            <Compass size={14} color="#0891B2" />
            <span>{isKn ? 'ತಾಣಗಳು' : 'Destinations'}</span>
          </div>
          <div className="nk-stat-value">
            {attractionStops.length} {isKn ? 'ಸ್ಥಳಗಳು' : 'Places'}
          </div>
          <div className="nk-stat-sub">
            {day.stops.length} {isKn ? 'ಒಟ್ಟು ನಿಲುಗಡೆಗಳು' : 'total stops'}
          </div>
        </div>

        {/* Metric 2: Distance */}
        <div className="nk-stat-card">
          <div className="nk-stat-label">
            <Navigation size={14} color="#0891B2" />
            <span>{isKn ? 'ಒಟ್ಟು ದೂರ' : 'Total Distance'}</span>
          </div>
          <div className="nk-stat-value">
            {day.driving_distance_km ? `~${day.driving_distance_km} km` : isKn ? 'ಸ್ಥಳೀಯ ಸುತ್ತು' : 'Local Circuit'}
          </div>
          <div className="nk-stat-sub">
            {isKn ? 'ರಸ್ತೆ ಜಾಲದ ಅಂದಾಜು' : 'Road route estimate'}
          </div>
        </div>

        {/* Metric 3: Travel Time */}
        <div className="nk-stat-card">
          <div className="nk-stat-label">
            <Clock size={14} color="#0891B2" />
            <span>{isKn ? 'ಪ್ರಯಾಣ ಸಮಯ' : 'Travel Time'}</span>
          </div>
          <div className="nk-stat-value">
            {travelTimeFormatted}
          </div>
          <div className="nk-stat-sub">
            {isKn ? 'ಚಾಲನಾ ಸಮಯ' : 'Driving & transit'}
          </div>
        </div>

        {/* Metric 4: Sightseeing Time */}
        <div className="nk-stat-card">
          <div className="nk-stat-label">
            <Clock size={14} color="#D97706" />
            <span>{isKn ? 'ವೀಕ್ಷಣಾ ಸಮಯ' : 'Sightseeing'}</span>
          </div>
          <div className="nk-stat-value">
            {sightseeingTimeFormatted}
          </div>
          <div className="nk-stat-sub">
            {isKn ? 'ತಾಣಗಳಲ್ಲಿ ಕಳೆಯುವ ಸಮಯ' : 'At destinations'}
          </div>
        </div>

        {/* Metric 5: Estimated Daily Budget */}
        <div className="nk-stat-card">
          <div className="nk-stat-label">
            <span style={{ color: '#059669', fontWeight: 700 }}>₹</span>
            <span>{isKn ? 'ದಿನದ ಬಜೆಟ್' : 'Daily Budget'}</span>
          </div>
          <div className="nk-stat-value" style={{ color: '#059669' }}>
            {budgetFormatted}
          </div>
          <div className="nk-stat-sub">
            {isKn ? 'ಪ್ರವೇಶ + ಊಟ + ಇಂಧನ' : 'Tickets + meals + transit'}
          </div>
        </div>

        {/* Metric 6: Overnight Stay */}
        <div className="nk-stat-card">
          <div className="nk-stat-label">
            <Bed size={14} color="#6366F1" />
            <span>{isKn ? 'ರಾತ್ರಿ ವಾಸ್ತವ್ಯ' : 'Overnight Stay'}</span>
          </div>
          <div className="nk-stat-value" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={overnightStay}>
            {overnightStay}
          </div>
          <div className="nk-stat-sub">
            {day.day_number === totalDays
              ? isKn
                ? 'ಪ್ರವಾಸ ಸಮಾಪ್ತಿ'
                : 'Trip Departure'
              : isKn
              ? 'ಮುಂದಿನ ದಿನದ ಆರಂಭ'
              : 'Next morning origin'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayOverview;
