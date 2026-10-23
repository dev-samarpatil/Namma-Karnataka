import React, { useState } from 'react';
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
];

export const TripPlannerForm: React.FC<TripPlannerFormProps> = ({
  language,
  onSubmit,
  isSubmitting,
  preselectedDestination,
  onClearPreselected,
}) => {
  const { t } = useTranslation(language);

  const [origin, setOrigin] = useState<string>('Bengaluru');
  const [duration, setDuration] = useState<number>(2);
  const [pace, setPace] = useState<'relaxed' | 'balanced' | 'packed'>('balanced');
  const [selectedCategories, setSelectedCategories] = useState<DestinationCategory[]>(
    preselectedDestination ? [preselectedDestination.category] : ['heritage', 'nature']
  );
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>(
    preselectedDestination ? [preselectedDestination.district_code] : []
  );
  const [isOffbeatPreferred, setIsOffbeatPreferred] = useState<boolean>(
    Boolean(preselectedDestination?.is_offbeat)
  );
  const [notes, setNotes] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const toggleCategory = (cat: DestinationCategory) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      if (selectedCategories.length >= 5) {
        setValidationError('Maximum 5 categories can be selected.');
        return;
      }
      setValidationError(null);
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const toggleDistrict = (districtCode: string) => {
    if (selectedDistricts.includes(districtCode)) {
      setSelectedDistricts(selectedDistricts.filter((d) => d !== districtCode));
    } else {
      if (selectedDistricts.length >= 5) {
        setValidationError('Maximum 5 districts can be selected.');
        return;
      }
      setValidationError(null);
      setSelectedDistricts([...selectedDistricts, districtCode]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!origin.trim()) {
      setValidationError('Please specify a starting location.');
      return;
    }

    if (duration < 1 || duration > 7) {
      setValidationError('Trip duration must be between 1 and 7 days.');
      return;
    }

    const payload: PlanningRequest = {
      language,
      origin_label: origin.trim(),
      duration_days: duration,
      preferred_districts: selectedDistricts.length > 0 ? selectedDistricts : undefined,
      categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      pace,
      is_offbeat_preferred: isOffbeatPreferred,
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
            >
              ✕ Clear
            </button>
          )}
        </div>
      )}

      {validationError && (
        <div className="form-error-alert" role="alert" data-testid="planner-validation-error">
          ⚠️ {validationError}
        </div>
      )}

      <form className="planner-form" onSubmit={handleSubmit} noValidate data-testid="trip-planner-form">
        {/* Origin & Duration */}
        <div className="form-row two-col">
          <div className="form-field">
            <label htmlFor="planner-origin" className="form-label">
              📍 {t('originLabel')} <span className="required">*</span>
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
            <label htmlFor="planner-duration" className="form-label">
              📅 {t('durationLabel')}: <strong>{duration} {language === 'kn' ? 'ದಿನಗಳು' : 'days'}</strong>
            </label>
            <div className="duration-selector">
              {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                <button
                  key={num}
                  type="button"
                  className={`btn-duration ${duration === num ? 'active' : ''}`}
                  onClick={() => setDuration(num)}
                  data-testid={`duration-btn-${num}`}
                >
                  {num}d
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pace */}
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

        {/* Categories */}
        <div className="form-field">
          <label className="form-label">
            🏷️ {t('selectCategories')} ({selectedCategories.length}/5)
          </label>
          <div className="chips-container">
            {CATEGORY_OPTIONS.map((cat) => {
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
        </div>

        {/* Districts */}
        <div className="form-field">
          <label className="form-label">
            🏛️ {t('selectDistricts')} ({selectedDistricts.length}/5)
          </label>
          <div className="chips-container">
            {KARNATAKA_DISTRICTS.map((d) => {
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
            })}
          </div>
        </div>

        {/* Offbeat */}
        <div className="form-field checkbox-field">
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

        {/* Notes */}
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

        {/* Submit */}
        <div className="form-actions">
          <button
            type="submit"
            className="btn-submit-plan"
            disabled={isSubmitting}
            data-testid="submit-plan-button"
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
