import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SavedTripsView } from './SavedTripsView';
import * as api from '../../lib/api';
import { SavedTrip, SavedTripSummary, SavedTripDetail } from '../../types';

const MOCK_LOCAL_TRIP: SavedTrip = {
  id: 'local-trip-1',
  title: '2-Day Mysuru Heritage Journey',
  saved_at: '2026-10-23T10:00:00Z',
  request: {
    language: 'en',
    origin_label: 'Bengaluru',
    duration_days: 2,
    pace: 'balanced',
    is_offbeat_preferred: false,
  },
  plan: {
    language: 'en',
    generation_mode: 'ai',
    provider_used: 'gemini',
    duration_days: 2,
    total_destinations: 1,
    items: [
      {
        id: '11111111-1111-4111-8111-111111111101',
        slug: 'mysore-palace',
        name: 'Mysuru Palace',
        category: 'architecture',
        district_code: 'KA-MYS',
        day_number: 1,
        order: 1,
        rationale: 'Grand royal palace in Mysuru.',
        currency_code: 'INR',
        access_status: 'open_reported',
        is_offbeat: false,
      },
    ],
  },
};

const MOCK_CLOUD_TRIP_SUMMARY: SavedTripSummary = {
  id: 'cloud-trip-101',
  title: 'Cloud Hampi Expedition',
  origin_label: 'Bengaluru',
  duration_days: 3,
  pace: 'balanced',
  currency_code: 'INR',
  total_stops: 3,
  created_at: '2026-10-23T11:00:00Z',
  updated_at: '2026-10-23T11:00:00Z',
};

const MOCK_CLOUD_TRIP_DETAIL: SavedTripDetail = {
  id: 'cloud-trip-101',
  user_id: 'user-uuid-1',
  title: 'Cloud Hampi Expedition',
  origin_label: 'Bengaluru',
  duration_days: 3,
  pace: 'balanced',
  is_offbeat_preferred: false,
  preferences: {},
  currency_code: 'INR',
  status: 'active',
  created_at: '2026-10-23T11:00:00Z',
  updated_at: '2026-10-23T11:00:00Z',
  snapshot: {
    language: 'en',
    generation_mode: 'ai',
    provider_used: 'gemini',
    duration_days: 3,
    total_destinations: 3,
    items: [],
  },
};

describe('SavedTripsView Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders local device trips tab by default and preserves guest trips', () => {
    const onSelectTrip = vi.fn();
    const onDeleteTrip = vi.fn();
    const onNavigatePlanner = vi.fn();

    render(
      <SavedTripsView
        savedTrips={[MOCK_LOCAL_TRIP]}
        language="en"
        onSelectTrip={onSelectTrip}
        onDeleteTrip={onDeleteTrip}
        onNavigatePlanner={onNavigatePlanner}
      />
    );

    // Verify sub-tabs
    expect(screen.getByTestId('subtab-local-trips')).toBeInTheDocument();
    expect(screen.getByTestId('subtab-cloud-trips')).toBeInTheDocument();

    // Verify local trip displayed
    expect(screen.getByText('2-Day Mysuru Heritage Journey')).toBeInTheDocument();

    // Select trip
    fireEvent.click(screen.getByText(/View Itinerary/i));
    expect(onSelectTrip).toHaveBeenCalledWith(MOCK_LOCAL_TRIP);
  });

  it('switches to cloud tab, prompts connect when unauthenticated, and clears cache on signout', async () => {
    const listSpy = vi.spyOn(api, 'listCloudTrips').mockResolvedValue({
      items: [MOCK_CLOUD_TRIP_SUMMARY],
      total: 1,
      limit: 20,
      offset: 0,
    });
    const getSpy = vi.spyOn(api, 'getCloudTrip').mockResolvedValue(MOCK_CLOUD_TRIP_DETAIL);
    const deleteSpy = vi.spyOn(api, 'deleteCloudTrip').mockResolvedValue({
      success: true,
      id: 'cloud-trip-101',
    });

    const onAuthTokenChange = vi.fn();
    const onSelectCloudTrip = vi.fn();

    const { rerender } = render(
      <SavedTripsView
        savedTrips={[MOCK_LOCAL_TRIP]}
        language="en"
        onSelectTrip={vi.fn()}
        onDeleteTrip={vi.fn()}
        onNavigatePlanner={vi.fn()}
        authToken={null}
        onAuthTokenChange={onAuthTokenChange}
        onSelectCloudTrip={onSelectCloudTrip}
      />
    );

    // Clicking Cloud tab when unauthenticated triggers auth modal
    fireEvent.click(screen.getByTestId('subtab-cloud-trips'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Enter token and connect
    const tokenInput = screen.getByTestId('token-input');
    fireEvent.change(tokenInput, { target: { value: 'mock-valid-jwt-token' } });
    fireEvent.click(screen.getByTestId('submit-auth-btn'));

    expect(onAuthTokenChange).toHaveBeenCalledWith('mock-valid-jwt-token');

    // Simulate parent re-rendering with new authToken
    rerender(
      <SavedTripsView
        savedTrips={[MOCK_LOCAL_TRIP]}
        language="en"
        onSelectTrip={vi.fn()}
        onDeleteTrip={vi.fn()}
        onNavigatePlanner={vi.fn()}
        authToken="mock-valid-jwt-token"
        onAuthTokenChange={onAuthTokenChange}
        onSelectCloudTrip={onSelectCloudTrip}
      />
    );

    // Switch to cloud subtab
    fireEvent.click(screen.getByTestId('subtab-cloud-trips'));

    // Verify cloud trips were fetched
    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith('mock-valid-jwt-token');
      expect(screen.getByText('Cloud Hampi Expedition')).toBeInTheDocument();
    });

    // Load cloud trip detail
    const viewBtn = screen.getByTestId('view-cloud-cloud-trip-101');
    fireEvent.click(viewBtn);
    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith('cloud-trip-101', 'mock-valid-jwt-token');
      expect(onSelectCloudTrip).toHaveBeenCalledWith(MOCK_CLOUD_TRIP_DETAIL);
    });

    // Delete cloud trip
    const delBtn = screen.getByTestId('delete-cloud-cloud-trip-101');
    fireEvent.click(delBtn);
    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('cloud-trip-101', 'mock-valid-jwt-token');
      expect(screen.queryByText('Cloud Hampi Expedition')).not.toBeInTheDocument();
    });

    // Disconnect account
    const signOutBtn = screen.getByTestId('sign-out-btn');
    fireEvent.click(signOutBtn);
    expect(onAuthTokenChange).toHaveBeenCalledWith(null);
  });
});
