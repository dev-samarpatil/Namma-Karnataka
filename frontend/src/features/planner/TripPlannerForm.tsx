import React, { useState, useMemo } from 'react';
import {
  PlanningRequest,
  DestinationCategory,
  Language,
  DestinationRead,
  KARNATAKA_DISTRICTS,
} from '../../types';
import { useTranslation, TranslationKey } from '../../lib/i18n';
import {
  MapPin,
  CalendarDays,
  Users,
  Minus,
  Plus,
  Coffee,
  Scale,
  Zap,
  Check,
  Wallet,
  Tags,
  Landmark,
  Mountain,
  Sparkles,
  Waves,
  Search,
  Car,
  RotateCcw,
  Star,
  FileText,
  Info,
  AlertTriangle,
  X,
  Clock,
  ChevronDown,
} from 'lucide-react';

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

interface CategoryTheme {
  id: string;
  labelEn: string;
  labelKn: string;
  icon: React.ReactNode;
  categories: DestinationCategory[];
}

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
  const [strictBudget, setStrictBudget] = useState<boolean>(false);
  const [dietaryPreference, setDietaryPreference] = useState<string>('all');
  const [accommodationType, setAccommodationType] = useState<string>('any');

  // Section 3: Transportation
  const [travelMode, setTravelMode] = useState<'driving_car' | 'cab_taxi' | 'public_transit' | 'mixed'>('driving_car');
  const [isReturnTrip, setIsReturnTrip] = useState<boolean>(true);

  // Section 4: Flexible Categories
  const [selectedCategories, setSelectedCategories] = useState<DestinationCategory[]>(
    preselectedDestination ? [preselectedDestination.category] : ['heritage', 'nature']
  );
  const [categorySearchQuery, setCategorySearchQuery] = useState<string>('');

  // Section 5: Flexible Districts
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

  const categoryThemes: CategoryTheme[] = useMemo(
    () => [
      {
        id: 'heritage_arch',
        labelEn: 'Heritage & Architecture',
        labelKn: 'ಪರಂಪರೆ ಮತ್ತು ವಾಸ್ತುಶಿಲ್ಪ',
        icon: <Landmark size={15} strokeWidth={2} />,
        categories: ['heritage', 'architecture', 'museum'],
      },
      {
        id: 'nature_outdoors',
        labelEn: 'Nature & Hill Stations',
        labelKn: 'ಪ್ರಕೃತಿ ಮತ್ತು ಗಿರಿಧಾಮಗಳು',
        icon: <Mountain size={15} strokeWidth={2} />,
        categories: ['nature', 'hill_station', 'waterfall', 'viewpoint'],
      },
      {
        id: 'spiritual_culture',
        labelEn: 'Spiritual & Culture',
        labelKn: 'ಆಧ್ಯಾತ್ಮಿಕ ಮತ್ತು ಸಂಸ್ಕೃತಿ',
        icon: <Sparkles size={15} strokeWidth={2} />,
        categories: ['spiritual_cultural', 'food_culture'],
      },
      {
        id: 'coastal_wildlife',
        labelEn: 'Coastal & Wildlife Adventure',
        labelKn: 'ಕರಾವಳಿ ಮತ್ತು ವನ್ಯಜೀವಿ ಸಾಹಸ',
        icon: <Waves size={15} strokeWidth={2} />,
        categories: ['beach', 'wildlife', 'adventure'],
      },
    ],
    []
  );

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
      setValidationError(
        language === 'kn' ? 'ದಯವಿಟ್ಟು ಪ್ರಾರಂಭದ ಸ್ಥಳವನ್ನು ನಮೂದಿಸಿ.' : 'Please specify a starting location.'
      );
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
      strict_budget: enableBudgetLimit ? strictBudget : false,
      dietary_preference: dietaryPreference,
      accommodation_type_preference: accommodationType,
      notes: notes.trim() ? notes.trim() : undefined,
    };

    onSubmit(payload);
  };

  return (
    <section className="planner-section" aria-label="Trip Planner Form">
      <div className="section-intro" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.15rem)', fontWeight: 800, color: '#172033', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
          {t('planYourTripTitle')}
        </h2>
        <p className="section-description" style={{ fontSize: '0.975rem', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
          {t('planYourTripDesc')}
        </p>
      </div>

      {preselectedDestination && (
        <div
          className="preselected-banner"
          style={{
            background: '#F0F9FC',
            border: '1px solid #BAE6FD',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#0798B5',
            fontSize: '0.9rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={16} strokeWidth={2.2} />
            <span>
              Planning around{' '}
              <strong style={{ color: '#172033' }}>
                {language === 'kn' && preselectedDestination.name_kn
                  ? preselectedDestination.name_kn
                  : preselectedDestination.name_en}
              </strong>
            </span>
          </div>
          {onClearPreselected && (
            <button
              type="button"
              className="btn-clear-preselected"
              onClick={onClearPreselected}
              aria-label="Clear preselected destination"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748B',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px',
              }}
            >
              <X size={16} strokeWidth={2.2} />
            </button>
          )}
        </div>
      )}

      {validationError && (
        <div
          className="form-error-banner"
          data-testid="planner-validation-error"
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#DC2626',
            borderRadius: '10px',
            padding: '12px 16px',
            fontSize: '0.875rem',
            marginBottom: '20px',
          }}
        >
          <AlertTriangle size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
          <span>{validationError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="planner-form" noValidate>
        {/* SECTION 1: Trip Basics & Route */}
        <div className="planner-card-section">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '22px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#F0F9FC', color: '#0798B5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
              <MapPin size={20} strokeWidth={2.2} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#172033', margin: 0, letterSpacing: '-0.01em' }}>
                {language === 'kn' ? 'ಪ್ರವಾಸದ ಮೂಲ ವಿವರಗಳು' : 'Trip Details & Route Starting Point'}
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '4px 0 0 0' }}>
                {language === 'kn'
                  ? 'ನಿಮ್ಮ ಪ್ರಯಾಣ ಆರಂಭಿಸುವ ಸ್ಥಳ, ಅವಧಿ, ಜನರ ಸಂಖ್ಯೆ ಮತ್ತು ವೇಗ'
                  : 'Specify origin location, travel duration, party size, and travel pace'}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {/* Origin Location */}
            <div className="form-field">
              <label htmlFor="planner-origin" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 600, color: '#172033', marginBottom: '8px' }}>
                <MapPin size={15} strokeWidth={2} color="#0798B5" />
                <span>{t('originLabel')} *</span>
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
                style={{
                  height: '46px',
                  borderRadius: '10px',
                  border: '1px solid #DCE5EF',
                  padding: '0 14px',
                  fontSize: '0.9375rem',
                  color: '#172033',
                  width: '100%',
                  boxSizing: 'border-box',
                  outline: 'none',
                  background: '#FFFFFF',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                }}
              />
            </div>

            {/* Trip Duration */}
            <div className="form-field">
              <label htmlFor="planner-duration-input" className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', fontWeight: 600, color: '#172033', marginBottom: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CalendarDays size={15} strokeWidth={2} color="#0798B5" />
                  <span>{t('durationLabel')} *</span>
                </span>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: isDurationValid ? '#0798B5' : '#EF4444', background: isDurationValid ? '#F0F9FC' : '#FEF2F2', padding: '2px 8px', borderRadius: '6px' }}>
                  {isDurationValid ? `${duration} ${language === 'kn' ? 'ದಿನಗಳು' : duration === 1 ? 'Day' : 'Days'}` : t('durationHelp')}
                </span>
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '46px',
                  border: `1px solid ${!isDurationValid && durationInput !== '' ? '#EF4444' : '#DCE5EF'}`,
                  borderRadius: '10px',
                  background: '#FFFFFF',
                  padding: '3px',
                  boxSizing: 'border-box',
                }}
              >
                <button
                  type="button"
                  aria-label="Decrease duration"
                  data-testid="decrease-duration-btn"
                  onClick={() => {
                    const next = Math.max(1, (parseInt(durationInput, 10) || 2) - 1);
                    setDurationInput(String(next));
                    setValidationError(null);
                  }}
                  style={{
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    color: '#172033',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                >
                  <Minus size={15} strokeWidth={2.2} />
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
                  style={{
                    flex: 1,
                    minWidth: 0,
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: '#172033',
                    outline: 'none',
                    padding: 0,
                  }}
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
                  style={{
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    color: '#172033',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                >
                  <Plus size={15} strokeWidth={2.2} />
                </button>
              </div>
              {!isDurationValid && durationInput !== '' && (
                <div id="planner-duration-hint" style={{ color: '#EF4444', fontSize: '0.78rem', marginTop: '5px' }} role="alert">
                  {t('durationError')}
                </div>
              )}
            </div>

            {/* Travelers Count */}
            <div className="form-field">
              <label htmlFor="planner-travelers-input" className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', fontWeight: 600, color: '#172033', marginBottom: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={15} strokeWidth={2} color="#0798B5" />
                  <span>{t('travelersLabel')} *</span>
                </span>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: isTravelersValid ? '#0798B5' : '#EF4444', background: isTravelersValid ? '#F0F9FC' : '#FEF2F2', padding: '2px 8px', borderRadius: '6px' }}>
                  {isTravelersValid ? `${travelers} ${language === 'kn' ? 'ಜನರು' : travelers === 1 ? 'Traveler' : 'Travelers'}` : t('travelersHelp')}
                </span>
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '46px',
                  border: `1px solid ${!isTravelersValid && travelersInput !== '' ? '#EF4444' : '#DCE5EF'}`,
                  borderRadius: '10px',
                  background: '#FFFFFF',
                  padding: '3px',
                  boxSizing: 'border-box',
                }}
              >
                <button
                  type="button"
                  aria-label="Decrease travelers"
                  data-testid="decrease-travelers-btn"
                  onClick={() => {
                    const next = Math.max(1, (parseInt(travelersInput, 10) || 2) - 1);
                    setTravelersInput(String(next));
                    setValidationError(null);
                  }}
                  style={{
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    color: '#172033',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                >
                  <Minus size={15} strokeWidth={2.2} />
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
                  style={{
                    flex: 1,
                    minWidth: 0,
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: '#172033',
                    outline: 'none',
                    padding: 0,
                  }}
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
                  style={{
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    color: '#172033',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                >
                  <Plus size={15} strokeWidth={2.2} />
                </button>
              </div>
              {!isTravelersValid && travelersInput !== '' && (
                <div id="planner-travelers-hint" style={{ color: '#EF4444', fontSize: '0.78rem', marginTop: '5px' }} role="alert">
                  {t('travelersError')}
                </div>
              )}
            </div>

            {/* Travel Pace */}
            <div className="form-field">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 600, color: '#172033', marginBottom: '8px' }}>
                <Clock size={15} strokeWidth={2} color="#0798B5" />
                <span>{t('paceLabel')}</span>
              </label>
              <div
                className="pace-options"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  height: '46px',
                }}
              >
                {[
                  { id: 'relaxed', label: t('paceRelaxed'), stops: '2 stops/day', icon: <Coffee size={15} strokeWidth={2} /> },
                  { id: 'balanced', label: t('paceBalanced'), stops: '3 stops/day', icon: <Scale size={15} strokeWidth={2} /> },
                  { id: 'packed', label: t('pacePacked'), stops: '4 stops/day', icon: <Zap size={15} strokeWidth={2} /> },
                ].map((item) => {
                  const isSelected = pace === item.id;
                  return (
                    <label
                      key={item.id}
                      className={`pace-card ${isSelected ? 'selected' : ''}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '0 8px',
                        borderRadius: '10px',
                        border: isSelected ? '1.5px solid #0798B5' : '1px solid #DCE5EF',
                        background: isSelected ? '#F0F9FC' : '#FFFFFF',
                        color: isSelected ? '#0798B5' : '#172033',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxSizing: 'border-box',
                      }}
                    >
                      <input
                        type="radio"
                        name="pace"
                        value={item.id}
                        checked={isSelected}
                        onChange={() => setPace(item.id as 'relaxed' | 'balanced' | 'packed')}
                        className="visually-hidden"
                      />
                      <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, color: isSelected ? '#0798B5' : '#64748B' }}>
                        {item.icon}
                      </span>
                      <span className="pace-title" style={{ fontSize: '0.8125rem', fontWeight: isSelected ? 700 : 500, whiteSpace: 'nowrap' }}>
                        {item.label}
                      </span>
                      {isSelected && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '2px' }}>
                          <Check size={13} strokeWidth={2.8} />
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Budget & Transportation */}
        <div className="planner-card-section" data-testid="planner-budget-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#F0F9FC', color: '#0798B5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                <Wallet size={20} strokeWidth={2.2} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#172033', margin: 0, letterSpacing: '-0.01em' }}>
                  {t('tripBudgetTitle')}
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '4px 0 0 0' }}>
                  {t('tripBudgetSubtitle')}
                </p>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem', color: '#0798B5', fontWeight: 600, background: '#F0F9FC', padding: '6px 12px', borderRadius: '8px', border: '1px solid #BAE6FD' }}>
              <input
                type="checkbox"
                checked={enableBudgetLimit}
                onChange={(e) => setEnableBudgetLimit(e.target.checked)}
                data-testid="enable-budget-limit-checkbox"
                style={{ width: '16px', height: '16px', accentColor: '#0798B5', cursor: 'pointer' }}
              />
              <span>{language === 'kn' ? 'ಗರಿಷ್ಠ ಬಜೆಟ್ ಮಿತಿ ನಿಗದಿಪಡಿಸಿ' : 'Set explicit spending limit'}</span>
            </label>
          </div>

          {/* Conditional Explicit Spending Limit Container */}
          {enableBudgetLimit && (
            <div style={{ background: '#F8FAFC', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div className="form-field">
                  <label htmlFor="planner-budget-amount" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#0798B5', marginBottom: '6px' }}>
                    <Wallet size={14} strokeWidth={2} />
                    <span>{t('budgetLimitLabel')}</span>
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '14px', color: '#64748B', fontWeight: 700, fontSize: '1.05rem', pointerEvents: 'none' }}>₹</span>
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
                      style={{
                        height: '46px',
                        paddingLeft: '32px',
                        fontWeight: 600,
                        fontSize: '1rem',
                        borderRadius: '10px',
                        border: '1px solid #DCE5EF',
                        width: '100%',
                        boxSizing: 'border-box',
                        color: '#172033',
                        background: '#FFFFFF',
                      }}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#172033', marginBottom: '10px', display: 'block' }}>
                    {language === 'kn' ? 'ಬಜೆಟ್ ವ್ಯಾಪ್ತಿ' : 'Budget Applies To'}
                  </label>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', height: '46px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: '#172033', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="budget_scope"
                        value="total_trip"
                        checked={budgetScope === 'total_trip'}
                        onChange={() => setBudgetScope('total_trip')}
                        data-testid="budget-scope-total"
                        style={{ accentColor: '#0798B5' }}
                      />
                      <span>{t('budgetScopeGroup')}</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: '#172033', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="budget_scope"
                        value="per_person"
                        checked={budgetScope === 'per_person'}
                        onChange={() => setBudgetScope('per_person')}
                        data-testid="budget-scope-person"
                        style={{ accentColor: '#0798B5' }}
                      />
                      <span>{t('budgetScopePerson')}</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Inclusions & Exclusions Card */}
              <div style={{ marginTop: '14px', padding: '12px 16px', background: '#FFFFFF', borderRadius: '8px', borderLeft: '3px solid #0798B5', border: '1px solid #E2E8F0', borderLeftColor: '#0798B5', fontSize: '0.8125rem' }}>
                <div style={{ fontWeight: 600, color: '#0798B5', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={14} strokeWidth={2.5} />
                  <span>{t('budgetIncludesTitle')}</span>
                </div>
                <div style={{ color: '#475569', lineHeight: 1.4 }}>{t('budgetIncludesList')}</div>
                <div style={{ marginTop: '6px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
                  <Info size={13} strokeWidth={2} />
                  <span>{t('budgetExcludesTitle')}</span>
                </div>
              </div>

              {/* Strict Budget Enforcement Toggle */}
              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #E2E8F0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#172033', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={strictBudget}
                    onChange={(e) => setStrictBudget(e.target.checked)}
                    data-testid="planner-strict-budget-checkbox"
                    style={{ width: '16px', height: '16px', accentColor: '#0798B5', cursor: 'pointer' }}
                  />
                  <span>
                    {language === 'kn'
                      ? 'ಕಟ್ಟುನಿಟ್ಟಾದ ಬಜೆಟ್ ನಿಯಂತ್ರಣ (ಅಧಿಕ ವೆಚ್ಚದ ತಾಣಗಳು ಮತ್ತು ಖಾಸಗಿ ವಾಹನಗಳನ್ನು ನಿರ್ಬಂಧಿಸಿ)'
                      : 'Enforce strict budget (actively prunes costly private cabs & commercial attractions)'}
                  </span>
                </label>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {/* Budget Profile */}
            <div className="form-field">
              <label htmlFor="planner-scenario" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 600, color: '#172033', marginBottom: '8px' }}>
                <Tags size={15} strokeWidth={2} color="#0798B5" />
                <span>{t('budgetScenarioLabel')}</span>
              </label>
              <div className="planner-select-wrapper">
                <select
                  id="planner-scenario"
                  value={budgetScenario}
                  onChange={(e) => setBudgetScenario(e.target.value as 'budget' | 'standard' | 'comfort')}
                  className="form-input"
                  data-testid="planner-budget-scenario"
                  style={{
                    height: '46px',
                    borderRadius: '10px',
                    border: '1px solid #DCE5EF',
                    padding: '0 40px 0 14px',
                    fontSize: '0.9375rem',
                    color: '#172033',
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#FFFFFF',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="budget">{t('scenarioBudget')}</option>
                  <option value="standard">{t('scenarioStandard')}</option>
                  <option value="comfort">{t('scenarioComfort')}</option>
                </select>
                <span className="select-chevron">
                  <ChevronDown size={16} strokeWidth={2.2} />
                </span>
              </div>
            </div>

            {/* Transport Mode */}
            <div className="form-field">
              <label htmlFor="planner-transport-mode" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 600, color: '#172033', marginBottom: '8px' }}>
                <Car size={15} strokeWidth={2} color="#0798B5" />
                <span>{t('travelModeLabel')}</span>
              </label>
              <div className="planner-select-wrapper">
                <select
                  id="planner-transport-mode"
                  value={travelMode}
                  onChange={(e) => setTravelMode(e.target.value as 'driving_car' | 'cab_taxi' | 'public_transit' | 'mixed')}
                  className="form-input"
                  data-testid="planner-travel-mode"
                  style={{
                    height: '46px',
                    borderRadius: '10px',
                    border: '1px solid #DCE5EF',
                    padding: '0 40px 0 14px',
                    fontSize: '0.9375rem',
                    color: '#172033',
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#FFFFFF',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="driving_car">{t('modeDrivingCar')}</option>
                  <option value="cab_taxi">{t('modeCabTaxi')}</option>
                  <option value="public_transit">{t('modePublicTransit')}</option>
                  <option value="mixed">{t('modeMixed')}</option>
                </select>
                <span className="select-chevron">
                  <ChevronDown size={16} strokeWidth={2.2} />
                </span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <label className="checkbox-label" htmlFor="planner-return-trip" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: '#172033', cursor: 'pointer' }}>
              <input
                id="planner-return-trip"
                type="checkbox"
                checked={isReturnTrip}
                onChange={(e) => setIsReturnTrip(e.target.checked)}
                data-testid="planner-return-trip-checkbox"
                style={{ width: '16px', height: '16px', accentColor: '#0798B5', cursor: 'pointer' }}
              />
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RotateCcw size={14} strokeWidth={2} color="#64748B" />
                <span>{t('returnTripLabel')}</span>
              </span>
            </label>
          </div>
        </div>

        {/* SECTION 3: Preferred Categories */}
        <div className="planner-card-section" data-testid="planner-categories-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#F0F9FC', color: '#0798B5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Tags size={20} strokeWidth={2.2} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#172033', margin: 0, letterSpacing: '-0.01em' }}>
                  {t('selectCategories')}
                </h3>
                <span style={{ fontSize: '0.78rem', background: '#F0F9FC', color: '#0798B5', padding: '3px 9px', borderRadius: '6px', fontWeight: 600, border: '1px solid #BAE6FD' }}>
                  {selectedCategories.length} {language === 'kn' ? 'ಆಯ್ಕೆಯಾಗಿದೆ' : 'selected'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleSelectAllCategories}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #DCE5EF',
                  color: '#475569',
                  borderRadius: '8px',
                  padding: '6px 13px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease',
                }}
                data-testid="categories-select-all"
              >
                <Check size={13} strokeWidth={2.5} />
                <span>{t('selectAll')}</span>
              </button>
              <button
                type="button"
                onClick={handleClearAllCategories}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #DCE5EF',
                  color: '#64748B',
                  borderRadius: '8px',
                  padding: '6px 13px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease',
                }}
                data-testid="categories-clear-all"
              >
                <X size={13} strokeWidth={2.5} />
                <span>{t('clearAll')}</span>
              </button>
            </div>
          </div>

          {/* Search Categories */}
          <div style={{ position: 'relative', marginBottom: '14px', display: 'flex', alignItems: 'center' }}>
            <Search size={15} strokeWidth={2} style={{ position: 'absolute', left: '13px', color: '#94A3B8', pointerEvents: 'none' }} />
            <input
              type="text"
              value={categorySearchQuery}
              onChange={(e) => setCategorySearchQuery(e.target.value)}
              placeholder={t('searchCategories')}
              className="form-input"
              data-testid="categories-search-input"
              style={{
                height: '42px',
                borderRadius: '8px',
                border: '1px solid #DCE5EF',
                paddingLeft: '36px',
                paddingRight: '12px',
                fontSize: '0.875rem',
                color: '#172033',
                width: '100%',
                boxSizing: 'border-box',
                outline: 'none',
                background: '#FFFFFF',
              }}
            />
          </div>

          {/* Category Chips Container - Natural flex-wrap without scrollbars */}
          <div className="chips-container" data-testid="categories-chips-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: isSelected ? 600 : 500,
                    cursor: 'pointer',
                    background: isSelected ? '#F0F9FC' : '#FFFFFF',
                    border: isSelected ? '1px solid #0798B5' : '1px solid #DCE5EF',
                    color: isSelected ? '#0798B5' : '#172033',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isSelected && <Check size={13} strokeWidth={2.8} />}
                  <span>{t(key)}</span>
                </button>
              );
            })}
          </div>

          {/* Thematic Category Discovery Helpers */}
          {!categorySearchQuery && (
            <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #F1F5F9' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                {language === 'kn' ? 'ವಿಷಯಾಧಾರಿತ ಗುಂಪುಗಳು' : 'Thematic Groups:'}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {categoryThemes.map((theme) => {
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
                        background: allThemeSelected ? '#F0F9FC' : '#F8FAFC',
                        border: allThemeSelected ? '1px solid #0798B5' : '1px solid #DCE5EF',
                        borderRadius: '8px',
                        padding: '6px 13px',
                        fontSize: '0.78rem',
                        fontWeight: 500,
                        color: allThemeSelected ? '#0798B5' : '#475569',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>{theme.icon}</span>
                      <span>{language === 'kn' ? theme.labelKn : theme.labelEn}</span>
                      <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>+{theme.categories.length}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 4: Preferred Districts */}
        <div className="planner-card-section" data-testid="planner-districts-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#F0F9FC', color: '#0798B5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Landmark size={20} strokeWidth={2.2} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#172033', margin: 0, letterSpacing: '-0.01em' }}>
                  {t('selectDistricts')}
                </h3>
                <span style={{ fontSize: '0.78rem', background: '#F0F9FC', color: '#0798B5', padding: '3px 9px', borderRadius: '6px', fontWeight: 600, border: '1px solid #BAE6FD' }}>
                  {selectedDistricts.length}/31 {language === 'kn' ? 'ಆಯ್ಕೆಯಾಗಿದೆ' : 'selected'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleSelectAllDistricts}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #DCE5EF',
                  color: '#475569',
                  borderRadius: '8px',
                  padding: '6px 13px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease',
                }}
                data-testid="districts-select-all"
              >
                <Check size={13} strokeWidth={2.5} />
                <span>{t('selectAll')} (31)</span>
              </button>
              <button
                type="button"
                onClick={handleClearAllDistricts}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #DCE5EF',
                  color: '#64748B',
                  borderRadius: '8px',
                  padding: '6px 13px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease',
                }}
                data-testid="districts-clear-all"
              >
                <X size={13} strokeWidth={2.5} />
                <span>{t('clearAll')}</span>
              </button>
            </div>
          </div>

          {/* Search Districts */}
          <div style={{ position: 'relative', marginBottom: '14px', display: 'flex', alignItems: 'center' }}>
            <Search size={15} strokeWidth={2} style={{ position: 'absolute', left: '13px', color: '#94A3B8', pointerEvents: 'none' }} />
            <input
              type="text"
              value={districtSearchQuery}
              onChange={(e) => setDistrictSearchQuery(e.target.value)}
              placeholder={t('searchDistricts')}
              className="form-input"
              data-testid="districts-search-input"
              style={{
                height: '42px',
                borderRadius: '8px',
                border: '1px solid #DCE5EF',
                paddingLeft: '36px',
                paddingRight: '12px',
                fontSize: '0.875rem',
                color: '#172033',
                width: '100%',
                boxSizing: 'border-box',
                outline: 'none',
                background: '#FFFFFF',
              }}
            />
          </div>

          {/* District Chips Container */}
          <div
            className="chips-container"
            data-testid="districts-chips-container"
            style={{ maxHeight: '180px', overflowY: 'auto', paddingRight: '4px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}
          >
            {filteredDistricts.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: '#64748B', padding: '8px' }}>
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
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: isSelected ? 600 : 500,
                      cursor: 'pointer',
                      background: isSelected ? '#F0F9FC' : '#FFFFFF',
                      border: isSelected ? '1px solid #0798B5' : '1px solid #DCE5EF',
                      color: isSelected ? '#0798B5' : '#172033',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isSelected && <Check size={13} strokeWidth={2.8} />}
                    <span>{language === 'kn' ? d.name_kn : d.name_en}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* SECTION 5: Travel Preferences & Discovery */}
        <div className="planner-card-section">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '22px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#F0F9FC', color: '#0798B5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
              <Sparkles size={20} strokeWidth={2.2} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#172033', margin: 0, letterSpacing: '-0.01em' }}>
                {language === 'kn' ? 'ಪ್ರಯಾಣ ಮತ್ತು ಸ್ಥಳೀಯ ಆದ್ಯತೆಗಳು' : 'Travel, Dining & Local Preferences'}
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '4px 0 0 0' }}>
                {language === 'kn'
                  ? 'ಆಹಾರ ಪದ್ಧತಿ, ವಸತಿ ಮಾದರಿ ಮತ್ತು ಆಫ್‌ಬೀಟ್ ತಾಣಗಳ ಆಯ್ಕೆ'
                  : 'Tailor regional cuisine, authentic lodging types, and offbeat discovery focus'}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            {/* Dietary Preference */}
            <div className="form-field">
              <label htmlFor="planner-diet" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 600, color: '#172033', marginBottom: '8px' }}>
                <Coffee size={15} strokeWidth={2} color="#0798B5" />
                <span>{language === 'kn' ? 'ಆಹಾರ ಶೈಲಿ ಮತ್ತು ಆದ್ಯತೆ' : 'Dietary Preference'}</span>
              </label>
              <div className="planner-select-wrapper">
                <select
                  id="planner-diet"
                  value={dietaryPreference}
                  onChange={(e) => setDietaryPreference(e.target.value)}
                  data-testid="planner-dietary-preference"
                  style={{
                    height: '46px',
                    borderRadius: '10px',
                    border: '1px solid #DCE5EF',
                    padding: '0 40px 0 14px',
                    fontSize: '0.9375rem',
                    color: '#172033',
                    width: '100%',
                    background: '#FFFFFF',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">{language === 'kn' ? 'ಎಲ್ಲಾ ಕರ್ನಾಟಕ ಪ್ರಾದೇಶಿಕ ತಿನಿಸುಗಳು' : 'All Regional Cuisines'}</option>
                  <option value="veg">{language === 'kn' ? 'ಶುದ್ಧ ಸಸ್ಯಾಹಾರಿ (Pure Veg - Darshini / Khanavali)' : 'Pure Vegetarian (Darshini / Khanavali)'}</option>
                  <option value="vegan">{language === 'kn' ? 'ಸಂಪೂರ್ಣ ಸಸ್ಯಾಹಾರಿ (Vegan)' : 'Vegan Friendly'}</option>
                  <option value="jain">{language === 'kn' ? 'ಜೈನ ಆಹಾರ (No Onion/Garlic)' : 'Jain Friendly'}</option>
                  <option value="non_veg">{language === 'kn' ? 'ಮಾಂಸಾಹಾರಿ (Military Hotel / Coastal)' : 'Non-Vegetarian (Military Hotel / Coastal)'}</option>
                  <option value="no_seafood">{language === 'kn' ? 'ಸಮುದ್ರಾಹಾರ ಹೊರತುಪಡಿಸಿ' : 'No Seafood'}</option>
                </select>
                <span className="select-chevron">
                  <ChevronDown size={16} strokeWidth={2.2} />
                </span>
              </div>
            </div>

            {/* Accommodation Type Preference */}
            <div className="form-field">
              <label htmlFor="planner-acc-type" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 600, color: '#172033', marginBottom: '8px' }}>
                <Landmark size={15} strokeWidth={2} color="#0798B5" />
                <span>{language === 'kn' ? 'ವಸತಿ ಮಾದರಿ ಆದ್ಯತೆ' : 'Accommodation Preference'}</span>
              </label>
              <div className="planner-select-wrapper">
                <select
                  id="planner-acc-type"
                  value={accommodationType}
                  onChange={(e) => setAccommodationType(e.target.value)}
                  data-testid="planner-accommodation-preference"
                  style={{
                    height: '46px',
                    borderRadius: '10px',
                    border: '1px solid #DCE5EF',
                    padding: '0 40px 0 14px',
                    fontSize: '0.9375rem',
                    color: '#172033',
                    width: '100%',
                    background: '#FFFFFF',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="any">{language === 'kn' ? 'ಯಾವುದೇ ಆದ್ಯತೆ ಇಲ್ಲ (No Preference)' : 'No Preference'}</option>
                  <option value="homestay">{language === 'kn' ? 'ಸ್ಥಳೀಯ ಹೋಂಸ್ಟೇ (Verified Homestay)' : 'Verified Homestay'}</option>
                  <option value="hotel">{language === 'kn' ? 'ಬಜೆಟ್ ಹೋಟೆಲ್ / ಕೆಎಸ್‌ಟಿಡಿಸಿ (Budget Hotel / KSTDC)' : 'Budget Hotel / KSTDC'}</option>
                  <option value="heritage">{language === 'kn' ? 'ಐತಿಹಾಸಿಕ ಹೆರಿಟೇಜ್ ನಿವಾಸ (Heritage Property)' : 'Heritage Property'}</option>
                  <option value="resort">{language === 'kn' ? 'ರೆಸಾರ್ಟ್ / ಜಂಗಲ್ ಲಾಡ್ಜಸ್ (Resort / Jungle Lodge)' : 'Resort / Jungle Lodge'}</option>
                </select>
                <span className="select-chevron">
                  <ChevronDown size={16} strokeWidth={2.2} />
                </span>
              </div>
            </div>
          </div>

          {/* Offbeat Discovery Highlight Card */}
          <div
            style={{
              padding: '16px 18px',
              borderRadius: '12px',
              border: isOffbeatPreferred ? '1.5px solid #F59E0B' : '1px solid #E2E8F0',
              background: isOffbeatPreferred ? '#FFFBEB' : '#F8FAFC',
              marginBottom: '20px',
              transition: 'all 0.15s ease',
            }}
          >
            <label htmlFor="planner-offbeat" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
              <input
                id="planner-offbeat"
                type="checkbox"
                checked={isOffbeatPreferred}
                onChange={(e) => setIsOffbeatPreferred(e.target.checked)}
                data-testid="planner-offbeat-checkbox"
                style={{ width: '18px', height: '18px', accentColor: '#D97706', marginTop: '3px', cursor: 'pointer', flexShrink: 0 }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.925rem', color: '#172033' }}>
                  <Star size={16} strokeWidth={2.2} color="#D97706" fill={isOffbeatPreferred ? '#D97706' : 'none'} />
                  <span>{t('prioritizeOffbeat')}</span>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.825rem', color: '#64748B', lineHeight: 1.45 }}>
                  {language === 'kn'
                    ? 'ಜನನಿಬಿಡ ತಾಣಗಳ ಬದಲಿಗೆ ನಿಸರ್ಗದ ಮಡಿಲಿನ ಶಾಂತ ಸ್ಥಳಗಳು, ಹಳ್ಳಿಯ ದೇವಾಲಯಗಳು ಮತ್ತು ಕಡಿಮೆ ಜನಸಂದಣಿಯ ತಾಣಗಳಿಗೆ ಆದ್ಯತೆ ನೀಡಿ.'
                    : 'Discover secluded heritage ruins, serene village lakes, and tranquil trails outside typical tourist crowds.'}
                </p>
              </div>
            </label>
          </div>

          {/* Additional Notes */}
          <div className="form-field">
            <label htmlFor="planner-notes" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 600, color: '#172033', marginBottom: '8px' }}>
              <FileText size={15} strokeWidth={2} color="#0798B5" />
              <span>{t('notesLabel')}</span>
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
              style={{
                borderRadius: '10px',
                border: '1px solid #DCE5EF',
                padding: '12px 14px',
                fontSize: '0.9rem',
                color: '#172033',
                width: '100%',
                boxSizing: 'border-box',
                resize: 'vertical',
                outline: 'none',
                background: '#FFFFFF',
              }}
            />
          </div>
        </div>

        {/* SECTION 6: Dynamic Trip Summary Strip & Primary Action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Dynamic Trip Summary Strip */}
          <div
            className="trip-summary-strip"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px 16px',
              alignItems: 'center',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '14px 20px',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
              fontSize: '0.85rem',
              color: '#475569',
            }}
          >
            <span style={{ fontWeight: 600, color: '#172033', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <MapPin size={14} color="#0798B5" />
              {origin || 'Bengaluru'}
            </span>
            <span style={{ color: '#CBD5E1' }}>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <CalendarDays size={14} color="#0798B5" />
              {isDurationValid ? `${duration} ${duration === 1 ? 'Day' : 'Days'}` : '—'}
            </span>
            <span style={{ color: '#CBD5E1' }}>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Users size={14} color="#0798B5" />
              {isTravelersValid ? `${travelers} ${travelers === 1 ? 'Traveler' : 'Travelers'}` : '—'}
            </span>
            <span style={{ color: '#CBD5E1' }}>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Clock size={14} color="#0798B5" />
              {pace.charAt(0).toUpperCase() + pace.slice(1)} pace
            </span>
            <span style={{ color: '#CBD5E1' }}>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Wallet size={14} color="#0798B5" />
              {enableBudgetLimit
                ? `₹${parseFloat(budgetLimitInput || '0').toLocaleString('en-IN')} (${budgetScope === 'total_trip' ? 'Total' : 'Per Person'})`
                : `${budgetScenario.charAt(0).toUpperCase() + budgetScenario.slice(1)} Tier`}
            </span>
            <span style={{ color: '#CBD5E1' }}>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Car size={14} color="#0798B5" />
              {travelMode.replace('_', ' ')}
            </span>
            <span style={{ color: '#CBD5E1' }}>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Tags size={14} color="#0798B5" />
              {selectedCategories.length} categories
            </span>
            <span style={{ color: '#CBD5E1' }}>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Landmark size={14} color="#0798B5" />
              {selectedDistricts.length > 0 ? `${selectedDistricts.length} districts` : 'All Karnataka'}
            </span>
            {isOffbeatPreferred && (
              <>
                <span style={{ color: '#CBD5E1' }}>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#D97706', fontWeight: 600 }}>
                  <Star size={13} fill="#D97706" color="#D97706" />
                  Offbeat
                </span>
              </>
            )}
          </div>

          {/* Primary Action Button */}
          <button
            type="submit"
            className="btn-submit-plan"
            disabled={isSubmitting || !isDurationValid || !isTravelersValid}
            data-testid="submit-plan-button"
            style={{
              width: '100%',
              height: '52px',
              fontSize: '1.05rem',
              fontWeight: 700,
              background: isSubmitting || !isDurationValid || !isTravelersValid ? '#94A3B8' : '#0798B5',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              cursor: isSubmitting || !isDurationValid || !isTravelersValid ? 'not-allowed' : 'pointer',
              opacity: isSubmitting || !isDurationValid || !isTravelersValid ? 0.7 : 1,
              transition: 'all 0.2s ease',
              boxShadow: isSubmitting || !isDurationValid || !isTravelersValid ? 'none' : '0 4px 14px rgba(7, 152, 181, 0.3)',
            }}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-sm" aria-hidden="true" />
                <span>{t('generatingButton')}</span>
              </>
            ) : (
              <>
                <Sparkles size={18} strokeWidth={2.2} />
                <span>{t('generateButton')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
};
