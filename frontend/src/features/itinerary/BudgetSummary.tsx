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
        return (
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '9999px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            ✓ {language === 'kn' ? 'ಪರಿಶೀಲಿಸಲಾಗಿದೆ' : 'Verified'}
          </span>
        );
      case 'estimated':
        return (
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '9999px',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            ≈ {language === 'kn' ? 'ಅಂದಾಜು' : 'Estimated'}
          </span>
        );
      case 'unknown':
        return (
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '9999px',
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#fbbf24',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            ? {language === 'kn' ? 'ತಿಳಿದಿಲ್ಲ' : 'Unknown'}
          </span>
        );
      case 'not_applicable':
        return (
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '9999px',
              background: 'rgba(148, 163, 184, 0.15)',
              color: '#94a3b8',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            - {language === 'kn' ? 'ಅನ್ವಯಿಸುವುದಿಲ್ಲ' : 'N/A'}
          </span>
        );
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

  const formatScenario = (scenario?: string) => {
    switch (scenario) {
      case 'budget':
        return language === 'kn' ? 'ಕಡಿಮೆ ಬಜೆಟ್ (ಹೋಮ್‌ಸ್ಟೇ)' : 'Budget-Conscious';
      case 'comfort':
        return language === 'kn' ? 'ಆರಾಮದಾಯಕ / ಐಷಾರಾಮಿ' : 'Comfort / Heritage';
      default:
        return language === 'kn' ? 'ಸಾಮಾನ್ಯ (ಸ್ಟ್ಯಾಂಡರ್ಡ್)' : 'Standard';
    }
  };

  // Find specific categories from budget response if available
  const findCategory = (keywords: string[]) => {
    if (!budget?.categories) return null;
    return budget.categories.find((c) =>
      keywords.some((k) => c.category_name.toLowerCase().includes(k.toLowerCase()))
    );
  };

  const transportCat = findCategory(['transport', 'fuel', 'transit']);
  const lodgingCat = findCategory(['accommodation', 'hotel', 'lodging', 'stay']);
  const foodCat = findCategory(['food', 'dining', 'meal']);
  const ticketCat = findCategory(['ticket', 'entry', 'attraction']);
  const contingencyCat = findCategory(['contingency', 'buffer', 'other']);

  return (
    <div
      className="budget-summary-card"
      data-testid="budget-summary-card"
      style={{
        background: '#FFFFFF',
        border: '1px solid #DCE6F2',
        borderRadius: '12px',
        padding: '24px',
        color: '#172033',
        boxShadow: 'var(--shadow-md)',
        margin: '24px 0',
      }}
    >
      {/* SECTION A: Trip Cost Overview (Hero Summary Card) */}
      <div
        style={{
          background: '#F0F9FF',
          border: '1px solid #BAE6FD',
          borderRadius: '10px',
          padding: '20px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0891B2', fontWeight: 700 }}>
              {t('tripCostOverview')}
            </span>
            <h3 style={{ margin: '6px 0 0 0', fontSize: '1.75rem', fontWeight: 800, color: '#172033' }}>
              {budget && budget.grand_total_min_inr !== null && budget.grand_total_min_inr !== undefined ? (
                `₹${budget.grand_total_min_inr.toLocaleString('en-IN')} – ₹${budget.grand_total_max_inr?.toLocaleString('en-IN')}`
              ) : (
                `₹${minEntryTotal} – ₹${maxEntryTotal}`
              )}
            </h3>
            <div style={{ fontSize: '0.9rem', color: '#64748B', marginTop: '4px' }}>
              {budget && budget.per_person_min_inr !== null && budget.per_person_min_inr !== undefined ? (
                <>
                  <span style={{ color: '#059669', fontWeight: 600 }}>
                    ≈ ₹{budget.per_person_min_inr.toLocaleString('en-IN')} – ₹{budget.per_person_max_inr?.toLocaleString('en-IN')}
                  </span>{' '}
                  / {language === 'kn' ? 'ಪ್ರಯಾಣಿಕರಿಗೆ' : 'traveler'}
                </>
              ) : (
                <span>{t('estimatedPerPerson')}</span>
              )}
            </div>
          </div>

          {/* Trip Parameters Badges */}
          {budget && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: '#E0F2FE',
                  color: '#0369A1',
                  border: '1px solid #BAE6FD',
                }}
              >
                👥 {budget.traveler_count} {language === 'kn' ? 'ಪ್ರಯಾಣಿಕರು' : 'travelers'}
              </span>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: '#E0F2FE',
                  color: '#0369A1',
                  border: '1px solid #BAE6FD',
                }}
              >
                🚗 {formatTransportMode(budget.travel_mode_used)} {budget.is_return_trip ? '(Round-trip)' : '(One-way)'}
              </span>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: '#FEF3C7',
                  color: '#92400E',
                  border: '1px solid #FDE68A',
                }}
              >
                🏷️ {formatScenario(budget.budget_scenario_used)}
              </span>
            </div>
          )}
        </div>

        {/* SECTION E: Budget Cap Comparison */}
        {budget && budget.budget_limit_inr !== undefined && budget.budget_limit_inr !== null && (
          <div
            data-testid="budget-limit-comparison-card"
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: budget.is_budget_feasible ? '#ECFDF5' : '#FEF2F2',
              border: `1px solid ${budget.is_budget_feasible ? '#A7F3D0' : '#FECACA'}`,
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem' }}>{budget.is_budget_feasible ? '🎯' : '⚠️'}</span>
                <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#172033' }}>
                  {language === 'kn' ? 'ನಿಗದಿಪಡಿಸಿದ ಬಜೆಟ್ ಮಿತಿ' : 'Target Budget Limit'}:
                </span>
                <span style={{ fontWeight: 700, fontSize: '0.98rem', color: '#D97706' }}>
                  ₹{budget.budget_limit_inr.toLocaleString('en-IN')}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  ({budget.budget_scope === 'per_person' ? (language === 'kn' ? 'ಪ್ರತಿ ಪ್ರಯಾಣಿಕನಿಗೆ' : 'Per Traveler') : (language === 'kn' ? 'ಸಂಪೂರ್ಣ ಗುಂಪು' : 'Entire Group')})
                </span>
              </div>
              <div>
                {budget.is_budget_feasible ? (
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      background: '#D1FAE5',
                      color: '#065F46',
                      border: '1px solid #6EE7B7',
                    }}
                  >
                    ✓ {t('withinBudgetBadge')}
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      background: '#FEE2E2',
                      color: '#991B1B',
                      border: '1px solid #FCA5A5',
                    }}
                  >
                    ⚠️ {t('budgetOverrunBadge')}: +₹{Math.round(budget.budget_overrun_inr || 0).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>
            {!budget.is_budget_feasible && (
              <div style={{ fontSize: '0.8rem', color: '#DC2626', lineHeight: 1.4, marginTop: '2px' }}>
                {language === 'kn'
                  ? `ಅಂದಾಜು ಕನಿಷ್ಠ ವೆಚ್ಚವು ನಿಮ್ಮ ಗುರಿ ಮಿತಿಗಿಂತ ₹${Math.round(budget.budget_overrun_inr || 0).toLocaleString('en-IN')} ಹೆಚ್ಚಾಗಿದೆ. ಕಡಿಮೆ ವೆಚ್ಚದ ಆಕರ್ಷಣೆಗಳನ್ನು ಆಯ್ಕೆಮಾಡಲು ಅಥವಾ ವಸತಿ ವರ್ಗ ಬದಲಾಯಿಸಲು ಶಿಫಾರಸು ಮಾಡುತ್ತೇವೆ.`
                  : `Estimated minimum expenses exceed your target budget cap by ₹${Math.round(budget.budget_overrun_inr || 0).toLocaleString('en-IN')}. Consider switching to public transit or choosing budget homestay accommodation.`}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION B: Canonical Itemized Cost Estimates Section */}
      <div
        className="itemized-cost-estimates-section"
        data-testid="itemized-cost-estimates-section"
        style={{ marginBottom: '24px' }}
      >
        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0891B2', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📊</span>
          <span>{language === 'kn' ? 'ವಿವರವಾದ ವೆಚ್ಚದ ಪಟ್ಟಿ' : 'Itemized Cost Estimates'}</span>
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
          {/* 1. Transportation */}
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0369A1' }}>
                  🚗 {t('categoryTransport')}
                </span>
                {renderStatusBadge(transportCat?.cost_status || 'estimated')}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#172033', margin: '8px 0 4px 0' }}>
                {transportCat?.estimated_min_inr !== undefined && transportCat?.estimated_min_inr !== null
                  ? transportCat.estimated_min_inr === transportCat.estimated_max_inr
                    ? `₹${transportCat.estimated_min_inr.toLocaleString('en-IN')}`
                    : `₹${transportCat.estimated_min_inr.toLocaleString('en-IN')} – ₹${transportCat.estimated_max_inr?.toLocaleString('en-IN')}`
                  : `₹${Math.round(stops.length * 450)}`}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>
                {transportCat?.calculation_basis || `${formatTransportMode(budget?.travel_mode_used)} route fuel & tolls`}
              </p>
            </div>
          </div>

          {/* 2. Accommodation */}
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0369A1' }}>
                  🏨 {t('categoryAccommodation')}
                </span>
                {renderStatusBadge(lodgingCat?.cost_status || 'estimated')}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#172033', margin: '8px 0 4px 0' }}>
                {lodgingCat?.estimated_min_inr !== undefined && lodgingCat?.estimated_min_inr !== null
                  ? lodgingCat.estimated_min_inr === lodgingCat.estimated_max_inr
                    ? `₹${lodgingCat.estimated_min_inr.toLocaleString('en-IN')}`
                    : `₹${lodgingCat.estimated_min_inr.toLocaleString('en-IN')} – ₹${lodgingCat.estimated_max_inr?.toLocaleString('en-IN')}`
                  : '₹0 (Day Trip)'}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>
                {lodgingCat?.calculation_basis || `${formatScenario(budget?.budget_scenario_used)} stays`}
              </p>
            </div>
          </div>

          {/* 3. Food & Dining */}
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0369A1' }}>
                  🍽️ {t('categoryFood')}
                </span>
                {renderStatusBadge(foodCat?.cost_status || 'estimated')}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#172033', margin: '8px 0 4px 0' }}>
                {foodCat?.estimated_min_inr !== undefined && foodCat?.estimated_min_inr !== null
                  ? foodCat.estimated_min_inr === foodCat.estimated_max_inr
                    ? `₹${foodCat.estimated_min_inr.toLocaleString('en-IN')}`
                    : `₹${foodCat.estimated_min_inr.toLocaleString('en-IN')} – ₹${foodCat.estimated_max_inr?.toLocaleString('en-IN')}`
                  : `₹${Math.round((budget?.traveler_count || 1) * 350)}`}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>
                {foodCat?.calculation_basis || 'Daily meals and regional tiffin allowance'}
              </p>
            </div>
          </div>

          {/* 4. Attraction Tickets */}
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0369A1' }}>
                  🎟️ {t('categoryTickets')}
                </span>
                {renderStatusBadge(ticketCat?.cost_status || (knownFeeCount > 0 ? 'verified' : 'unknown'))}
              </div>
              <div
                style={{ fontSize: '1.2rem', fontWeight: 800, color: '#172033', margin: '8px 0 4px 0' }}
                data-testid="total-estimated-fees"
              >
                {minEntryTotal === maxEntryTotal ? `₹${minEntryTotal}` : `₹${minEntryTotal} – ₹${maxEntryTotal}`}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>
                {knownFeeCount} of {stops.length} destinations confirmed ({freeCount} free)
                {unknownCount > 0 && ` · ${unknownCount} unconfirmed`}
              </p>
            </div>
          </div>

          {/* 5. Contingency Buffer & Other */}
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0369A1' }}>
                  🛡️ {t('categoryContingency')}
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: '#FEF3C7',
                    color: '#92400E',
                    border: '1px solid #FDE68A',
                  }}
                >
                  +10% Buffer
                </span>
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#172033', margin: '8px 0 4px 0' }}>
                {contingencyCat?.estimated_min_inr !== undefined && contingencyCat?.estimated_min_inr !== null
                  ? contingencyCat.estimated_min_inr === contingencyCat.estimated_max_inr
                    ? `₹${contingencyCat.estimated_min_inr.toLocaleString('en-IN')}`
                    : `₹${contingencyCat.estimated_min_inr.toLocaleString('en-IN')} – ₹${contingencyCat.estimated_max_inr?.toLocaleString('en-IN')}`
                  : '+10% contingency'}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>
                Reserve buffer for parking, local guide fees, and fuel fluctuations
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION C: Verified versus Estimated Costs */}
      {budget && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginBottom: '20px',
            padding: '14px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{t('verifiedSubtotalLabel')}</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#059669', marginTop: '2px' }}>
              ₹{budget.verified_subtotal_inr?.toLocaleString('en-IN') || 0}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
              {language === 'kn' ? 'ಅಧಿಕೃತ ಸರ್ಕಾರಿ ತಾಣ ದರಗಳು' : 'Based on official public tariffs'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{t('estimatedSubtotalLabel')}</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0891B2', marginTop: '2px' }}>
              ₹{budget.estimated_subtotal_min_inr?.toLocaleString('en-IN') || 0} – ₹{budget.estimated_subtotal_max_inr?.toLocaleString('en-IN') || 0}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
              {language === 'kn' ? 'ಮಾದರಿ ಮಾರ್ಗ ಮತ್ತು ಮಾರುಕಟ್ಟೆ ದರ' : 'Standard regional mileage & stay rates'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{t('contingencyLabel')}</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#D97706', marginTop: '2px' }}>
              +10% Buffer Included
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
              {language === 'kn' ? 'ಅನಿಶ್ಚಿತ ವೆಚ್ಚಗಳ ಮೀಸಲು' : 'Protects against unverified tolls/fees'}
            </div>
          </div>
        </div>
      )}

      {/* SECTION D: Collapsible Calculation Details ("How were these costs calculated?") */}
      <div style={{ marginBottom: '16px' }}>
        <button
          type="button"
          onClick={() => setShowNotes(!showNotes)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#0891B2',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '4px 0',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>{showNotes ? '▲' : '▼'}</span>
          <span>{t('howCalculatedTitle')}</span>
          {budget?.calculation_notes && (
            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>({budget.calculation_notes.length} notes)</span>
          )}
        </button>

        {showNotes && (
          <div
            style={{
              marginTop: '10px',
              padding: '14px',
              background: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              fontSize: '0.82rem',
              color: '#334155',
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontWeight: 600, color: '#172033', marginBottom: '6px' }}>
              {language === 'kn' ? 'ಲೆಕ್ಕಾಚಾರದ ಸೂತ್ರಗಳು ಮತ್ತು ಆಧಾರಗಳು:' : 'Calculation Formulas & Assumptions:'}
            </div>
            {budget?.calculation_notes && budget.calculation_notes.length > 0 ? (
              <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                {budget.calculation_notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            ) : (
              <p style={{ margin: 0 }}>
                {language === 'kn'
                  ? 'ವೆಚ್ಚಗಳನ್ನು ಕರ್ನಾಟಕದ ಅಧಿಕೃತ ಪ್ರವೇಶ ಶುಲ್ಕಗಳು, ಕೆಎಸ್‌ಆರ್‌ಟಿಸಿ/ಇಂಧನ ದರಗಳು ಮತ್ತು ಕೆಎಸ್‌ಟಿಡಿಸಿ ಹೋಟೆಲ್ ದರಗಳ ಆಧಾರದಲ್ಲಿ ಲೆಕ್ಕಹಾಕಲಾಗುತ್ತದೆ.'
                  : 'Costs are calculated deterministically using verified entry fees, prevailing KSRTC bus/train and car fuel efficiency benchmarks, and curated Karnataka hotel price bands.'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Warnings & Exclusions */}
      {budget && budget.has_unknown_costs && (
        <div className="budget-warning-banner" role="alert" style={{ marginBottom: '10px' }}>
          ⚠️ {language === 'kn' ? 'ಕೆಲವು ಆಕರ್ಷಣೆಗಳ ಪ್ರವೇಶ ಶುಲ್ಕ ಪರಿಶೀಲಿಸಿಲ್ಲ. ಇವುಗಳನ್ನು ಕನಿಷ್ಠ ವೆಚ್ಚದಲ್ಲಿ ಸೇರಿಸಲಾಗಿಲ್ಲ.' : 'Some attractions have unverified entry fees. These are excluded from minimum calculated totals.'}
        </div>
      )}

      <p className="budget-disclaimer" data-testid="budget-disclaimer" style={{ marginTop: '10px' }}>
        ℹ️ {t('budgetDisclaimer')}
      </p>
    </div>
  );
};
