import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ItineraryView } from './ItineraryView';
import { PlanningRecommendationResponse, DayPlan, RecommendedDestination } from '../../types';

const MOCK_DESTINATIONS: RecommendedDestination[] = [
  {
    id: 'dest-blr',
    slug: 'lalbagh-botanical-garden',
    name: 'Lalbagh Botanical Garden',
    summary: 'Historic 240-acre botanical haven in Bengaluru',
    category: 'nature',
    district_code: 'KA-BLRU',
    district_name: 'Bengaluru Urban',
    coordinates: { lat: 12.9507, lon: 77.5848 },
    day_number: 1,
    order: 1,
    rationale: 'Lush greenery and heritage glasshouse',
    entry_fee_min_inr: 30,
    entry_fee_max_inr: 30,
    currency_code: 'INR',
    access_status: 'open_reported',
    is_offbeat: false,
  },
  {
    id: 'dest-blr-tipu',
    slug: 'tipu-sultan-summer-palace',
    name: "Tipu Sultan's Summer Palace",
    summary: 'Historic teakwood summer residence of Tipu Sultan',
    category: 'heritage',
    district_code: 'KA-BLRU',
    district_name: 'Bengaluru Urban',
    coordinates: { lat: 12.9592, lon: 77.5737 },
    day_number: 1,
    order: 2,
    rationale: 'Indo-Islamic architecture',
    entry_fee_min_inr: 20,
    entry_fee_max_inr: 20,
    currency_code: 'INR',
    access_status: 'open_reported',
    is_offbeat: false,
  },
  {
    id: 'dest-mys',
    slug: 'mysore-palace',
    name: 'Mysuru Palace',
    summary: 'Grand Indo-Saracenic royal residence',
    category: 'architecture',
    district_code: 'KA-MYS',
    district_name: 'Mysuru',
    coordinates: { lat: 12.3051, lon: 76.6551 },
    day_number: 2,
    order: 1,
    rationale: 'Seat of Wadiyars and prime architectural wonder',
    entry_fee_min_inr: 100,
    entry_fee_max_inr: 100,
    currency_code: 'INR',
    access_status: 'open_reported',
    is_offbeat: false,
  },
  {
    id: 'dest-coorg',
    slug: 'abbey-falls',
    name: 'Abbey Falls',
    summary: 'Cascading waterfall amidst coffee plantations',
    category: 'waterfall',
    district_code: 'KA-KOD',
    district_name: 'Kodagu (Coorg)',
    coordinates: { lat: 12.4542, lon: 75.7186 },
    day_number: 3,
    order: 1,
    rationale: 'Serene natural waterfall in Coorg hills',
    entry_fee_min_inr: 15,
    entry_fee_max_inr: 15,
    currency_code: 'INR',
    access_status: 'open_reported',
    is_offbeat: false,
  },
];

const MOCK_4DAY_PLAN: DayPlan[] = [
  {
    day_number: 1,
    date: '2026-11-01',
    theme: 'Bengaluru Garden & Heritage City',
    start_location_name: 'Bengaluru Urban',
    end_location_name: 'Bengaluru Urban',
    accommodation_name: 'Bengaluru City Hotel',
    driving_distance_km: 35,
    transit_minutes: 60,
    total_duration_minutes: 360,
    meals_covered: ['Breakfast', 'Lunch'],
    daily_cost_min_inr: 800,
    daily_cost_max_inr: 1200,
    warnings: [],
    stops: [
      {
        stop_id: 'stop-d1-attraction-1',
        destination_id: 'dest-blr',
        stop_type: 'attraction',
        name: 'Lalbagh Botanical Garden',
        description: 'Historic botanical haven with glass house',
        start_time: '10:00',
        end_time: '12:00',
        duration_minutes: 120,
        cost_min_inr: 30,
        cost_max_inr: 30,
        currency: 'INR',
        cost_status: 'verified',
        rationale: 'Iconic city landmark',
      },
      {
        stop_id: 'stop-d1-meal',
        destination_id: null,
        stop_type: 'meal',
        name: 'Vidyarthi Bhavan Lunch',
        description: 'Traditional South Indian lunch',
        start_time: '12:30',
        end_time: '13:30',
        duration_minutes: 60,
        cost_min_inr: 150,
        cost_max_inr: 250,
        currency: 'INR',
        cost_status: 'estimated',
      },
      {
        stop_id: 'stop-d1-attraction-2',
        destination_id: 'dest-blr-tipu',
        stop_type: 'attraction',
        name: "Tipu Sultan's Summer Palace",
        description: 'Historic teakwood summer palace',
        start_time: '14:00',
        end_time: '15:30',
        duration_minutes: 90,
        cost_min_inr: 20,
        cost_max_inr: 20,
        currency: 'INR',
        cost_status: 'verified',
        rationale: 'Heritage landmark',
      },
      {
        stop_id: 'stop-d1-stay',
        destination_id: null,
        stop_type: 'accommodation',
        name: 'KSTDC Hotel Mayura Bengaluru',
        description: 'Comfortable city stay',
        start_time: '20:00',
        end_time: '23:00',
        duration_minutes: 180,
        cost_min_inr: 1800,
        cost_max_inr: 2400,
        currency: 'INR',
        cost_status: 'verified',
      },
    ],
  },
  {
    day_number: 2,
    date: '2026-11-02',
    theme: 'Mysuru Royal Heritage Circuit',
    start_location_name: 'Bengaluru Urban',
    end_location_name: 'Mysuru',
    accommodation_name: 'Royal Orchid Mysuru',
    driving_distance_km: 145,
    transit_minutes: 180,
    total_duration_minutes: 420,
    meals_covered: ['Breakfast', 'Lunch', 'Dinner'],
    daily_cost_min_inr: 2200,
    daily_cost_max_inr: 3100,
    warnings: [],
    stops: [
      {
        stop_id: 'stop-d2-attraction',
        destination_id: 'dest-mys',
        stop_type: 'attraction',
        name: 'Mysuru Palace',
        description: 'Iconic royal residence',
        start_time: '14:30',
        end_time: '17:00',
        duration_minutes: 150,
        cost_min_inr: 100,
        cost_max_inr: 100,
        currency: 'INR',
        cost_status: 'verified',
        rationale: 'Palatial architecture',
      },
      {
        stop_id: 'stop-d2-stay',
        destination_id: null,
        stop_type: 'accommodation',
        name: 'Royal Orchid Mysuru',
        description: 'Heritage stay',
        start_time: '20:00',
        end_time: '23:00',
        duration_minutes: 180,
        cost_min_inr: 2200,
        cost_max_inr: 3100,
        currency: 'INR',
        cost_status: 'verified',
      },
    ],
  },
  {
    day_number: 3,
    date: '2026-11-03',
    theme: 'Coorg Coffee Estates & Waterfalls',
    start_location_name: 'Mysuru',
    end_location_name: 'Madikeri (Coorg)',
    accommodation_name: 'Coorg Coffee Resort',
    driving_distance_km: 120,
    transit_minutes: 150,
    total_duration_minutes: 380,
    meals_covered: ['Breakfast', 'Lunch'],
    daily_cost_min_inr: 2500,
    daily_cost_max_inr: 3500,
    warnings: [],
    stops: [
      {
        stop_id: 'stop-d3-attraction',
        destination_id: 'dest-coorg',
        stop_type: 'attraction',
        name: 'Abbey Falls',
        description: 'Waterfalls in Western Ghats lush greenery',
        start_time: '11:00',
        end_time: '12:30',
        duration_minutes: 90,
        cost_min_inr: 15,
        cost_max_inr: 15,
        currency: 'INR',
        cost_status: 'verified',
        rationale: 'Scenic falls',
      },
    ],
  },
  {
    day_number: 4,
    date: '2026-11-04',
    theme: 'Return Journey & Rest',
    start_location_name: 'Madikeri (Coorg)',
    end_location_name: 'Bengaluru Urban',
    accommodation_name: 'Home Stay Bengaluru',
    driving_distance_km: 250,
    transit_minutes: 300,
    total_duration_minutes: 360,
    meals_covered: ['Breakfast'],
    daily_cost_min_inr: 500,
    daily_cost_max_inr: 800,
    warnings: [],
    stops: [
      {
        stop_id: 'stop-d4-transport',
        destination_id: null,
        stop_type: 'transport',
        name: 'Return Highway Transit',
        description: 'Driving return along expressway',
        start_time: '09:00',
        end_time: '14:00',
        duration_minutes: 300,
        cost_min_inr: 400,
        cost_max_inr: 600,
        currency: 'INR',
        cost_status: 'verified',
        rationale: 'Return journey',
      },
    ],
  },
];

const MOCK_FULL_PLAN: PlanningRecommendationResponse = {
  request_id: 'req-multi-day-test',
  language: 'en',
  generation_mode: 'ai',
  provider_used: 'gemini',
  items: MOCK_DESTINATIONS,
  total_destinations: 4,
  duration_days: 4,
  days: MOCK_4DAY_PLAN,
  budget_breakdown: {
    grand_total_min_inr: 6500,
    grand_total_max_inr: 8800,
    per_person_min_inr: 3250,
    per_person_max_inr: 4400,
    currency: 'INR',
    traveler_count: 2,
    has_unknown_costs: false,
    warnings: [],
    categories: [
      {
        category_name: 'Attraction Entry Fees',
        estimated_min_inr: 290,
        estimated_max_inr: 290,
        cost_status: 'verified',
        calculation_basis: '4 attractions for 2 travelers',
      },
    ],
  },
  recommended_festivals: [
    {
      id: 'fest-mysore-dasara',
      name_en: 'Mysuru Dasara',
      name_kn: 'ಮೈಸೂರು ದಸರಾ',
      description_en: 'Grand 10-day state festival celebrating royal heritage with illuminated palace.',
      description_kn: 'ನಾಡಹಬ್ಬ ಮೈಸೂರು ದಸರಾ ಮಹೋತ್ಸವ.',
      location_name: 'Mysuru Palace Grounds',
      district_code: 'KA-MYS',
      latitude: 12.3051,
      longitude: 76.6551,
      start_month: 10,
      end_month: 10,
      typical_start_date: '2026-10-15',
      typical_end_date: '2026-10-24',
      date_status: 'verified_active',
      source_name: 'Karnataka Tourism Portal',
      source_url: 'https://karnatakatourism.org',
      verification_status: 'source_checked',
      ticket_cost_min_inr: 0,
      ticket_cost_max_inr: 0,
      ticket_cost_status: 'verified',
      event_category: 'Cultural Festival',
    },
  ],
  assumptions: ['Travel timings calculated for car driving'],
  warnings: [],
};

describe('Interactive Day-Wise Itinerary Redesign Experience', () => {
  it('renders polaroid destination gallery displaying eligible sightseeing locations for the selected day', () => {
    render(
      <ItineraryView
        plan={MOCK_FULL_PLAN}
        language="en"
        onReplan={vi.fn()}
        onSaveTrip={vi.fn()}
      />
    );

    // Carousel container rendered with light travel scrapbook region
    const carousel = screen.getByTestId('polaroid-line-carousel');
    expect(carousel).toBeInTheDocument();

    // Day 1 has 2 sightseeing destinations: Lalbagh and Tipu Sultan's Palace
    expect(screen.getByTestId('polaroid-slide-1')).toBeInTheDocument();
    expect(screen.getByTestId('polaroid-slide-2')).toBeInTheDocument();
    expect(within(carousel).getByText('Lalbagh Botanical Garden')).toBeInTheDocument();
    expect(within(carousel).getByText("Tipu Sultan's Summer Palace")).toBeInTheDocument();

    // Verify stop badges Stop 1 and Stop 2
    expect(screen.getByText('Stop 1')).toBeInTheDocument();
    expect(screen.getByText('Stop 2')).toBeInTheDocument();

    // Verify hotel and meal stops are EXCLUDED from the polaroid gallery
    expect(within(carousel).queryByText('KSTDC Hotel Mayura Bengaluru')).not.toBeInTheDocument();
    expect(within(carousel).queryByText('Vidyarthi Bhavan Lunch')).not.toBeInTheDocument();

    // Gallery navigation bottom bar represents the selected day's cluster
    expect(within(carousel).getByText('Day 1 — Bengaluru Garden & Heritage City')).toBeInTheDocument();
    expect(
      within(carousel).getByText("Lalbagh Botanical Garden · Tipu Sultan's Summer Palace")
    ).toBeInTheDocument();
    expect(within(carousel).getByText('01 / 02')).toBeInTheDocument();
  });

  it('navigates within day destinations using gallery arrow controls and slide clicks', () => {
    render(
      <ItineraryView
        plan={MOCK_FULL_PLAN}
        language="en"
        onReplan={vi.fn()}
        onSaveTrip={vi.fn()}
      />
    );

    const carousel = screen.getByTestId('polaroid-line-carousel');
    const prevSlideBtn = screen.getByTestId('polaroid-prev-btn');
    const nextSlideBtn = screen.getByTestId('polaroid-next-btn');

    // On slide 1, previous destination is disabled
    expect(prevSlideBtn).toBeDisabled();
    expect(nextSlideBtn).not.toBeDisabled();

    // Click Next Slide -> advances to Stop 2
    fireEvent.click(nextSlideBtn);
    expect(within(carousel).getByText('02 / 02')).toBeInTheDocument();
    expect(nextSlideBtn).toBeDisabled();
    expect(prevSlideBtn).not.toBeDisabled();

    // Click slide 1 card -> returns to Stop 1
    fireEvent.click(screen.getByTestId('polaroid-slide-1'));
    expect(within(carousel).getByText('01 / 02')).toBeInTheDocument();
  });

  it('switches days using DayNavigation and dynamically updates carousel to show that day destinations', () => {
    render(
      <ItineraryView
        plan={MOCK_FULL_PLAN}
        language="en"
        onReplan={vi.fn()}
        onSaveTrip={vi.fn()}
      />
    );

    const carousel = screen.getByTestId('polaroid-line-carousel');
    const prevDayBtn = screen.getByTestId('day-nav-prev-btn');
    const nextDayBtn = screen.getByTestId('day-nav-next-btn');

    // Initially on Day 1
    expect(prevDayBtn).toBeDisabled();
    expect(nextDayBtn).not.toBeDisabled();
    expect(within(carousel).getByText('Lalbagh Botanical Garden')).toBeInTheDocument();

    // Switch to Day 2 using Next Day button
    fireEvent.click(nextDayBtn);
    expect(screen.getByTestId('day-overview-day-2')).toBeInTheDocument();

    // Day 1 destinations disappear, and Day 2's destination appears in the gallery!
    expect(within(carousel).queryByText('Lalbagh Botanical Garden')).not.toBeInTheDocument();
    expect(within(carousel).getAllByText('Mysuru Palace').length).toBeGreaterThanOrEqual(1);
    expect(within(carousel).getByText('Day 2 — Mysuru Royal Heritage Circuit')).toBeInTheDocument();
    expect(within(carousel).getByText('01 / 01')).toBeInTheDocument();

    // Switch to Day 3 using Quick Jump chip
    const jumpDay3Btn = screen.getByTestId('quick-day-jump-3');
    fireEvent.click(jumpDay3Btn);
    expect(screen.getByTestId('day-overview-day-3')).toBeInTheDocument();
    expect(within(carousel).getAllByText('Abbey Falls').length).toBeGreaterThanOrEqual(1);
    expect(within(carousel).getByText('Day 3 — Coorg Coffee Estates & Waterfalls')).toBeInTheDocument();
  });

  it('renders tasteful empty state on days with no sightseeing destinations', () => {
    render(
      <ItineraryView
        plan={MOCK_FULL_PLAN}
        language="en"
        onReplan={vi.fn()}
        onSaveTrip={vi.fn()}
      />
    );

    // Jump to Day 4 (return/rest day with no attraction stops)
    const jumpDay4Btn = screen.getByTestId('quick-day-jump-4');
    fireEvent.click(jumpDay4Btn);

    // Empty state rendered in carousel viewport
    expect(screen.getByTestId('gallery-empty-state')).toBeInTheDocument();
    expect(
      screen.getByText('No sightseeing destinations scheduled for this day.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Your accommodation and travel details are available in View Details.')
    ).toBeInTheDocument();

    // Bottom counter displays 00 / 00 and navigation buttons disabled
    expect(screen.getByText('00 / 00')).toBeInTheDocument();
    expect(screen.getByTestId('polaroid-prev-btn')).toBeDisabled();
    expect(screen.getByTestId('polaroid-next-btn')).toBeDisabled();
  });

  it('renders DayOverview with 6 key travel metrics', () => {
    render(
      <ItineraryView
        plan={MOCK_FULL_PLAN}
        language="en"
        onReplan={vi.fn()}
        onSaveTrip={vi.fn()}
      />
    );

    const overview = screen.getByTestId('day-overview-day-1');
    expect(overview).toBeInTheDocument();

    // Metric 1: Destinations
    expect(screen.getByText('Destinations')).toBeInTheDocument();
    // Metric 2: Distance
    expect(screen.getByText('Total Distance')).toBeInTheDocument();
    expect(screen.getByText('~35 km')).toBeInTheDocument();
    // Metric 3: Travel Time
    expect(screen.getByText('Travel Time')).toBeInTheDocument();
    // Metric 4: Sightseeing
    expect(screen.getByText('Sightseeing')).toBeInTheDocument();
    // Metric 5: Daily Budget
    expect(screen.getByText('Daily Budget')).toBeInTheDocument();
    // Metric 6: Overnight Stay
    expect(screen.getByText('Overnight Stay')).toBeInTheDocument();
    expect(screen.getByText('Bengaluru City Hotel')).toBeInTheDocument();
  });

  it('toggles View Details section on and off', () => {
    render(
      <ItineraryView
        plan={MOCK_FULL_PLAN}
        language="en"
        onReplan={vi.fn()}
        onSaveTrip={vi.fn()}
      />
    );

    const toggleBtn = screen.getByTestId('toggle-view-details-btn');
    expect(screen.getByTestId('day-details-container')).toBeInTheDocument();

    // Click Hide Details
    fireEvent.click(toggleBtn);
    expect(screen.queryByTestId('day-details-container')).not.toBeInTheDocument();

    // Click View Details again
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId('day-details-container')).toBeInTheDocument();
  });

  it('renders daily budget summary, overnight stay card, and verified cultural events in detailed view', () => {
    render(
      <ItineraryView
        plan={MOCK_FULL_PLAN}
        language="en"
        onReplan={vi.fn()}
        onSaveTrip={vi.fn()}
      />
    );

    // Switch to Day 2 (Mysuru) via quick day jump chip
    fireEvent.click(screen.getByTestId('quick-day-jump-2'));

    // Daily Budget Summary for Day 2
    expect(screen.getByTestId('daily-budget-summary-day-2')).toBeInTheDocument();
    expect(screen.getByText(/Attraction Admissions/i)).toBeInTheDocument();

    // Overnight Stay Card for Day 2 with geographic continuity note
    expect(screen.getByTestId('overnight-stay-card-day-2')).toBeInTheDocument();
    expect(screen.getAllByText(/Royal Orchid Mysuru/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/will start directly from/i)).toBeInTheDocument();

    // Cultural Events section
    expect(screen.getByTestId('day-events-section-day-2')).toBeInTheDocument();
    expect(screen.getByText('Mysuru Dasara')).toBeInTheDocument();
    expect(screen.getByText(/Karnataka Tourism Portal/i)).toBeInTheDocument();
  });

  it('switches to Trip-Wide Overview and allows jumping back to specific days', () => {
    render(
      <ItineraryView
        plan={MOCK_FULL_PLAN}
        language="en"
        onReplan={vi.fn()}
        onSaveTrip={vi.fn()}
      />
    );

    // Click "View All Days" button
    const viewAllBtn = screen.getByTestId('toggle-all-days-btn');
    fireEvent.click(viewAllBtn);

    // Trip-Wide Overview rendered
    expect(screen.getByTestId('trip-wide-overview')).toBeInTheDocument();
    expect(screen.getByText(/Complete Trip Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/4-Day Karnataka Travel Circuit/i)).toBeInTheDocument();

    // Day route sequence cards rendered
    expect(screen.getByTestId('trip-overview-day-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('trip-overview-day-card-2')).toBeInTheDocument();
    expect(screen.getByTestId('trip-overview-day-card-3')).toBeInTheDocument();
    expect(screen.getByTestId('trip-overview-day-card-4')).toBeInTheDocument();

    // Click Day 3 card in trip-wide view
    fireEvent.click(screen.getByTestId('trip-overview-day-card-3'));

    // Returns to Day 3 in day-wise view!
    expect(screen.queryByTestId('trip-wide-overview')).not.toBeInTheDocument();
    expect(screen.getByTestId('day-overview-day-3')).toBeInTheDocument();
    expect(screen.getByText('Coorg Coffee Estates & Waterfalls')).toBeInTheDocument();
  });
});
