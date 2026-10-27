import React, { useState, useMemo } from 'react';
import {
  PlanningRequest,
  DestinationCategory,
  Language,
  DestinationRead,
  KARNATAKA_DISTRICTS,
} from '../../types';
import { useTranslation, TranslationKey } from '../../lib/i18n';

interface TripPlannerFormProps {
  language: Language;
  onSubmit: (request: PlanningRequest) => void;
  isSubmitting: boolean;
  preselectedDestination?: DestinationRead | null;
  onClearPreselected?: () => void;
}

const CATEGORY_OPTIONS: DestinationCategory[] = [
  'heritage',
  'nature',
  'waterfall',
  'hill_station',
  'viewpoint',
  'architecture',
  'beach',
  'wildlife',
  'spiritual_cultural',
  'food_culture',
  'adventure',
  'museum',
];

const CATEGORY_THEMES: { id: string; labelEn: string; labelKn: string; icon: string; categories: DestinationCategory[] }[] = [
  {
    id: 'heritage_arch',
    labelEn: 'Heritage & Architecture',
    labelKn: 'ಪರಂಪರೆ ಮತ್ತು ವಾಸ್ತುಶಿಲ್ಪ',
    icon: '🏰',
    categories: ['heritage', 'architecture', 'museum'],
  },
  {
    id: 'nature_outdoors',
    labelEn: 'Nature & Hill Stations',
    labelKn: 'ಪ್ರಕೃತಿ ಮತ್ತು ಗಿರಿಧಾಮಗಳು',
    icon: '⛰️',
    categories: ['nature', 'hill_station', 'waterfall', 'viewpoint'],
  },
  {
    id: 'spiritual_culture',
    labelEn: 'Spiritual & Culture',
    labelKn: 'ಆಧ್ಯಾತ್ಮಿಕ ಮತ್ತು ಸಂಸ್ಕೃತಿ',
    icon: '🛕',
    categories: ['spiritual_cultural', 'food_culture'],
  },
  {
    id: 'coastal_wildlife',
    labelEn: 'Coastal & Wildlife Adventure',
    labelKn: 'ಕರಾವಳಿ ಮತ್ತು ವನ್ಯಜೀವಿ ಸಾಹಸ',
    icon: '🐅',
    categories: ['beach', 'wildlife', 'adventure'],
  },
];

export const TripPlannerForm: React.FC<TripPlannerFormProps> = ({
  language,
  onSubmit,
  isSubmitting,
  preselectedDestination,
  onClearPreselected,
}) => {
  const { t } = useTranslation(language);

  // Section 1: Trip Basics
  const [origin, setOrigin] = useState<string>('Bengaluru');
  const [durationInput, setDurationInput] = useState<string>('2');
  const [travelersInput, setTravelersInput] = useState<string>('2');
  const [pace, setPace] = useState<'relaxed' | 'balanced' | 'packed'>('balanced');

  const duration = parseInt(durationInput, 10);
  const isDurationValid = !isNaN(duration) && duration >= 1 && duration <= 7 && Number.isInteger(Number(durationInput));

  const travelers = parseInt(travelersInput, 10);
  const isTravelersValid = !isNaN(travelers) && travelers >= 1 && travelers <= 20 && Number.isInteger(Number(travelersInput));

  // Section 2: Dedicated Budget
  const [enableBudgetLimit, setEnableBudgetLimit] = useState<boolean>(false);
  const [budgetLimitInput, setBudgetLimitInput] = useState<string>('15000');
  const [budgetScope, setBudgetScope] = useState<'total_trip' | 'per_person'>('total_trip');
  const [budgetScenario, setBudgetScenario] = useState<'budget' | 'standard' | 'comfort'>('standard');

  // Section 3: Transportation
  const [travelMode, setTravelMode] = useState<'driving_car' | 'cab_taxi' | 'public_transit' | 'mixed'>('driving_car');
  const [isReturnTrip, setIsReturnTrip] = useState<boolean>(true);

  // Section 4: Flexible Categories (No 5-item cap)
  const [selectedCategories, setSelectedCategories] = useState<DestinationCategory[]>(
    preselectedDestination ? [preselectedDestination.category] : ['heritage', 'nature']
  );
  const [categorySearchQuery, setCategorySearchQuery] = useState<string>('');

  // Section 5: Flexible Districts (No 5-item cap)
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>(
    preselectedDestination ? [preselectedDestination.district_code] : []
  );
  const [districtSearchQuery, setDistrictSearchQuery] = useState<string>('');

  // Section 6: Additional Preferences
  const [isOffbeatPreferred, setIsOffbeatPreferred] = useState<boolean>(
    Boolean(preselectedDestination?.is_offbeat)
  );
  const [notes, setNotes] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Category Toggling & Controls
  const toggleCategory = (cat: DestinationCategory) => {
    setValidationError(null);
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleSelectAllCategories = () => {
    setSelectedCategories([...CATEGORY_OPTIONS]);
  };

  const handleClearAllCategories = () => {
    setSelectedCategories([]);
  };

  // District Toggling & Controls
  const toggleDistrict = (districtCode: string) => {
    setValidationError(null);
    if (selectedDistricts.includes(districtCode)) {
      setSelectedDistricts(selectedDistricts.filter((d) => d !== districtCode));
    } else {
      setSelectedDistricts([...selectedDistricts, districtCode]);
    }
  };

  const handleSelectAllDistricts = () => {
    setSelectedDistricts(KARNATAKA_DISTRICTS.map((d) => d.code));
  };

  const handleClearAllDistricts = () => {
    setSelectedDistricts([]);
  };

  // Filtered lists for search
  const filteredCategories = useMemo(() => {
    if (!categorySearchQuery.trim()) return CATEGORY_OPTIONS;
    const q = categorySearchQuery.toLowerCase().trim();
    return CATEGORY_OPTIONS.filter((cat) => {
      const transKey = `cat_${cat}` as TranslationKey;
      const label = t(transKey).toLowerCase();
      return cat.toLowerCase().includes(q) || label.includes(q);
    });
  }, [categorySearchQuery, t]);

  const filteredDistricts = useMemo(() => {
    if (!districtSearchQuery.trim()) return KARNATAKA_DISTRICTS;
    const q = districtSearchQuery.toLowerCase().trim();
    return KARNATAKA_DISTRICTS.filter((d) => {
      return (
        d.name_en.toLowerCase().includes(q) ||
        d.name_kn.includes(q) ||
        d.code.toLowerCase().includes(q)
      );
    });
  }, [districtSearchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!origin.trim()) {
      setValidationError(language === 'kn' ? 'ದಯವಿಟ್ಟು ಪ್ರಾರಂಭದ ಸ್ಥಳವನ್ನು ನಮೂದಿಸಿ.' : 'Please specify a starting location.');
      return;
    }

    if (!isDurationValid) {
      setValidationError(t('durationError'));
      return;
    }

    if (!isTravelersValid) {
      setValidationError(t('travelersError'));
      return;
    }

    let parsedBudgetLimit: number | undefined;
    if (enableBudgetLimit) {
      const cleanVal = budgetLimitInput.replace(/,/g, '').trim();
      const numVal = parseFloat(cleanVal);
      if (isNaN(numVal) || numVal <= 0) {
        setValidationError(
          language === 'kn'
            ? 'ದಯವಿಟ್ಟು ಮಾನ್ಯವಾದ ಧನಾತ್ಮಕ ಬಜೆಟ್ ಮೊತ್ತವನ್ನು ನಮೂದಿಸಿ (₹).'
            : 'Please specify a valid positive numeric budget limit in INR.'
        );
        return;
      }
      if (numVal > 10000000) {
        setValidationError(
          language === 'kn'
            ? 'ಬಜೆಟ್ ಮಿತಿ ಗರಿಷ್ಠ ₹೧ ಕೋಟಿ ಮೀರಬಾರದು.'
            : 'Budget limit cannot exceed ₹1,00,00,000 INR.'
        );
        return;
      }
      parsedBudgetLimit = numVal;
    }

    const payload: PlanningRequest = {
      language,
      origin_label: origin.trim(),
      duration_days: duration,
      travelers_count: travelers,
      preferred_districts: selectedDistricts.length > 0 ? selectedDistricts : undefined,
      categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      pace,
      is_offbeat_preferred: isOffbeatPreferred,
      travel_mode: travelMode,
      budget_scenario: budgetScenario,
      budget_limit_inr: parsedBudgetLimit,
      budget_scope: enableBudgetLimit ? budgetScope : undefined,
      is_return_trip: isReturnTrip,
      notes: notes.trim() ? notes.trim() : undefined,
    };

    onSubmit(payload);
  };

  return (
    <section className="planner-section" aria-label="Trip Planner Form">
      <div className="section-intro">
        <h2>{t('planYourTripTitle')}</h2>
        <p className="section-description">{t('planYourTripDesc')}</p>
      </div>

      {preselectedDestination && (
        <div className="preselected-banner">
          <span>
            🎯 Planning around{' '}
            <strong>
              {language === 'kn' && preselectedDestination.name_kn
                ? preselectedDestination.name_kn
                : preselectedDestination.name_en}
            </strong>
          </span>
          {onClearPreselected && (
            <button
              type="button"
              className="btn-clear-preselected"
              onClick={onClearPreselected}
              aria-label="Clear preselected destination"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {validationError && (
        <div className="form-error-banner" data-testid="planner-validation-error" role="alert">
          ⚠️ {validationError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="planner-form" noValidate>
        {/* SECTION 1: Trip Basics */}
        <div className="form-section-card" style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📍</span> {language === 'kn' ? 'ಪ್ರವಾಸದ ಮೂಲ ವಿವರಗಳು' : 'Trip Basics & Route Starting Point'}
          </h3>

          <div className="form-row two-col">
            <div className="form-field">
              <label htmlFor="planner-origin" className="form-label">
                📍 {t('originLabel')} *
              </label>
              <input
                id="planner-origin"
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder={t('originPlaceholder')}
                required
                className="form-input"
                data-testid="planner-origin-input"
              />
            </div>

            <div className="form-field">
              <label htmlFor="planner-duration-input" className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📅 {t('durationLabel')} *</span>
                <span style={{ fontSize: '0.78rem', color: isDurationValid ? '#94a3b8' : '#f87171' }}>
                  {isDurationValid ? `${duration} ${language === 'kn' ? 'ದಿನಗಳು' : duration === 1 ? 'Day' : 'Days'}` : t('durationHelp')}
                </span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  aria-label="Decrease duration"
                  data-testid="decrease-duration-btn"
                  onClick={() => {
                    const next = Math.max(1, (parseInt(durationInput, 10) || 2) - 1);
                    setDurationInput(String(next));
                    setValidationError(null);
                  }}
                  style={{ width: '38px', height: '38px', background: '#334155', border: '1px solid #475569', borderRadius: '6px', color: '#f8fafc', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0 }}
                >
                  −
                </button>
                <input
                  id="planner-duration-input"
                  type="number"
                  min={1}
                  max={7}
                  step={1}
                  value={durationInput}
                  onChange={(e) => {
                    setDurationInput(e.target.value);
                    setValidationError(null);
                  }}
                  className="form-input"
                  data-testid="planner-duration-input"
                  aria-invalid={!isDurationValid}
                  aria-describedby="planner-duration-hint"
                  style={{ textAlign: 'center', fontWeight: 700, fontSize: '1rem', borderColor: !isDurationValid && durationInput !== '' ? '#ef4444' : undefined }}
                />
                <button
                  type="button"
                  aria-label="Increase duration"
                  data-testid="increase-duration-btn"
                  onClick={() => {
                    const next = Math.min(7, (parseInt(durationInput, 10) || 1) + 1);
                    setDurationInput(String(next));
                    setValidationError(null);
                  }}
                  style={{ width: '38px', height: '38px', background: '#334155', border: '1px solid #475569', borderRadius: '6px', color: '#f8fafc', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0 }}
                >
                  +
                </button>
              </div>
              {!isDurationValid && durationInput !== '' && (
                <div id="planner-duration-hint" style={{ color: '#f87171', fontSize: '0.78rem', marginTop: '4px' }} role="alert">
                  ⚠️ {t('durationError')}
                </div>
              )}
            </div>
          </div>

          <div className="form-row two-col" style={{ marginTop: '16px' }}>
            <div className="form-field">
              <label htmlFor="planner-travelers-input" className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>👥 {t('travelersLabel')} *</span>
                <span style={{ fontSize: '0.78rem', color: isTravelersValid ? '#94a3b8' : '#f87171' }}>
                  {isTravelersValid ? `${travelers} ${language === 'kn' ? 'ಜನರು' : travelers === 1 ? 'Traveler' : 'Travelers'}` : t('travelersHelp')}
                </span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  aria-label="Decrease travelers"
                  data-testid="decrease-travelers-btn"
                  onClick={() => {
                    const next = Math.max(1, (parseInt(travelersInput, 10) || 2) - 1);
                    setTravelersInput(String(next));
                    setValidationError(null);
                  }}
                  style={{ width: '38px', height: '38px', background: '#334155', border: '1px solid #475569', borderRadius: '6px', color: '#f8fafc', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0 }}
                >
                  −
                </button>
                <input
                  id="planner-travelers-input"
                  type="number"
                  min={1}
                  max={20}
                  step={1}
                  value={travelersInput}
                  onChange={(e) => {
                    setTravelersInput(e.target.value);
                    setValidationError(null);
                  }}
                  className="form-input"
                  data-testid="planner-travelers-input"
                  aria-invalid={!isTravelersValid}
                  aria-describedby="planner-travelers-hint"
                  style={{ textAlign: 'center', fontWeight: 700, fontSize: '1rem', borderColor: !isTravelersValid && travelersInput !== '' ? '#ef4444' : undefined }}
                />
                <button
                  type="button"
                  aria-label="Increase travelers"
                  data-testid="increase-travelers-btn"
                  onClick={() => {
                    const next = Math.min(20, (parseInt(travelersInput, 10) || 1) + 1);
                    setTravelersInput(String(next));
                    setValidationError(null);
                  }}
                  style={{ width: '38px', height: '38px', background: '#334155', border: '1px solid #475569', borderRadius: '6px', color: '#f8fafc', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0 }}
                >
                  +
                </button>
              </div>
              {!isTravelersValid && travelersInput !== '' && (
                <div id="planner-travelers-hint" style={{ color: '#f87171', fontSize: '0.78rem', marginTop: '4px' }} role="alert">
                  ⚠️ {t('travelersError')}
                </div>
              )}
            </div>

            <div className="form-field">
              <label className="form-label">⚡ {t('paceLabel')}</label>
              <div className="pace-options">
                <label className={`pace-card ${pace === 'relaxed' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="pace"
                    value="relaxed"
                    checked={pace === 'relaxed'}
                    onChange={() => setPace('relaxed')}
                    className="visually-hidden"
                  />
                  <span className="pace-title">🐢 {t('paceRelaxed')}</span>
                </label>

                <label className={`pace-card ${pace === 'balanced' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="pace"
                    value="balanced"
                    checked={pace === 'balanced'}
                    onChange={() => setPace('balanced')}
                    className="visually-hidden"
                  />
                  <span className="pace-title">⚖️ {t('paceBalanced')}</span>
                </label>

                <label className={`pace-card ${pace === 'packed' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="pace"
                    value="packed"
                    checked={pace === 'packed'}
                    onChange={() => setPace('packed')}
                    className="visually-hidden"
                  />
                  <span className="pace-title">🚀 {t('pacePacked')}</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Trip Budget */}
        <div className="form-section-card" data-testid="planner-budget-section" style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>💰</span> {t('tripBudgetTitle')}
            </h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem', color: '#38bdf8', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={enableBudgetLimit}
                onChange={(e) => setEnableBudgetLimit(e.target.checked)}
                data-testid="enable-budget-limit-checkbox"
                style={{ width: '16px', height: '16px', accentColor: '#0284c7' }}
              />
              <span>{language === 'kn' ? 'ಗರಿಷ್ಠ ಬಜೆಟ್ ಮಿತಿ ನಿಗದಿಪಡಿಸಿ' : 'Set explicit spending limit'}</span>
            </label>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 16px 0' }}>{t('tripBudgetSubtitle')}</p>

          {enableBudgetLimit && (
            <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155', marginBottom: '16px' }}>
              <div className="form-row two-col">
                <div className="form-field">
                  <label htmlFor="planner-budget-amount" className="form-label" style={{ color: '#38bdf8' }}>
                    💵 {t('budgetLimitLabel')}
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '12px', color: '#94a3b8', fontWeight: 700, fontSize: '1rem' }}>₹</span>
                    <input
                      id="planner-budget-amount"
                      type="number"
                      min={100}
                      step={100}
                      value={budgetLimitInput}
                      onChange={(e) => setBudgetLimitInput(e.target.value)}
                      placeholder="e.g. 15000"
                      className="form-input"
                      data-testid="planner-budget-amount-input"
                      style={{ paddingLeft: '28px', fontWeight: 600, fontSize: '1rem' }}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">{language === 'kn' ? 'ಬಜೆಟ್ ವ್ಯಾಪ್ತಿ' : 'Budget Applies To'}</label>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#f1f5f9', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="budget_scope"
                        value="total_trip"
                        checked={budgetScope === 'total_trip'}
                        onChange={() => setBudgetScope('total_trip')}
                        data-testid="budget-scope-total"
                      />
                      <span>{t('budgetScopeGroup')}</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#f1f5f9', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="budget_scope"
                        value="per_person"
                        checked={budgetScope === 'per_person'}
                        onChange={() => setBudgetScope('per_person')}
                        data-testid="budget-scope-person"
                      />
                      <span>{t('budgetScopePerson')}</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Inclusions & Exclusions Card */}
              <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(30, 41, 59, 0.6)', borderRadius: '6px', borderLeft: '3px solid #38bdf8', fontSize: '0.78rem', color: '#cbd5e1' }}>
                <div style={{ fontWeight: 600, color: '#38bdf8', marginBottom: '2px' }}>✓ {t('budgetIncludesTitle')}</div>
                <div style={{ color: '#94a3b8' }}>{t('budgetIncludesList')}</div>
                <div style={{ marginTop: '4px', color: '#64748b' }}>ℹ️ {t('budgetExcludesTitle')}</div>
              </div>
            </div>
          )}

          <div className="form-row two-col" style={{ marginTop: '12px' }}>
            <div className="form-field">
              <label htmlFor="planner-scenario" className="form-label">
                🏷️ {t('budgetScenarioLabel')}
              </label>
              <select
                id="planner-scenario"
                value={budgetScenario}
                onChange={(e) => setBudgetScenario(e.target.value as 'budget' | 'standard' | 'comfort')}
                className="form-input"
                data-testid="planner-budget-scenario"
              >
                <option value="budget">{t('scenarioBudget')}</option>
                <option value="standard">{t('scenarioStandard')}</option>
                <option value="comfort">{t('scenarioComfort')}</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="planner-transport-mode" className="form-label">
                🚗 {t('travelModeLabel')}
              </label>
              <select
                id="planner-transport-mode"
                value={travelMode}
                onChange={(e) => setTravelMode(e.target.value as 'driving_car' | 'cab_taxi' | 'public_transit' | 'mixed')}
                className="form-input"
                data-testid="planner-travel-mode"
              >
                <option value="driving_car">{t('modeDrivingCar')}</option>
                <option value="cab_taxi">{t('modeCabTaxi')}</option>
                <option value="public_transit">{t('modePublicTransit')}</option>
                <option value="mixed">{t('modeMixed')}</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '10px' }}>
            <label className="checkbox-label" htmlFor="planner-return-trip" style={{ fontSize: '0.85rem' }}>
              <input
                id="planner-return-trip"
                type="checkbox"
                checked={isReturnTrip}
                onChange={(e) => setIsReturnTrip(e.target.checked)}
                data-testid="planner-return-trip-checkbox"
              />
              <span>🔄 {t('returnTripLabel')}</span>
            </label>
          </div>
        </div>

        {/* SECTION 4: Categories (Uncapped & Searchable) */}
        <div className="form-section-card" data-testid="planner-categories-section" style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🏷️</span> {t('selectCategories')}
              <span style={{ fontSize: '0.8rem', background: '#334155', color: '#38bdf8', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                {selectedCategories.length} {language === 'kn' ? 'ಆಯ್ಕೆಯಾಗಿದೆ' : 'selected'}
              </span>
            </h3>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleSelectAllCategories}
                style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer' }}
                data-testid="categories-select-all"
              >
                ✓ {t('selectAll')}
              </button>
              <button
                type="button"
                onClick={handleClearAllCategories}
                style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer' }}
                data-testid="categories-clear-all"
              >
                ✕ {t('clearAll')}
              </button>
            </div>
          </div>

          {/* Search Categories */}
          <div style={{ marginBottom: '14px' }}>
            <input
              type="text"
              value={categorySearchQuery}
              onChange={(e) => setCategorySearchQuery(e.target.value)}
              placeholder={t('searchCategories')}
              className="form-input"
              data-testid="categories-search-input"
              style={{ fontSize: '0.85rem', padding: '8px 12px' }}
            />
          </div>

          {/* Category Chips Container */}
          <div className="chips-container" data-testid="categories-chips-container">
            {filteredCategories.map((cat) => {
              const isSelected = selectedCategories.includes(cat);
              const key = `cat_${cat}` as TranslationKey;
              return (
                <button
                  key={cat}
                  type="button"
                  className={`chip ${isSelected ? 'chip-active' : ''}`}
                  onClick={() => toggleCategory(cat)}
                  data-testid={`category-chip-${cat}`}
                >
                  {isSelected ? '✓ ' : '+ '}
                  {t(key)}
                </button>
              );
            })}
          </div>

          {/* Thematic Category Discovery Helpers */}
          {!categorySearchQuery && (
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #334155' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {language === 'kn' ? 'ವಿಷಯಾಧಾರಿತ ಗುಂಪುಗಳು' : 'Thematic Groups:'}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {CATEGORY_THEMES.map((theme) => {
                  const allThemeSelected = theme.categories.every((c) => selectedCategories.includes(c));
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => {
                        const newSelection = Array.from(new Set([...selectedCategories, ...theme.categories]));
                        setSelectedCategories(newSelection);
                      }}
                      style={{
                        background: allThemeSelected ? 'rgba(56, 189, 248, 0.15)' : '#0f172a',
                        border: allThemeSelected ? '1px solid #38bdf8' : '1px solid #334155',
                        borderRadius: '20px',
                        padding: '4px 12px',
                        fontSize: '0.75rem',
                        color: allThemeSelected ? '#38bdf8' : '#cbd5e1',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>{theme.icon}</span>
                      <span>{language === 'kn' ? theme.labelKn : theme.labelEn}</span>
                      <span style={{ fontSize: '0.65rem', color: '#64748b' }}>+{theme.categories.length}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 5: Districts (Uncapped & Searchable) */}
        <div className="form-section-card" data-testid="planner-districts-section" style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🏛️</span> {t('selectDistricts')}
              <span style={{ fontSize: '0.8rem', background: '#334155', color: '#38bdf8', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                {selectedDistricts.length}/31 {language === 'kn' ? 'ಆಯ್ಕೆಯಾಗಿದೆ' : 'selected'}
              </span>
            </h3>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleSelectAllDistricts}
                style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer' }}
                data-testid="districts-select-all"
              >
                ✓ {t('selectAll')} (31)
              </button>
              <button
                type="button"
                onClick={handleClearAllDistricts}
                style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer' }}
                data-testid="districts-clear-all"
              >
                ✕ {t('clearAll')}
              </button>
            </div>
          </div>

          {/* Search Districts */}
          <div style={{ marginBottom: '14px' }}>
            <input
              type="text"
              value={districtSearchQuery}
              onChange={(e) => setDistrictSearchQuery(e.target.value)}
              placeholder={t('searchDistricts')}
              className="form-input"
              data-testid="districts-search-input"
              style={{ fontSize: '0.85rem', padding: '8px 12px' }}
            />
          </div>

          {/* District Chips Container */}
          <div
            className="chips-container"
            data-testid="districts-chips-container"
            style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}
          >
            {filteredDistricts.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: '#64748b', padding: '8px' }}>
                {language === 'kn' ? 'ಯಾವುದೇ ಜಿಲ್ಲೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ' : 'No matching districts found'}
              </div>
            ) : (
              filteredDistricts.map((d) => {
                const isSelected = selectedDistricts.includes(d.code);
                return (
                  <button
                    key={d.code}
                    type="button"
                    className={`chip ${isSelected ? 'chip-active' : ''}`}
                    onClick={() => toggleDistrict(d.code)}
                    data-testid={`district-chip-${d.code}`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {language === 'kn' ? d.name_kn : d.name_en}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* SECTION 6: Additional Preferences */}
        <div className="form-section-card" style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <div className="form-field checkbox-field" style={{ marginBottom: '16px' }}>
            <label className="checkbox-label" htmlFor="planner-offbeat">
              <input
                id="planner-offbeat"
                type="checkbox"
                checked={isOffbeatPreferred}
                onChange={(e) => setIsOffbeatPreferred(e.target.checked)}
                data-testid="planner-offbeat-checkbox"
              />
              <span>⭐ {t('prioritizeOffbeat')}</span>
            </label>
          </div>

          <div className="form-field">
            <label htmlFor="planner-notes" className="form-label">
              📝 {t('notesLabel')}
            </label>
            <textarea
              id="planner-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('notesPlaceholder')}
              maxLength={300}
              className="form-textarea"
              data-testid="planner-notes-input"
            />
          </div>
        </div>

        {/* SECTION 7: Generation Summary & Submit */}
        <div className="form-actions" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.78rem', color: '#94a3b8', background: '#0f172a', padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155' }}>
            <span><strong>Trip:</strong> {isDurationValid ? `${duration}d` : '—'} from {origin} ({isTravelersValid ? `${travelers}p` : '—'})</span>
            <span>•</span>
            <span><strong>Transport:</strong> {travelMode.replace('_', ' ')}</span>
            <span>•</span>
            <span><strong>Budget:</strong> {enableBudgetLimit ? `₹${parseFloat(budgetLimitInput || '0').toLocaleString('en-IN')} (${budgetScope})` : budgetScenario.toUpperCase()}</span>
            <span>•</span>
            <span><strong>Interests:</strong> {selectedCategories.length} categories</span>
            <span>•</span>
            <span><strong>Districts:</strong> {selectedDistricts.length > 0 ? `${selectedDistricts.length} selected` : 'All Karnataka'}</span>
          </div>

          <button
            type="submit"
            className="btn-submit-plan"
            disabled={isSubmitting || !isDurationValid || !isTravelersValid}
            data-testid="submit-plan-button"
            style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 700 }}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-sm" aria-hidden="true" />
                {t('generatingButton')}
              </>
            ) : (
              <>✨ {t('generateButton')}</>
            )}
          </button>
        </div>
      </form>
    </section>
  );
};
