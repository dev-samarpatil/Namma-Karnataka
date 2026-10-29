import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImmersiveLandingPage } from './ImmersiveLandingPage';
import * as api from '../../lib/api';
import { DestinationRead } from '../../types';

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

describe('ImmersiveLandingPage Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders hero, regional diversity cards, and 4 pillars', async () => {
    vi.spyOn(api, 'listDestinations').mockResolvedValue({
      items: [MOCK_DESTINATION],
      total: 1,
      limit: 6,
      offset: 0,
      has_more: false,
    });

    render(
      <ImmersiveLandingPage
        language="en"
        onNavigateTab={vi.fn()}
        onPlanWithDestination={vi.fn()}
      />
    );

    // Hero
    expect(screen.getByText('DISCOVER')).toBeInTheDocument();
    expect(screen.getByText('KARNATAKA')).toBeInTheDocument();

    // 3 Geographical Realms
    expect(screen.getByText(/Karavali Coastal/i)).toBeInTheDocument();
    expect(screen.getByText(/Malnad Rainforests/i)).toBeInTheDocument();
    expect(screen.getByText(/Bayaluseeme Plateau/i)).toBeInTheDocument();

    // 4 Architecture Pillars
    expect(screen.getByText('Discover Destinations')).toBeInTheDocument();
    expect(screen.getByText('Intelligent Itinerary')).toBeInTheDocument();
    expect(screen.getByText('Geo-Accurate Navigation')).toBeInTheDocument();
    expect(screen.getByText('Save & Collaborate')).toBeInTheDocument();

    // CTA
    expect(screen.getByText('Begin Your Karnataka Expedition')).toBeInTheDocument();
  });

  it('loads featured destinations and opens detail modal on click', async () => {
    vi.spyOn(api, 'listDestinations').mockResolvedValue({
      items: [MOCK_DESTINATION],
      total: 1,
      limit: 6,
      offset: 0,
      has_more: false,
    });

    render(
      <ImmersiveLandingPage
        language="en"
        onNavigateTab={vi.fn()}
        onPlanWithDestination={vi.fn()}
      />
    );

    // Verify destination card rendered
    expect(await screen.findByText('Bangalore Palace')).toBeInTheDocument();

    // Click View Details
    const detailsBtn = screen.getByTestId('view-details-bangalore-palace');
    fireEvent.click(detailsBtn);

    // Verify modal opened
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/Tudor-style royal residence/i)).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByTestId('modal-close-button'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('navigates to tabs when CTA buttons are clicked', () => {
    vi.spyOn(api, 'listDestinations').mockResolvedValue({
      items: [],
      total: 0,
      limit: 6,
      offset: 0,
      has_more: false,
    });

    const handleNavigate = vi.fn();
    render(
      <ImmersiveLandingPage
        language="en"
        onNavigateTab={handleNavigate}
        onPlanWithDestination={vi.fn()}
      />
    );

    // Click explore CTA
    fireEvent.click(screen.getAllByText(/Explore All Destinations/i)[0]);
    expect(handleNavigate).toHaveBeenCalledWith('discovery');

    // Click plan CTA
    fireEvent.click(screen.getAllByText(/Plan Your Itinerary/i)[0]);
    expect(handleNavigate).toHaveBeenCalledWith('planner');

    // Click saved CTA
    fireEvent.click(screen.getByText(/View Saved Trips/i));
    expect(handleNavigate).toHaveBeenCalledWith('saved-trips');
  });

  it('displays error notice when destination list fails', async () => {
    vi.spyOn(api, 'listDestinations').mockRejectedValue(
      new api.ApiClientError('Backend connection failed', 0, 'NETWORK_ERROR')
    );

    render(
      <ImmersiveLandingPage
        language="en"
        onNavigateTab={vi.fn()}
        onPlanWithDestination={vi.fn()}
      />
    );

    expect(await screen.findByTestId('discovery-error')).toBeInTheDocument();
    expect(screen.getByText(/Backend connection failed/i)).toBeInTheDocument();
  });
});
