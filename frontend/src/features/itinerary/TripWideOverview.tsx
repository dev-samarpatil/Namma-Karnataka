import React from 'react';
import { PlanningRecommendationResponse, DayPlan, DestinationRead, Language } from '../../types';
import {
  Calendar,
  Compass,
  Navigation,
  Clock,
  ArrowRight,
  Bed,
} from 'lucide-react';
import { MapView } from './MapView';
import { BudgetSummary } from './BudgetSummary';
import { FestivalRecommendations } from './FestivalRecommendations';
import './DayWiseItinerary.css';

export interface TripWideOverviewProps {
  plan: PlanningRecommendationResponse;
  effectiveDays: DayPlan[];
  originLabel?: string;
  language: Language;
  onSelectDay: (dayNumber: number) => void;
  destinationsMap?: Map<string, DestinationRead>;
  onReplan?: () => void;
}

export const TripWideOverview: React.FC<TripWideOverviewProps> = ({
  plan,
  effectiveDays,
  originLabel = 'Bengaluru',
  language,
  onSelectDay,
}) => {
  const isKn = language === 'kn';

  // Aggregate trip-wide metrics
  const totalDays = plan.duration_days || effectiveDays.length || 1;
  const totalDestinations = plan.total_destinations || plan.items.length;

  const totalDistanceKm = effectiveDays.reduce(
    (sum, d) => sum + (d.driving_distance_km || 0),
    0
  );

  const totalTransitMinutes = effectiveDays.reduce(
    (sum, d) => sum + (d.transit_minutes || 0),
    0
  );

  const formatHoursMins = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const startHub = plan.origin_label || originLabel;
  const lastDay = effectiveDays[effectiveDays.length - 1];
  const finalHub = lastDay?.end_location_name || startHub;

  // Budget numbers
  const budget = plan.budget_breakdown;
  const totalMinInr = budget?.grand_total_min_inr ?? 0;
  const totalMaxInr = budget?.grand_total_max_inr ?? totalMinInr;
  const perPersonMin = budget?.per_person_min_inr ?? Math.round(totalMinInr / (budget?.traveler_count || 1));
  const perPersonMax = budget?.per_person_max_inr ?? Math.round(totalMaxInr / (budget?.traveler_count || 1));

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', margin: '1.5rem 0' }}
      data-testid="trip-wide-overview"
    >
      {/* Trip-Wide Summary Banner */}
      <div
        className="nk-card"
        style={{
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F0FDF4 50%, #F0F9FF 100%)',
          padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#0891B2', color: '#FFFFFF', padding: '4px 12px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700 }}>
                {isKn ? 'ಸಂಪೂರ್ಣ ಪ್ರವಾಸದ ಪಕ್ಷಿನೋಟ' : 'Complete Trip Summary'}
              </span>
              <span style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', padding: '3px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>
                {startHub} ➔ {finalHub === startHub ? (isKn ? 'ರೌಂಡ್ ಟ್ರಿಪ್' : 'Round Trip') : finalHub}
              </span>
            </div>

            <h2
              style={{
                margin: '8px 0 4px 0',
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#0F172A',
                fontFamily: 'var(--font-display, inherit)',
              }}
            >
              {isKn
                ? `${totalDays} ದಿನಗಳ ಕರ್ನಾಟಕ ಪ್ರವಾಸ ಯೋಜನೆ`
                : `${totalDays}-Day Karnataka Travel Circuit`}
            </h2>

            <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569' }}>
              {isKn
                ? `${totalDestinations} ಅಧಿಕೃತ ತಾಣಗಳು, ನೈಜ ರಸ್ತೆ ದೂರಗಳು ಮತ್ತು ದೃಢೀಕೃತ ವೆಚ್ಚಗಳೊಂದಿಗೆ ಸಮಗ್ರ ಯೋಜನೆ.`
                : `Comprehensive day-by-day journey encompassing ${totalDestinations} verified destinations across Karnataka.`}
            </p>
          </div>

          {/* Overall Budget Box */}
          <div style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid #A7F3D0', borderRadius: '10px', padding: '12px 16px', textAlign: 'right' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#065F46' }}>
              {isKn ? 'ಒಟ್ಟು ಪ್ರವಾಸದ ಬಜೆಟ್' : 'Total Trip Budget'}
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#064E3B', marginTop: '2px' }}>
              ₹{totalMinInr.toLocaleString('en-IN')} – ₹{totalMaxInr.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
              ₹{perPersonMin.toLocaleString('en-IN')} – ₹{perPersonMax.toLocaleString('en-IN')}{' '}
              {isKn ? '/ ವ್ಯಕ್ತಿಗೆ' : '/ person'} ({budget?.traveler_count || 1} {budget?.traveler_count === 1 ? 'traveler' : 'travelers'})
            </div>
          </div>
        </div>

        {/* 4 Primary Stats */}
        <div style={{ marginTop: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          <div style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>
              <Calendar size={14} color="#0891B2" />
              <span>{isKn ? 'ಒಟ್ಟು ಅವಧಿ' : 'Total Duration'}</span>
            </div>
            <div style={{ marginTop: '4px', fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>
              {totalDays} {isKn ? 'ದಿನಗಳು' : 'Days'}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>
              <Compass size={14} color="#0891B2" />
              <span>{isKn ? 'ತಾಣಗಳು' : 'Destinations'}</span>
            </div>
            <div style={{ marginTop: '4px', fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>
              {totalDestinations} {isKn ? 'ಸ್ಥಳಗಳು' : 'Places'}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#0891B2' }}>
              <Navigation size={14} color="#0891B2" />
              <span>{isKn ? 'ಒಟ್ಟು ರಸ್ತೆ ದೂರ' : 'Road Distance'}</span>
            </div>
            <div style={{ marginTop: '4px', fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>
              {totalDistanceKm > 0 ? `~${totalDistanceKm} km` : 'Local Circuits'}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>
              <Clock size={14} color="#0891B2" />
              <span>{isKn ? 'ಚಾಲನಾ ಸಮಯ' : 'Driving Time'}</span>
            </div>
            <div style={{ marginTop: '4px', fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>
              {totalTransitMinutes > 0 ? formatHoursMins(totalTransitMinutes) : '~2h total'}
            </div>
          </div>
        </div>
      </div>

      {/* Day-by-Day Sequence Route Cards Grid */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🗓️</span>
            <span>{isKn ? 'ದಿನವಾರು ಪ್ರವಾಸ ಮಾರ್ಗ ಶ್ರೇಣಿ' : 'Day-wise Route Sequence'}</span>
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
            {isKn ? 'ಯಾವುದೇ ದಿನವನ್ನು ಕ್ಲಿಕ್ ಮಾಡಿ ಆ ದಿನದ ವಿವರಗಳನ್ನು ತೆರೆಯಿರಿ' : 'Click any day to open its detailed plan'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
          {effectiveDays.map((day) => {
            const attractionStops = day.stops.filter(
              (s) => s.stop_type === 'attraction' || s.stop_type === 'activity'
            );

            const startL = day.start_location_name || originLabel;
            const endL = day.end_location_name || day.accommodation_name || startL;

            return (
              <div
                key={day.day_number}
                onClick={() => onSelectDay(day.day_number)}
                className="nk-card"
                style={{
                  cursor: 'pointer',
                  margin: 0,
                  transition: 'all 0.2s ease',
                  border: '1px solid #E2E8F0',
                }}
                data-testid={`trip-overview-day-card-${day.day_number}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ background: '#0891B2', color: '#FFFFFF', padding: '3px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700 }}>
                    {isKn ? `ದಿನ ${day.day_number}` : `Day ${day.day_number}`}
                  </span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748B' }}>
                    {attractionStops.length} {attractionStops.length === 1 ? 'stop' : 'stops'}
                  </span>
                </div>

                <h4 style={{ margin: '8px 0 4px 0', fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {day.theme}
                </h4>

                <div style={{ fontSize: '0.78rem', color: '#64748B', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Navigation size={12} color="#0891B2" style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{startL} ➔ {endL}</span>
                  </div>
                  {day.accommodation_name && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Bed size={12} color="#6366F1" style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{day.accommodation_name}</span>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: '8px', fontSize: '0.78rem' }}>
                  <span style={{ fontWeight: 600, color: '#334155' }}>
                    {day.daily_cost_min_inr
                      ? `₹${day.daily_cost_min_inr} – ₹${day.daily_cost_max_inr}`
                      : 'Verified circuit'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0891B2', fontWeight: 700 }}>
                    <span>{isKn ? 'ದಿನ ಅನ್ವೇಷಿಸಿ' : 'Explore Day'}</span>
                    <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full Trip Interactive Map */}
      <div className="nk-card">
        <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🗺️</span>
          <span>{isKn ? 'ಸಂಪೂರ್ಣ ಪ್ರವಾಸ ಮಾರ್ಗ ನಕ್ಷೆ' : 'Full Trip Interactive Route Map'}</span>
        </h3>
        <MapView
          stops={plan.items}
          dayPlans={effectiveDays}
          language={language}
          originLabel={startHub}
          travelMode="driving"
          activeDayFilter={null}
        />
      </div>

      {/* Full Trip Budget Breakdown */}
      <div>
        <BudgetSummary stops={plan.items} language={language} budget={plan.budget_breakdown} />
      </div>

      {/* Cultural Events across full trip */}
      {plan.recommended_festivals && plan.recommended_festivals.length > 0 && (
        <div>
          <FestivalRecommendations
            events={plan.recommended_festivals}
            language={language}
          />
        </div>
      )}
    </div>
  );
};

export default TripWideOverview;
