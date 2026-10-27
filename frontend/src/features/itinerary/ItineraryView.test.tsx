import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ItineraryView } from './ItineraryView';
import { PlanningRecommendationResponse, RecommendedDestination, DayPlan, CompleteBudgetBreakdown } from '../../types';

const MOCK_DESTINATION: RecommendedDestination = {
  id: 'dest-001',
  slug: 'mysore-palace',
  name: 'Mysuru Palace',
  summary: 'Iconic royal residence',
  category: 'architecture',
  district_code: 'KA-MYS',
  district_name: 'Mysuru',
  coordinates: { lat: 12.3051, lon: 76.6551 },
  day_number: 1,
  order: 1,
  rationale: 'Grand heritage monument',
  entry_fee_min_inr: 100,
  entry_fee_max_inr: 100,
  currency_code: 'INR',
  access_status: 'open_reported',
  is_offbeat: false,
};

const MOCK_DAY_PLAN: DayPlan = {
  day_number: 1,
  date: '2026-11-01',
  theme: 'Mysuru Royal Heritage Circuit',
  total_duration_minutes: 360,
  transit_minutes: 45,
  meals_covered: ['Breakfast', 'Lunch', 'Dinner'],
  daily_cost_min_inr: 1200,
  daily_cost_max_inr: 1800,
  warnings: [],
  stops: [
    {
      stop_id: 'stop-d1-breakfast',
      stop_type: 'meal',
      name: 'Traditional Breakfast',
      description: 'South Indian tiffin at verified eatery',
      start_time: '08:30',
      end_time: '09:15',
      duration_minutes: 45,
      cost_min_inr: 100,
      cost_max_inr: 150,
      currency: 'INR',
      cost_status: 'estimated',
      rationale: 'Morning fuel',
    },
    {
      stop_id: 'stop-d1-attraction-1',
      destination_id: 'dest-001',
      stop_type: 'attraction',
      name: 'Mysuru Palace',
      description: 'Iconic royal residence',
      start_time: '09:30',
      end_time: '11:30',
      duration_minutes: 120,
      cost_min_inr: 100,
      cost_max_inr: 100,
      currency: 'INR',
      cost_status: 'verified',
      rationale: 'Grand heritage monument',
    },
    {
      stop_id: 'stop-d1-stay',
      stop_type: 'accommodation',
      name: 'Overnight Stay (Mysuru)',
      description: 'Standard hotel lodging in Mysuru',
      start_time: '21:30',
      end_time: '23:00',
      duration_minutes: 90,
      cost_min_inr: 1800,
      cost_max_inr: 3000,
      currency: 'INR',
      cost_status: 'estimated',
      rationale: 'Overnight recharge',
    },
  ],
};

const MOCK_BUDGET: CompleteBudgetBreakdown = {
  grand_total_min_inr: 3200,
  grand_total_max_inr: 4500,
  per_person_min_inr: 1600,
  per_person_max_inr: 2250,
  currency: 'INR',
  traveler_count: 2,
  has_unknown_costs: false,
  warnings: [],
  categories: [
    {
      category_name: 'Attraction Entry Fees',
      estimated_min_inr: 200,
      estimated_max_inr: 200,
      cost_status: 'verified',
      calculation_basis: '1 attraction × 2 travelers',
    },
    {
      category_name: 'Meals & Dining',
      estimated_min_inr: 800,
      estimated_max_inr: 1200,
      cost_status: 'estimated',
      calculation_basis: '3 meals for 2 travelers',
    },
  ],
};

const MOCK_PLAN: PlanningRecommendationResponse = {
  request_id: 'req-test-123',
  language: 'en',
  generation_mode: 'fallback',
  provider_used: 'deterministic_fallback',
  items: [MOCK_DESTINATION],
  total_destinations: 1,
  duration_days: 1,
  days: [MOCK_DAY_PLAN],
  budget_breakdown: MOCK_BUDGET,
  assumptions: ['Sightseeing assumes 09:00 departure'],
  data_limitations: ['Straight-line transit estimates'],
  warnings: [],
};

describe('ItineraryView rich travel planner features', () => {
  it('renders rich daily schedule with meals, attractions, and accommodations', () => {
    const handleReplan = vi.fn();
    const handleSave = vi.fn();

    render(
      <ItineraryView
        plan={MOCK_PLAN}
        language="en"
        onReplan={handleReplan}
        onSaveTrip={handleSave}
      />
    );

    // Verify day theme and meals badge
    expect(screen.getByText('Mysuru Royal Heritage Circuit')).toBeInTheDocument();
    expect(screen.getByText(/Breakfast · Lunch · Dinner/i)).toBeInTheDocument();

    // Verify meal stop card rendered
    expect(screen.getByText('Traditional Breakfast')).toBeInTheDocument();
    expect(screen.getByText(/08:30 – 09:15/i)).toBeInTheDocument();

    // Verify accommodation stop card rendered
    expect(screen.getByText('Overnight Stay (Mysuru)')).toBeInTheDocument();
    expect(screen.getByText(/21:30 Check-in/i)).toBeInTheDocument();

    // Verify categorized budget cards render and redundant itemized table is absent (Workstream 5)
    const costHeadings = screen.getAllByText('Itemized Cost Estimates');
    expect(costHeadings).toHaveLength(1);
    expect(costHeadings[0]).toBeInTheDocument();
    expect(screen.getByText(/Attraction Tickets/i)).toBeInTheDocument();
    expect(screen.getByText(/Food & Dining/i)).toBeInTheDocument();
    expect(screen.getByText(/Transportation/i)).toBeInTheDocument();
    expect(screen.queryByTestId('itemized-breakdown-table')).not.toBeInTheDocument();
    expect(screen.queryByText(/Itemized Category Breakdown Table/i)).not.toBeInTheDocument();

    // Verify assumptions rendered
    expect(screen.getByText(/Planning Assumptions/i)).toBeInTheDocument();
    expect(screen.getByText(/Sightseeing assumes 09:00 departure/i)).toBeInTheDocument();

    // Test save trip button callback
    const saveBtn = screen.getByTestId('save-trip-btn');
    fireEvent.click(saveBtn);
    expect(handleSave).toHaveBeenCalledWith(MOCK_PLAN);
  });

  it('opens edit modal, edits duration and notes, toggles lock, and calls recalculate', async () => {
    const handleUpdate = vi.fn();
    const updatedPlan: PlanningRecommendationResponse = {
      ...MOCK_PLAN,
      days: [
        {
          ...MOCK_DAY_PLAN,
          stops: MOCK_DAY_PLAN.stops.map((s) =>
            s.stop_id === 'stop-d1-attraction-1'
              ? { ...s, duration_minutes: 150, notes: 'Pre-booked palace guide', locked: true, user_modified: true }
              : s
          ),
        },
      ],
    };

    const api = await import('../../lib/api');
    const recalcSpy = vi.spyOn(api, 'recalculateItinerary').mockResolvedValue(updatedPlan);

    render(
      <ItineraryView
        plan={MOCK_PLAN}
        language="en"
        onReplan={vi.fn()}
        onSaveTrip={vi.fn()}
        onUpdatePlan={handleUpdate}
      />
    );

    // Open edit modal
    const editBtn = screen.getByTestId('edit-stop-stop-d1-attraction-1');
    fireEvent.click(editBtn);

    // Verify modal elements
    expect(screen.getByRole('heading', { name: /Edit Stop Details/i })).toBeInTheDocument();
    const durationInput = screen.getByTestId('edit-duration-input');
    const notesInput = screen.getByTestId('edit-notes-input');
    const lockCheckbox = screen.getByTestId('edit-lock-checkbox');

    // Update fields
    fireEvent.change(durationInput, { target: { value: '150' } });
    fireEvent.change(notesInput, { target: { value: 'Pre-booked palace guide' } });
    fireEvent.click(lockCheckbox);

    // Save changes
    const saveChangesBtn = screen.getByTestId('save-stop-edit-btn');
    await fireEvent.click(saveChangesBtn);

    expect(recalcSpy).toHaveBeenCalled();
    expect(handleUpdate).toHaveBeenCalledWith(updatedPlan);
  });

  it('opens alternative candidates modal, displays grounded suggestions, and replaces stop', async () => {
    const handleUpdate = vi.fn();
    const api = await import('../../lib/api');

    const mockCandidates = [
      {
        destination_id: 'dest-003',
        slug: 'jaganmohan-palace',
        name: 'Jaganmohan Palace Art Gallery',
        category: 'heritage' as const,
        district_code: 'KA-MYS',
        district_name: 'Mysuru',
        estimated_visit_minutes: 90,
        entry_fee_min_inr: 50,
        entry_fee_max_inr: 50,
        currency_code: 'INR',
        fee_difference_inr: -50,
        transit_delta_minutes: 10,
        cost_status: 'verified' as const,
        rationale: 'Art gallery and royal residence',
        access_status: 'open_reported',
        is_offbeat: true,
      },
    ];

    const altSpy = vi.spyOn(api, 'getStopAlternatives').mockResolvedValue({
      original_stop_id: 'stop-d1-attraction-1',
      day_number: 1,
      candidates: mockCandidates,
    });

    const replacedPlan: PlanningRecommendationResponse = {
      ...MOCK_PLAN,
      days: [
        {
          ...MOCK_DAY_PLAN,
          stops: [
            MOCK_DAY_PLAN.stops[0],
            {
              stop_id: 'stop-d1-jaganmohan-palace',
              destination_id: 'dest-003',
              stop_type: 'attraction',
              name: 'Jaganmohan Palace Art Gallery',
              description: 'Art gallery and royal residence',
              start_time: '09:30',
              end_time: '11:00',
              duration_minutes: 90,
              cost_min_inr: 50,
              cost_max_inr: 50,
              currency: 'INR',
              cost_status: 'verified',
              user_modified: true,
            },
            MOCK_DAY_PLAN.stops[2],
          ],
        },
      ],
    };

    const recalcSpy = vi.spyOn(api, 'recalculateItinerary').mockResolvedValue(replacedPlan);

    render(
      <ItineraryView
        plan={MOCK_PLAN}
        language="en"
        onReplan={vi.fn()}
        onSaveTrip={vi.fn()}
        onUpdatePlan={handleUpdate}
      />
    );

    // Click regenerate stop
    const regenBtn = screen.getByTestId('regen-stop-stop-d1-attraction-1');
    fireEvent.click(regenBtn);

    expect(altSpy).toHaveBeenCalled();

    // Verify alternative card in modal
    const candidateName = await screen.findByText('Jaganmohan Palace Art Gallery');
    expect(candidateName).toBeInTheDocument();
    expect(screen.getByText(/\+10m detour/i)).toBeInTheDocument();

    // Click choose alternative
    const selectBtn = screen.getByTestId('select-cand-jaganmohan-palace');
    await fireEvent.click(selectBtn);

    expect(recalcSpy).toHaveBeenCalled();
    expect(handleUpdate).toHaveBeenCalledWith(replacedPlan);
  });

  it('prompts confirmation when removing a stop and recalculates on confirm', async () => {
    const handleUpdate = vi.fn();
    const api = await import('../../lib/api');

    const reducedPlan: PlanningRecommendationResponse = {
      ...MOCK_PLAN,
      days: [
        {
          ...MOCK_DAY_PLAN,
          stops: [MOCK_DAY_PLAN.stops[0], MOCK_DAY_PLAN.stops[2]],
        },
      ],
    };

    const recalcSpy = vi.spyOn(api, 'recalculateItinerary').mockResolvedValue(reducedPlan);

    render(
      <ItineraryView
        plan={MOCK_PLAN}
        language="en"
        onReplan={vi.fn()}
        onSaveTrip={vi.fn()}
        onUpdatePlan={handleUpdate}
      />
    );

    // Click remove stop button
    const removeBtn = screen.getByTestId('remove-stop-stop-d1-attraction-1');
    fireEvent.click(removeBtn);

    // Verify confirmation modal
    expect(screen.getByRole('heading', { name: /Remove Stop/i })).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to remove this stop/i)).toBeInTheDocument();

    // Confirm removal
    const confirmBtn = screen.getByTestId('confirm-remove-btn');
    await fireEvent.click(confirmBtn);

    expect(recalcSpy).toHaveBeenCalled();
    expect(handleUpdate).toHaveBeenCalledWith(reducedPlan);
  });

  it('renders bilingual Kannada action buttons and controls', () => {
    render(
      <ItineraryView
        plan={MOCK_PLAN}
        language="kn"
        onReplan={vi.fn()}
        onSaveTrip={vi.fn()}
      />
    );

    // Verify Kannada action buttons
    expect(screen.getByText(/ತಾಣವನ್ನು ಸೇರಿಸಿ/i)).toBeInTheDocument();
    expect(screen.getByText(/ದಿನದ ಪಟ್ಟಿಯನ್ನು ಮರುರಚಿಸಿ/i)).toBeInTheDocument();
    expect(screen.getByTestId('edit-stop-stop-d1-attraction-1')).toHaveTextContent('ಸಂಪಾದಿಸಿ');
    expect(screen.getByTestId('regen-stop-stop-d1-attraction-1')).toHaveTextContent(/ಬದಲಾಯಿಸಿ/i);
  });
});
