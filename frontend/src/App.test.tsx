import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';
import * as api from './lib/api';
import { DestinationRead, PlanningRecommendationResponse } from './types';

const MOCK_DESTINATION: DestinationRead = {
  id: '00000000-0000-0000-0000-000000000001',
  slug: 'bangalore-palace',
  name_en: 'Bangalore Palace',
  name_kn: 'ಬೆಂಗಳೂರು ಅರಮನೆ',
  summary_en: 'Tudor-style royal residence built in 1878 by the Wadiyar dynasty.',
  summary_kn: '೧೮೭೮ ರಲ್ಲಿ ಒಡೆಯರ್ ರಾಜಮನೆತನ ನಿರ್ಮಿಸಿದ ಸುಂದರ ಟ್ಯೂಡರ್ ಶೈಲಿಯ ಅರಮನೆ.',
  category: 'heritage',
  district_code: 'KA-BLU',
  district: {
    code: 'KA-BLU',
    name_en: 'Bengaluru Urban',
    name_kn: 'ಬೆಂಗಳೂರು ನಗರ',
  },
  coordinates: { lat: 12.9988, lon: 77.5921 },
  access_status: 'open_reported',
  verification_status: 'human_reviewed',
  content_status: 'published',
  active: true,
  is_offbeat: false,
  estimated_visit_minutes: 120,
  entry_fee_min_inr: 250,
  entry_fee_max_inr: 250,
  currency_code: 'INR',
  sources: [
    {
      source_type: 'government_official',
      title: 'Karnataka Tourism Official Portal',
      url: 'https://karnatakatourism.org',
    },
  ],
};

const MOCK_OFFBEAT_DESTINATION: DestinationRead = {
  id: '00000000-0000-0000-0000-000000000002',
  slug: 'vibhooti-falls',
  name_en: 'Vibhooti Falls',
  name_kn: 'ವಿಭೂತಿ ಜಲಪಾತ',
  summary_en: 'Perennial cascade deep in the Western Ghats forest.',
  category: 'waterfall',
  district_code: 'KA-UKA',
  district: {
    code: 'KA-UKA',
    name_en: 'Uttara Kannada',
    name_kn: 'ಉತ್ತರ ಕನ್ನಡ',
  },
  coordinates: { lat: 14.5422, lon: 74.4533 },
  access_status: 'open_reported',
  verification_status: 'human_reviewed',
  content_status: 'published',
  active: true,
  is_offbeat: true,
  estimated_visit_minutes: 90,
  entry_fee_min_inr: undefined,
  entry_fee_max_inr: undefined,
  currency_code: 'INR',
};

const MOCK_PLAN_RESPONSE: PlanningRecommendationResponse = {
  generation_mode: 'ai',
  provider_used: 'gemini',
  language: 'en',
  duration_days: 1,
  total_destinations: 1,
  items: [
    {
      id: '00000000-0000-0000-0000-000000000001',
      slug: 'bangalore-palace',
      name: 'Bangalore Palace',
      summary: 'Tudor-style royal residence built in 1878.',
      category: 'heritage',
      district_code: 'KA-BLU',
      district_name: 'Bengaluru Urban',
      coordinates: { lat: 12.9988, lon: 77.5921 },
      day_number: 1,
      order: 1,
      rationale: 'Iconic royal architectural marvel situated in central Bengaluru.',
      entry_fee_min_inr: 250,
      entry_fee_max_inr: 250,
      currency_code: 'INR',
      access_status: 'open_reported',
      is_offbeat: false,
    },
  ],
};

describe('Namma Karnataka Phase 4 Complete Journey', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders application shell and switches language bilingually', async () => {
    vi.spyOn(api, 'listDestinations').mockResolvedValue({
      items: [MOCK_DESTINATION],
      total: 1,
      limit: 50,
      offset: 0,
      has_more: false,
    });

    render(<App />);

    // Check English header branding
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByText(/Namma Karnataka/i)).toBeInTheDocument();

    // Toggle language to Kannada
    const langBtn = screen.getByTestId('language-toggle-btn');
    expect(langBtn).toHaveTextContent('ಕನ್ನಡ');
    fireEvent.click(langBtn);

    // Verify Kannada UI strings appear
    await waitFor(() => {
      expect(screen.getByTestId('nav-tab-discovery')).toHaveTextContent('ತಾಣಗಳ ಅನ್ವೇಷಣೆ');
      expect(screen.getByTestId('nav-tab-planner')).toHaveTextContent('ಪ್ರವಾಸ ಯೋಜನೆ');
      expect(langBtn).toHaveTextContent('English');
    });

    // Switch back to English
    fireEvent.click(langBtn);
    await waitFor(() => {
      expect(screen.getByTestId('nav-tab-discovery')).toHaveTextContent('Explore Destinations');
    });
  });

  it('browses destinations, filters by offbeat, and opens destination details modal', async () => {
    vi.spyOn(api, 'listDestinations').mockResolvedValue({
      items: [MOCK_DESTINATION, MOCK_OFFBEAT_DESTINATION],
      total: 2,
      limit: 50,
      offset: 0,
      has_more: false,
    });

    render(<App />);

    // Wait for cards to load
    await waitFor(() => {
      expect(screen.getByText('Bangalore Palace')).toBeInTheDocument();
      expect(screen.getByText('Vibhooti Falls')).toBeInTheDocument();
    });

    // Click "View Details" on Bangalore Palace
    const detailsBtn = screen.getByTestId('view-details-bangalore-palace');
    fireEvent.click(detailsBtn);

    // Verify modal appears with trusted metadata
    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText(/Tudor-style royal residence/i)).toBeInTheDocument();
    expect(within(modal).getByText(/Karnataka Tourism Official Portal/i)).toBeInTheDocument();
    expect(within(modal).getByText(/12.9988° N/i)).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByTestId('modal-close-button');
    fireEvent.click(closeBtn);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('navigates to trip planner and validates user input', async () => {
    vi.spyOn(api, 'listDestinations').mockResolvedValue({
      items: [MOCK_DESTINATION],
      total: 1,
      limit: 50,
      offset: 0,
      has_more: false,
    });

    render(<App />);

    // Switch to Plan Trip tab
    const plannerTab = screen.getByTestId('nav-tab-planner');
    fireEvent.click(plannerTab);

    expect(screen.getByLabelText(/Trip Planner Form/i)).toBeInTheDocument();

    // Clear origin and submit to trigger validation error
    const originInput = screen.getByTestId('planner-origin-input');
    fireEvent.change(originInput, { target: { value: '' } });

    const submitBtn = screen.getByTestId('submit-plan-button');
    fireEvent.click(submitBtn);

    // Validation error must appear
    expect(screen.getByTestId('planner-validation-error')).toHaveTextContent(
      /Please specify a starting location/i
    );
  });

  it('submits trip preferences, receives plan, and displays itinerary with budget and map', async () => {
    vi.spyOn(api, 'listDestinations').mockResolvedValue({
      items: [MOCK_DESTINATION],
      total: 1,
      limit: 50,
      offset: 0,
      has_more: false,
    });

    const generateSpy = vi
      .spyOn(api, 'generatePlanningRecommendations')
      .mockResolvedValue(MOCK_PLAN_RESPONSE);

    render(<App />);

    // Switch to planner
    fireEvent.click(screen.getByTestId('nav-tab-planner'));

    // Set 1 day duration via numeric input
    fireEvent.change(screen.getByTestId('planner-duration-input'), { target: { value: '1' } });

    // Submit plan
    const submitBtn = screen.getByTestId('submit-plan-button');
    fireEvent.click(submitBtn);

    expect(generateSpy).toHaveBeenCalled();

    // Verify Itinerary view is displayed
    await waitFor(() => {
      expect(screen.getByTestId('generation-mode-ai')).toHaveTextContent(/AI Curated \(GEMINI\)/i);
      expect(screen.getByText('Your Karnataka Itinerary')).toBeInTheDocument();
    });

    // Check chronological day block and stop card
    expect(screen.getByTestId('day-block-1')).toBeInTheDocument();
    expect(screen.getByTestId('stop-card-bangalore-palace')).toBeInTheDocument();
    expect(screen.getByText(/Iconic royal architectural marvel/i)).toBeInTheDocument();

    // Check deterministic budget summary
    expect(screen.getByTestId('budget-summary-card')).toBeInTheDocument();
    expect(screen.getByTestId('total-estimated-fees')).toHaveTextContent('₹250');
    expect(screen.getByTestId('budget-disclaimer')).toHaveTextContent(
      /Excludes transport, fuel, food, and lodging/i
    );

    // Check map view
    expect(screen.getByTestId('itinerary-map-view')).toBeInTheDocument();
    expect(screen.getByTestId('map-marker-00000000-0000-0000-0000-000000000001')).toBeInTheDocument();

    // Toggle list view alternative for coordinates
    const toggleMapBtn = screen.getByTestId('toggle-map-list-view');
    fireEvent.click(toggleMapBtn);
    expect(screen.getByTestId('map-list-alternative')).toBeInTheDocument();

    // Save itinerary locally
    const saveBtn = screen.getByTestId('save-trip-btn');
    fireEvent.click(saveBtn);

    // Switch to Saved Trips tab
    fireEvent.click(screen.getByTestId('nav-tab-saved'));
    await waitFor(() => {
      expect(screen.getByText(/Your Saved Trips/i)).toBeInTheDocument();
      expect(screen.getByTestId('saved-trips-grid')).toBeInTheDocument();
      expect(screen.getByTestId('supabase-status-notice')).toBeInTheDocument();
    });
  });

  it('handles backend network failure gracefully without crashing', async () => {
    vi.spyOn(api, 'listDestinations').mockRejectedValue(
      new api.ApiClientError('Backend connection failed', 0, 'NETWORK_ERROR')
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('discovery-error')).toBeInTheDocument();
      expect(screen.getByText(/Backend connection failed/i)).toBeInTheDocument();
    });
  });
});
