# TRIP PLANNER INPUT REFINEMENT REPORT

**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Date:** October 26, 2026  
**Scope:** Trip Duration & Travelers Count Input Consolidation  

---

## 1. Previous Redundancy & Usability Problem

In previous versions of the Trip Planner (`TripPlannerForm.tsx`), users encountered two duplicate input mechanisms for both settings:
1. **Trip Duration:** A direct numeric input with minus and plus controls (`[-] [2] [+]`), followed immediately by a row of quick preset cards (`1d`, `2d`, `3d`, `4d`, `5d`, `7d`).
2. **Travelers Count:** A direct numeric input with minus and plus controls (`[-] [2] [+]`), followed immediately by a row of quick preset cards (`1p`, `2p`, `4p`, `6p`, `8p`, `12p`).

This duplication introduced several usability issues:
- Visual clutter and vertical form expansion.
- Ambiguity regarding which control had precedence.
- Arbitrary limitation of user choices (e.g., users planning 5 travelers or a 6-day trip had to mix-and-match controls).
- Redundant DOM elements increasing bundle and test maintenance overhead.

---

## 2. Implemented Single-Input Design

The redundant preset-card rows (`.duration-selector`) were completely removed from `frontend/src/features/planner/TripPlannerForm.tsx`.

Each setting is now governed by a single, high-contrast, accessible numeric stepper input:

### 2.1 Trip Duration (Days)
```tsx
<div className="form-group">
  <label htmlFor="duration-input" className="form-label">
    {t('tripDurationDays')}
  </label>
  <div className="stepper-input-container">
    <button
      type="button"
      className="btn-stepper"
      onClick={handleDecrementDuration}
      disabled={formData.duration_days <= 1}
      aria-label={t('decreaseDuration') || 'Decrease duration'}
      data-testid="decrease-duration-btn"
    >
      −
    </button>
    <input
      id="duration-input"
      type="number"
      min={1}
      max={7}
      value={formData.duration_days}
      onChange={handleDurationChange}
      className="form-input stepper-number-input"
      data-testid="planner-duration-input"
    />
    <button
      type="button"
      className="btn-stepper"
      onClick={handleIncrementDuration}
      disabled={formData.duration_days >= 7}
      aria-label={t('increaseDuration') || 'Increase duration'}
      data-testid="increase-duration-btn"
    >
      +
    </button>
  </div>
</div>
```

### 2.2 Travelers Count
```tsx
<div className="form-group">
  <label htmlFor="travelers-input" className="form-label">
    {t('numTravelers')}
  </label>
  <div className="stepper-input-container">
    <button
      type="button"
      className="btn-stepper"
      onClick={handleDecrementTravelers}
      disabled={formData.num_travelers <= 1}
      aria-label={t('decreaseTravelers') || 'Decrease travelers'}
      data-testid="decrease-travelers-btn"
    >
      −
    </button>
    <input
      id="travelers-input"
      type="number"
      min={1}
      max={20}
      value={formData.num_travelers}
      onChange={handleTravelersChange}
      className="form-input stepper-number-input"
      data-testid="planner-travelers-input"
    />
    <button
      type="button"
      className="btn-stepper"
      onClick={handleIncrementTravelers}
      disabled={formData.num_travelers >= 20}
      aria-label={t('increaseTravelers') || 'Increase travelers'}
      data-testid="increase-travelers-btn"
    >
      +
    </button>
  </div>
</div>
```

---

## 3. Validation and State Synchronization Rules

1. **Range Bounds:**
   - **Trip Duration:** 1 to 7 days (matching backend routing and lodging heuristics).
   - **Travelers Count:** 1 to 20 travelers (supporting solo travelers up to group tours).
2. **Direct Typing Handling:**
   - Empty input string during typing defaults safely without producing `NaN`.
   - Out-of-bound entries trigger localized inline validation messages in English and Kannada.
3. **Stepper Controls:**
   - Decrement button is disabled when at minimum bound (1).
   - Increment button is disabled when at maximum bound (7 for days, 20 for travelers).
4. **Synchronization Across Operations:**
   - Plan submission transmits exact numeric values to `/api/v1/planning/plan`.
   - Editing an itinerary recalculates per-person costs based on the updated traveler count.
   - Saved trips reload with exact preserved counts.

---

## 4. Verification & Testing

| Verification Check | Method | Result |
| :--- | :--- | :--- |
| Redundant Presets Removed | DOM assertion (`.duration-selector`, `button:has-text("1d")`) | 0 elements found |
| Direct Numeric Typing | Playwright + Vitest (`fill("4")`, `fill("6")`) | Value updates directly in input & state |
| Stepper Buttons Increment/Decrement | Playwright + Vitest (click `+`, click `-`) | Value increments & decrements correctly |
| Bounds Enforcement | Unit Tests | Values clamped between 1-7 (days) and 1-20 (people) |
| Backend API Consistency | Playwright E2E Plan Submission | Itinerary generated with exact 5-day duration |
| Bilingual Display | English & Kannada UI | Labels, ARIA labels, and error messages translated |
