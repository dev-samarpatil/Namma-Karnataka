import React from 'react';
import { RecommendedDestination, Language } from '../../types';
import { useTranslation } from '../../lib/i18n';

interface BudgetSummaryProps {
  stops: RecommendedDestination[];
  language: Language;
}

export const BudgetSummary: React.FC<BudgetSummaryProps> = ({ stops, language }) => {
  const { t } = useTranslation(language);

  // Deterministic aggregation
  let minTotal = 0;
  let maxTotal = 0;
  let knownFeeCount = 0;
  let freeCount = 0;
  let unknownCount = 0;

  for (const stop of stops) {
    if (stop.entry_fee_min_inr === 0 && stop.entry_fee_max_inr === 0) {
      freeCount++;
      knownFeeCount++;
    } else if (stop.entry_fee_min_inr !== undefined && stop.entry_fee_min_inr !== null) {
      minTotal += stop.entry_fee_min_inr;
      maxTotal += stop.entry_fee_max_inr || stop.entry_fee_min_inr;
      knownFeeCount++;
    } else {
      unknownCount++;
    }
  }

  return (
    <div className="budget-summary-card" data-testid="budget-summary-card">
      <div className="budget-header">
        <h4 className="budget-title">💰 {t('budgetTitle')}</h4>
      </div>

      <div className="budget-grid">
        <div className="budget-stat">
          <span className="budget-stat-label">{t('totalEstimatedFees')}</span>
          <span className="budget-stat-value text-accent" data-testid="total-estimated-fees">
            {minTotal === maxTotal ? `₹${minTotal}` : `₹${minTotal} – ₹${maxTotal}`}
          </span>
        </div>

        <div className="budget-stat">
          <span className="budget-stat-label">Confirmed Destinations</span>
          <span className="budget-stat-value">
            {knownFeeCount} of {stops.length} ({freeCount} free)
          </span>
        </div>

        {unknownCount > 0 && (
          <div className="budget-stat">
            <span className="budget-stat-label">Unconfirmed Fees</span>
            <span className="budget-stat-value text-warning" data-testid="unknown-fees-count">
              {unknownCount} {t('destinationsWithUnknownFees')}
            </span>
          </div>
        )}
      </div>

      <p className="budget-disclaimer" data-testid="budget-disclaimer">
        ℹ️ {t('budgetDisclaimer')}
      </p>
    </div>
  );
};
