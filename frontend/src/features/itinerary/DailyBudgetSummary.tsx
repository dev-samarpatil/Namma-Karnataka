import React from 'react';
import { DayPlan, Language } from '../../types';
import { Ticket, Utensils, Car, Bed, Sparkles, CheckCircle2, AlertCircle, Wallet } from 'lucide-react';
import './DayWiseItinerary.css';

export interface DailyBudgetSummaryProps {
  day: DayPlan;
  travelersCount?: number;
  language: Language;
}

interface ExpenseRow {
  label: string;
  icon: React.ReactNode;
  costMin: number;
  costMax: number;
  isVerified: boolean;
  notes?: string;
}

export const DailyBudgetSummary: React.FC<DailyBudgetSummaryProps> = ({
  day,
  travelersCount = 1,
  language,
}) => {
  const isKn = language === 'kn';
  const travelers = Math.max(1, travelersCount);

  // 1. Attraction Tickets
  const attractionStops = day.stops.filter(
    (s) => s.stop_type === 'attraction' || s.stop_type === 'activity'
  );
  let ticketsMin = 0;
  let ticketsMax = 0;
  let ticketsVerified = true;
  for (const s of attractionStops) {
    if (s.cost_min_inr !== null && s.cost_min_inr !== undefined) {
      ticketsMin += s.cost_min_inr;
      ticketsMax += s.cost_max_inr ?? s.cost_min_inr;
      if (s.cost_status !== 'verified') ticketsVerified = false;
    }
  }

  // 2. Meals
  const mealStops = day.stops.filter((s) => s.stop_type === 'meal');
  let mealsMin = 0;
  let mealsMax = 0;
  let mealsVerified = false;
  if (mealStops.length > 0) {
    for (const m of mealStops) {
      mealsMin += m.cost_min_inr ?? 150 * travelers;
      mealsMax += m.cost_max_inr ?? 250 * travelers;
      if (m.cost_status === 'verified') mealsVerified = true;
    }
  } else if (day.meals_covered && day.meals_covered.length > 0) {
    mealsMin = day.meals_covered.length * 150 * travelers;
    mealsMax = day.meals_covered.length * 250 * travelers;
  }

  // 3. Transportation
  let transportMin = 0;
  let transportMax = 0;
  let transportVerified = false;
  for (const s of day.stops) {
    if (s.travel_leg?.cost_group_inr !== null && s.travel_leg?.cost_group_inr !== undefined) {
      transportMin += s.travel_leg.cost_group_inr;
      transportMax += s.travel_leg.cost_group_inr;
      if (s.travel_leg.fare_status === 'verified') transportVerified = true;
    } else if (s.distance_from_prev_km && s.distance_from_prev_km > 0) {
      // Approximate fuel: distance / 14 * 103
      const fuel = Math.round((s.distance_from_prev_km / 14.0) * 102.86);
      transportMin += fuel;
      transportMax += Math.round(fuel * 1.15);
    }
  }

  // 4. Accommodation
  const stayStop = day.stops.find((s) => s.stop_type === 'accommodation');
  let stayMin = 0;
  let stayMax = 0;
  let stayVerified = false;
  if (stayStop) {
    stayMin = stayStop.cost_min_inr ?? 1800;
    stayMax = stayStop.cost_max_inr ?? 2800;
    stayVerified = stayStop.cost_status === 'verified';
  } else if (day.accommodation_name) {
    stayMin = 1800;
    stayMax = 2800;
  }

  // 5. Other / Contingency
  const otherMin = Math.round((ticketsMin + mealsMin) * 0.1);
  const otherMax = Math.round((ticketsMax + mealsMax) * 0.15);

  const rows: ExpenseRow[] = [
    {
      label: isKn ? 'ತಾಣಗಳ ಪ್ರವೇಶ ಶುಲ್ಕಗಳು' : 'Attraction Admissions',
      icon: <Ticket size={16} color="#0891B2" />,
      costMin: ticketsMin,
      costMax: ticketsMax,
      isVerified: ticketsVerified && ticketsMin > 0,
      notes: attractionStops.length > 0 ? `${attractionStops.length} places` : undefined,
    },
    {
      label: isKn ? 'ದೈನಂದಿನ ಊಟ ಮತ್ತು ಉಪಾಹಾರ' : 'Daily Meals & Tiffin',
      icon: <Utensils size={16} color="#D97706" />,
      costMin: mealsMin,
      costMax: mealsMax,
      isVerified: mealsVerified,
      notes: day.meals_covered && day.meals_covered.length > 0 ? (isKn ? `${day.meals_covered.length} ಊಟಗಳು` : `${day.meals_covered.length} planned meals`) : undefined,
    },
    {
      label: isKn ? 'ಮಾರ್ಗ ಪ್ರಯಾಣ ಮತ್ತು ಇಂಧನ' : 'Route Travel & Fuel',
      icon: <Car size={16} color="#2563EB" />,
      costMin: transportMin,
      costMax: transportMax,
      isVerified: transportVerified,
      notes: day.driving_distance_km ? `~${day.driving_distance_km} km` : undefined,
    },
    {
      label: isKn ? 'ವಾಸ್ತವ್ಯ ಮತ್ತು ಹೋಟೆಲ್ ಶುಲ್ಕ' : 'Accommodation & Stay',
      icon: <Bed size={16} color="#7C3AED" />,
      costMin: stayMin,
      costMax: stayMax,
      isVerified: stayVerified,
      notes: stayStop?.name || day.accommodation_name || undefined,
    },
    {
      label: isKn ? 'ಇತರೆ / ಆಕಸ್ಮಿಕ ವೆಚ್ಚಗಳು' : 'Incidentals & Miscellaneous',
      icon: <Sparkles size={16} color="#475569" />,
      costMin: otherMin,
      costMax: otherMax,
      isVerified: false,
      notes: 'Parking, water, local tips',
    },
  ];

  const totalMin = rows.reduce((sum, r) => sum + r.costMin, 0);
  const totalMax = rows.reduce((sum, r) => sum + r.costMax, 0);

  const perPersonMin = Math.round(totalMin / travelers);
  const perPersonMax = Math.round(totalMax / travelers);

  const verifiedSubtotal = rows
    .filter((r) => r.isVerified)
    .reduce((sum, r) => sum + r.costMin, 0);

  return (
    <div
      className="nk-card"
      data-testid={`daily-budget-summary-day-${day.day_number}`}
    >
      <div className="nk-card-header">
        <div>
          <h3 className="nk-card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Wallet size={16} color="#0798B5" />
            <span>{isKn ? `ದಿನ ${day.day_number} ವೆಚ್ಚದ ಅಂದಾಜು` : `Day ${day.day_number} Daily Cost Breakdown`}</span>
          </h3>
          <p className="nk-card-desc">
            {isKn
              ? `${travelers} ಪ್ರಯಾಣಿಕರಿಗೆ ದೃಢೀಕೃತ ದರಗಳು ಮತ್ತು ಸರಾಸರಿ ಅಂದಾಜುಗಳು`
              : `Deterministic calculations & verified tariffs for ${travelers} ${travelers === 1 ? 'traveler' : 'travelers'}`}
          </p>
        </div>

        {/* Grand Total Badge */}
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', padding: '6px 12px', textAlign: 'right' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#065F46' }}>
            {isKn ? 'ದಿನದ ಒಟ್ಟು ಅಂದಾಜು' : 'Estimated Day Total'}
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#064E3B' }}>
            ₹{totalMin.toLocaleString('en-IN')} – ₹{totalMax.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Breakdown Rows */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map((row, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: idx < rows.length - 1 ? '1px solid #F1F5F9' : 'none',
              fontSize: '0.82rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {row.icon}
              </div>
              <div>
                <span style={{ fontWeight: 600, color: '#1E293B' }}>{row.label}</span>
                {row.notes && (
                  <span style={{ marginLeft: '6px', fontSize: '0.75rem', color: '#94A3B8' }}>({row.notes})</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontWeight: 700, color: '#0F172A' }}>
                {row.costMin === 0 && row.costMax === 0
                  ? isKn ? 'ಉಚಿತ' : 'Free'
                  : row.costMax > row.costMin
                  ? `₹${row.costMin.toLocaleString('en-IN')} – ₹${row.costMax.toLocaleString('en-IN')}`
                  : `₹${row.costMin.toLocaleString('en-IN')}`}
              </span>

              {row.isVerified ? (
                <span className="nk-badge-verified">
                  <CheckCircle2 size={10} />
                  <span>{isKn ? 'ಪರಿಶೀಲಿಸಲಾಗಿದೆ' : 'Verified'}</span>
                </span>
              ) : (
                <span className="nk-badge-est">
                  <span>≈ {isKn ? 'ಅಂದಾಜು' : 'Estimated'}</span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Footer Badges */}
      <div
        style={{
          marginTop: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          background: '#F8FAFC',
          borderRadius: '8px',
          padding: '10px 14px',
          fontSize: '0.8rem',
          color: '#475569',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            {isKn ? 'ಪ್ರತಿ ವ್ಯಕ್ತಿಗೆ ಅಂದಾಜು:' : 'Per-Person Est:'}{' '}
            <strong style={{ color: '#0F172A' }}>
              ₹{perPersonMin.toLocaleString('en-IN')} – ₹{perPersonMax.toLocaleString('en-IN')}
            </strong>
          </div>
          {verifiedSubtotal > 0 && (
            <div style={{ color: '#047857', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={12} /> {isKn ? 'ದೃಢೀಕೃತ ಮೊತ್ತ:' : 'Verified Portion:'}{' '}
              <strong>₹{verifiedSubtotal.toLocaleString('en-IN')}</strong>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#64748B' }}>
          <AlertCircle size={12} />
          <span>{isKn ? 'ನಿಖರ ರಸ್ತೆ ದೂರ ಮತ್ತು ಅಧಿಕೃತ ಟಿಕೆಟ್ ನಿಯಮಗಳು' : 'Actual road distances & verified rules'}</span>
        </div>
      </div>
    </div>
  );
};

export default DailyBudgetSummary;
