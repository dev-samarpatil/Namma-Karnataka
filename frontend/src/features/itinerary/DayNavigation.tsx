import React from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, Calendar } from 'lucide-react';
import { Language } from '../../types';
import './DayWiseItinerary.css';

export interface DayNavigationProps {
  currentDay: number; // 1-based
  totalDays: number;
  onSelectDay: (dayNumber: number) => void;
  isAllDaysView: boolean;
  onToggleAllDaysView: () => void;
  language: Language;
}

export const DayNavigation: React.FC<DayNavigationProps> = ({
  currentDay,
  totalDays,
  onSelectDay,
  isAllDaysView,
  onToggleAllDaysView,
  language,
}) => {
  const isKn = language === 'kn';

  const handlePrev = () => {
    if (currentDay > 1) {
      onSelectDay(currentDay - 1);
    }
  };

  const handleNext = () => {
    if (currentDay < totalDays) {
      onSelectDay(currentDay + 1);
    }
  };

  return (
    <div
      className="nk-day-navbar"
      data-testid="day-navigation-controls"
    >
      {/* Left: Previous Day Button */}
      <div className="nk-day-navbar-left">
        <button
          type="button"
          className="btn-secondary"
          onClick={handlePrev}
          disabled={isAllDaysView || currentDay <= 1}
          data-testid="day-nav-prev-btn"
          aria-label="Go to previous day"
          style={{ fontSize: '0.82rem', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ChevronLeft size={16} />
          <span>{isKn ? 'ಹಿಂದಿನ ದಿನ' : 'Previous Day'}</span>
        </button>
      </div>

      {/* Middle: Day Status indicator & quick jump chips */}
      <div className="nk-day-navbar-center">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', marginRight: '6px' }}>
          <Calendar size={15} color="#0891B2" />
          <span>
            {isAllDaysView
              ? isKn
                ? `ಎಲ್ಲಾ ${totalDays} ದಿನಗಳ ಸಾರಾಂಶ`
                : `All ${totalDays} Days Overview`
              : isKn
              ? `ದಿನ ${currentDay} / ${totalDays}`
              : `Day ${currentDay} of ${totalDays}`}
          </span>
        </div>

        {!isAllDaysView && totalDays > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {Array.from({ length: totalDays }, (_, i) => i + 1).map((dNum) => (
              <button
                key={dNum}
                type="button"
                onClick={() => onSelectDay(dNum)}
                className={`nk-day-chip ${dNum === currentDay ? 'active' : ''}`}
                aria-label={`Jump to Day ${dNum}`}
                data-testid={`quick-day-jump-${dNum}`}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                }}
              >
                {dNum}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Next Day Button and View All Days toggle */}
      <div className="nk-day-navbar-right">
        <button
          type="button"
          className="btn-secondary"
          onClick={handleNext}
          disabled={isAllDaysView || currentDay >= totalDays}
          data-testid="day-nav-next-btn"
          aria-label="Go to next day"
          style={{ fontSize: '0.82rem', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <span>{isKn ? 'ಮುಂದಿನ ದಿನ' : 'Next Day'}</span>
          <ChevronRight size={16} />
        </button>

        <button
          type="button"
          className={isAllDaysView ? 'btn-primary' : 'btn-secondary'}
          onClick={onToggleAllDaysView}
          data-testid="toggle-all-days-btn"
          aria-label={isAllDaysView ? 'Switch to day-by-day view' : 'View all days overview'}
          style={{ fontSize: '0.82rem', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <LayoutGrid size={15} />
          <span>{isAllDaysView ? (isKn ? 'ದಿನವೀಕ್ಷಣೆಗೆ ಮರಳಿ' : 'Return to Day') : (isKn ? 'ಎಲ್ಲಾ ದಿನಗಳು' : 'View All Days')}</span>
        </button>
      </div>
    </div>
  );
};

export default DayNavigation;
