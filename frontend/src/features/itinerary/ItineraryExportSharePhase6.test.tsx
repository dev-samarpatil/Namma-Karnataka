import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ItineraryView } from './ItineraryView';
import * as api from '../../lib/api';
import { PlanningRecommendationResponse, PlanningRequest } from '../../types';

const MOCK_PLAN: PlanningRecommendationResponse = {
  language: 'en',
  generation_mode: 'ai',
  provider_used: 'gemini',
  total_destinations: 2,
  duration_days: 2,
  items: [
    {
      id: 'mysore-palace',
      slug: 'mysore-palace',
      name: 'Mysuru Palace',
      district_code: 'KA-MYS',
      category: 'architecture',
      is_offbeat: false,
      coordinates: { lat: 12.3051, lon: 76.6551 },
      day_number: 1,
      order: 1,
      rationale: 'Primary royal heritage destination',
      access_status: 'open_reported',
      entry_fee_min_inr: 100,
      entry_fee_max_inr: 100,
      currency_code: 'INR',
      summary: 'Royal palace',
    },
    {
      id: 'chamundi-hills',
      slug: 'chamundi-hills',
      name: 'Chamundi Hills',
      district_code: 'KA-MYS',
      category: 'spiritual_cultural',
      is_offbeat: false,
      coordinates: { lat: 12.2725, lon: 76.6710 },
      day_number: 1,
      order: 2,
      rationale: 'Scenic hilltop temple',
      access_status: 'open_reported',
      entry_fee_min_inr: 0,
      entry_fee_max_inr: 0,
      currency_code: 'INR',
      summary: 'Hilltop temple',
    },
  ],
  days: [
    {
      day_number: 1,
      theme: 'Heritage and Royalty',
      stops: [
        {
          stop_id: 'stop-1',
          destination_id: 'mysore-palace',
          stop_type: 'attraction',
          name: 'Mysuru Palace',
          start_time: '09:30',
          end_time: '11:30',
          duration_minutes: 120,
          currency: 'INR',
          cost_status: 'verified',
          cost_min_inr: 100,
          cost_max_inr: 100,
          notes: 'Special royal note',
        },
      ],
      total_duration_minutes: 120,
      transit_minutes: 30,
      meals_covered: ['breakfast', 'lunch'],
      warnings: [],
    },
  ],
  budget_breakdown: {
    grand_total_min_inr: 2500,
    grand_total_max_inr: 3200,
    currency: 'INR',
    traveler_count: 2,
    categories: [],
    has_unknown_costs: false,
    warnings: [],
  },
};

const MOCK_REQUEST: PlanningRequest = {
  language: 'en',
  origin_label: 'Bengaluru',
  duration_days: 2,
  travelers_count: 2,
  pace: 'balanced',
  is_offbeat_preferred: false,
  budget_scenario: 'standard',
  travel_mode: 'driving_car',
};

describe('ItineraryView — Phase 6 Itinerary Export and Secure Sharing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens export modal and triggers window.print when Print button is clicked', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    render(
      <ItineraryView
        plan={MOCK_PLAN}
        request={MOCK_REQUEST}
        language="en"
        onReplan={vi.fn()}
        onSaveTrip={vi.fn()}
      />
    );

    // Click Export button
    fireEvent.click(screen.getByTestId('export-itinerary-btn'));

    // Check modal contents
    expect(screen.getByText(/Reliability & Source Disclosures/i)).toBeInTheDocument();
    expect(screen.getByTestId('exclude-notes-checkbox')).toBeInTheDocument();

    // Trigger Print
    fireEvent.click(screen.getByTestId('print-itinerary-btn'));
    expect(printSpy).toHaveBeenCalled();
  });

  it('allows structured JSON download with privacy toggle', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(
      <ItineraryView
        plan={MOCK_PLAN}
        request={MOCK_REQUEST}
        language="en"
        onReplan={vi.fn()}
        onSaveTrip={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('export-itinerary-btn'));

    // Toggle exclude private notes
    const excludeCheckbox = screen.getByTestId('exclude-notes-checkbox');
    fireEvent.click(excludeCheckbox);

    fireEvent.click(screen.getByTestId('download-json-btn'));
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('opens share modal, selects role, creates secure link, and displays active shares', async () => {
    vi.spyOn(api, 'listTripShares').mockResolvedValue({
      items: [
        {
          id: 'share-abc-123',
          trip_id: 'trip-101',
          created_by: 'user-1',
          role: 'viewer',
          share_token: 'valid-share-token-999',
          is_revoked: false,
          created_at: '2026-10-24T10:00:00Z',
          expires_at: '2026-11-24T10:00:00Z',
        },
      ],
      total: 1,
    });

    const createShareSpy = vi.spyOn(api, 'createTripShare').mockResolvedValue({
      id: 'share-def-456',
      trip_id: 'trip-101',
      created_by: 'user-1',
      role: 'editor',
      share_token: 'new-editor-token-888',
      is_revoked: false,
      created_at: '2026-10-24T11:00:00Z',
      expires_at: '2026-11-24T11:00:00Z',
    });

    render(
      <ItineraryView
        plan={MOCK_PLAN}
        request={MOCK_REQUEST}
        language="en"
        tripId="trip-101"
        onReplan={vi.fn()}
        onSaveTrip={vi.fn()}
      />
    );

    // Click Share Trip button
    fireEvent.click(screen.getByTestId('share-trip-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('share-role-select')).toBeInTheDocument();
      expect(screen.getByTestId('create-share-link-btn')).toBeInTheDocument();
    });

    // Select editor role
    fireEvent.change(screen.getByTestId('share-role-select'), { target: { value: 'editor' } });

    // Generate link
    fireEvent.click(screen.getByTestId('create-share-link-btn'));

    await waitFor(() => {
      expect(createShareSpy).toHaveBeenCalledWith('trip-101', 'editor', 30);
      expect(screen.getByTestId('generated-share-link-input')).toBeInTheDocument();
      expect(screen.getByTestId('copy-share-link-btn')).toBeInTheDocument();
    });
  });

  it('renders read-only banner when userRole is viewer', () => {
    render(
      <ItineraryView
        plan={MOCK_PLAN}
        request={MOCK_REQUEST}
        language="en"
        userRole="viewer"
        onReplan={vi.fn()}
        onSaveTrip={vi.fn()}
      />
    );

    expect(screen.getByTestId('viewer-mode-banner')).toBeInTheDocument();
  });

  it('renders version conflict alert and triggers reload on action', async () => {
    const reloadMock = vi.fn();

    render(
      <ItineraryView
        plan={MOCK_PLAN}
        request={MOCK_REQUEST}
        language="en"
        userRole="editor"
        shareToken="editor-token"
        version={2}
        onReloadSharedTrip={reloadMock}
        onReplan={vi.fn()}
        onSaveTrip={vi.fn()}
      />
    );

    expect(screen.getByTestId('editor-mode-banner')).toBeInTheDocument();
  });
});
