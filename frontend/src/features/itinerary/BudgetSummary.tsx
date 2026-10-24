import React, { useState } from 'react';
import { RecommendedDestination, CompleteBudgetBreakdown, Language, CostStatus } from '../../types';
import { useTranslation } from '../../lib/i18n';

interface BudgetSummaryProps {
  stops: RecommendedDestination[];
  language: Language;
  budget?: CompleteBudgetBreakdown;
}

export const BudgetSummary: React.FC<BudgetSummaryProps> = ({ stops, language, budget }) => {
  const { t } = useTranslation(language);
  const [showNotes, setShowNotes] = useState<boolean>(false);

  // Deterministic entry fee aggregation
  let minEntryTotal = 0;
  let maxEntryTotal = 0;
  let knownFeeCount = 0;
  let freeCount = 0;
  let unknownCount = 0;

  for (const stop of stops) {
    if (stop.entry_fee_min_inr === 0 && stop.entry_fee_max_inr === 0) {
      freeCount++;
      knownFeeCount++;
    } else if (stop.entry_fee_min_inr !== undefined && stop.entry_fee_min_inr !== null) {
      minEntryTotal += stop.entry_fee_min_inr;
      maxEntryTotal += stop.entry_fee_max_inr || stop.entry_fee_min_inr;
      knownFeeCount++;
    } else {
      unknownCount++;
    }
  }

  const renderStatusBadge = (status: CostStatus) => {
    switch (status) {
      case 'verified':
        return <span className="status-badge status-verified">✓ {language === 'kn' ? 'ಪರಿಶೀಲಿಸಲಾಗಿದೆ' : 'Verified'}</span>;
      case 'estimated':
        return <span className="status-badge status-estimated">≈ {language === 'kn' ? 'ಅಂದಾಜು' : 'Estimated'}</span>;
      case 'unknown':
        return <span className="status-badge status-unknown">? {language === 'kn' ? 'ತಿಳಿದಿಲ್ಲ' : 'Unknown'}</span>;
      default:
        return null;
    }
  };

  const formatTransportMode = (mode?: string) => {
    switch (mode) {
      case 'driving_car':
        return language === 'kn' ? 'ಸ್ವಂತ ಕಾರು (ಇಂಧನ)' : 'Private Car (Fuel)';
      case 'cab_taxi':
        return language === 'kn' ? 'ಕ್ಯಾಬ್ / ಟ್ಯಾಕ್ಸಿ' : 'Outstation Cab';
      case 'public_transit':
        return language === 'kn' ? 'ಸಾರ್ವಜನಿಕ ಸಾರಿಗೆ' : 'Public Transit (Bus/Rail)';
      case 'mixed':
        return language === 'kn' ? 'ಮಿಶ್ರ ಸಾರಿಗೆ' : 'Mixed Multimodal';
      default:
        return mode || (language === 'kn' ? 'ರಸ್ತೆ ಸಾರಿಗೆ' : 'Road Transit');
    }
  };

  return (
    <div className="budget-summary-card" data-testid="budget-summary-card">
      <div className="budget-header">
        <div>
          <h4 className="budget-title">💰 {t('budgetTitle')}</h4>
          {budget && (
            <div style={{ marginTop: '4px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                🚗 {formatTransportMode(budget.travel_mode_used)} {budget.is_return_trip ? '(Round-trip)' : '(One-way)'}
              </span>
              <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                🏷️ {budget.budget_scenario_used ? budget.budget_scenario_used.toUpperCase() : 'STANDARD'}
              </span>
            </div>
          )}
        </div>

        {budget && budget.grand_total_min_inr !== null && (
          <div className="budget-grand-total">
            <span className="grand-total-label">{language === 'kn' ? 'ಒಟ್ಟು ಅಂದಾಜು ವೆಚ್ಚ' : 'Est. Trip Total'}:</span>
            <span className="grand-total-amount">
              ₹{budget.grand_total_min_inr} – ₹{budget.grand_total_max_inr}
            </span>
            <span className="per-person-sub">
              (≈ ₹{budget.per_person_min_inr} – ₹{budget.per_person_max_inr} / {language === 'kn' ? 'ಪ್ರಯಾಣಿಕ' : 'traveler'})
            </span>
          </div>
        )}
      </div>

      {/* Subtotals & Breakdown Bar */}
      {budget && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '10px',
            margin: '12px 0',
            padding: '10px 14px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t('verifiedSubtotalLabel')}</div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#166534' }}>
              ₹{budget.verified_subtotal_inr || 0}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t('estimatedSubtotalLabel')}</div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f766e' }}>
              ₹{budget.estimated_subtotal_min_inr || 0} – ₹{budget.estimated_subtotal_max_inr || 0}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t('contingencyLabel')}</div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#b45309' }}>
              +10% Buffer Included
            </div>
          </div>
        </div>
      )}

      <div className="budget-grid">
        <div className="budget-stat">
          <span className="budget-stat-label">{t('totalEstimatedFees')}</span>
          <span className="budget-stat-value text-accent" data-testid="total-estimated-fees">
            {minEntryTotal === maxEntryTotal ? `₹${minEntryTotal}` : `₹${minEntryTotal} – ₹${maxEntryTotal}`}
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

      {/* Categorized Detailed Breakdown Table */}
      {budget && budget.categories.length > 0 && (
        <div className="budget-categories-section">
          <h5 className="breakdown-subtitle">{language === 'kn' ? 'ವೆಚ್ಚದ ವಿವರಣೆ' : 'Itemized Cost Estimates'}</h5>
          <div className="budget-table-wrapper">
            <table className="budget-categories-table">
              <thead>
                <tr>
                  <th>{language === 'kn' ? 'ವರ್ಗ' : 'Category'}</th>
                  <th>{language === 'kn' ? 'ಅಂದಾಜು' : 'Estimate'}</th>
                  <th>{language === 'kn' ? 'ಸ್ಥಿತಿ' : 'Status'}</th>
                  <th>{language === 'kn' ? 'ಆಧಾರ ಮತ್ತು ವಿವರ' : 'Calculation Basis & Notes'}</th>
                </tr>
              </thead>
              <tbody>
                {budget.categories.map((cat, idx) => (
                  <tr key={idx}>
                    <td className="cat-name">
                      {cat.category_name}
                      {cat.basis_type && (
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                          [{cat.basis_type === 'per_person' ? 'Per Person' : 'Per Group'}]
                        </div>
                      )}
                    </td>
                    <td className="cat-amount">
                      {cat.estimated_min_inr !== null && cat.estimated_min_inr !== undefined ? (
                        cat.estimated_min_inr === cat.estimated_max_inr
                          ? `₹${cat.estimated_min_inr}`
                          : `₹${cat.estimated_min_inr} – ₹${cat.estimated_max_inr}`
                      ) : (
                        <span className="text-muted">Unverified</span>
                      )}
                    </td>
                    <td>{renderStatusBadge(cat.cost_status)}</td>
                    <td className="cat-basis">
                      <div>{cat.calculation_basis}</div>
                      {cat.notes && (
                        <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px', fontStyle: 'italic' }}>
                          {cat.notes}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expandable Model Notes and Assumptions */}
      {budget && budget.calculation_notes && budget.calculation_notes.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <button
            type="button"
            onClick={() => setShowNotes(!showNotes)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#0f766e',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '4px 0',
            }}
          >
            {showNotes ? '▲ ' : '▼ '} {t('calculationNotesTitle')} ({budget.calculation_notes.length})
          </button>
          {showNotes && (
            <ul
              style={{
                margin: '6px 0 0 16px',
                padding: 0,
                fontSize: '0.78rem',
                color: '#475569',
                lineHeight: 1.5,
              }}
            >
              {budget.calculation_notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {budget && budget.has_unknown_costs && (
        <div className="budget-warning-banner" role="alert" style={{ marginTop: '10px' }}>
          ⚠️ {language === 'kn' ? 'ಕೆಲವು ಆಕರ್ಷಣೆಗಳ ಪ್ರವೇಶ ಶುಲ್ಕ ಪರಿಶೀಲಿಸಿಲ್ಲ. ಇವುಗಳನ್ನು ಕನಿಷ್ಠ ವೆಚ್ಚದಲ್ಲಿ ಸೇರಿಸಲಾಗಿಲ್ಲ.' : 'Some attractions have unverified entry fees. These are excluded from minimum calculated totals.'}
        </div>
      )}

      <p className="budget-disclaimer" data-testid="budget-disclaimer" style={{ marginTop: '10px' }}>
        ℹ️ {t('budgetDisclaimer')}
      </p>
    </div>
  );
};
