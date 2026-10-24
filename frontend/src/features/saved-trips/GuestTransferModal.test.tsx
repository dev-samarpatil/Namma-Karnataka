import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GuestTransferModal } from './GuestTransferModal';
import { SavedTrip, SavedTripDetail } from '../../types';
import * as api from '../../lib/api';

describe('GuestTransferModal', () => {
  const sampleTrip1: SavedTrip = {
    id: 'guest-1',
    title: 'Hampi Heritage Trail',
    saved_at: '2026-10-24T12:00:00Z',
    request: {
      language: 'en',
      origin_label: 'Hosapete',
      duration_days: 2,
      pace: 'balanced',
      is_offbeat_preferred: false,
    },
    plan: {
      language: 'en',
      generation_mode: 'fallback',
      provider_used: 'deterministic',
      duration_days: 2,
      total_destinations: 1,
      items: [
        {
          id: 'stop-1',
          name: 'Virupaksha Temple',
          category: 'heritage',
          district_code: 'KA-VIJ',
          slug: 'virupaksha-temple',
          day_number: 1,
          order: 1,
          rationale: 'Ancient temple',
          entry_fee_min_inr: 0,
          entry_fee_max_inr: 0,
          currency_code: 'INR',
          access_status: 'open_reported',
          is_offbeat: false,
        },
      ],
    },
  };

  const sampleTrip2: SavedTrip = {
    ...sampleTrip1,
    id: 'guest-2',
    title: 'Gokarna Beach Walk',
  };

  const sampleSavedDetail: SavedTripDetail = {
    id: 'cloud-trip-hampi',
    user_id: '00000000-0000-0000-0000-000000000001',
    title: 'Hampi Heritage Trail',
    origin_label: 'Hosapete',
    duration_days: 2,
    pace: 'balanced',
    is_offbeat_preferred: false,
    preferences: {},
    budget_min_inr: 0,
    budget_max_inr: 0,
    currency_code: 'INR',
    status: 'active',
    version: 1,
    snapshot: sampleTrip1.plan,
    created_at: '2026-10-24T12:00:00Z',
    updated_at: '2026-10-24T12:00:00Z',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <GuestTransferModal
        isOpen={false}
        savedTrips={[sampleTrip1]}
        authToken="test-token"
        language="en"
        onClose={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders available unlinked trips and allows select all / deselect all', () => {
    render(
      <GuestTransferModal
        isOpen={true}
        savedTrips={[sampleTrip1, sampleTrip2]}
        authToken="test-token"
        language="en"
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Hampi Heritage Trail')).toBeInTheDocument();
    expect(screen.getByText('Gokarna Beach Walk')).toBeInTheDocument();

    const deselectBtn = screen.getByTestId('deselect-all-btn');
    fireEvent.click(deselectBtn);
    expect(screen.getByText('0 of 2 selected')).toBeInTheDocument();

    const selectAllBtn = screen.getByTestId('select-all-btn');
    fireEvent.click(selectAllBtn);
    expect(screen.getByText('2 of 2 selected')).toBeInTheDocument();
  });

  it('successfully transfers selected trips to cloud with idempotency key', async () => {
    const saveSpy = vi.spyOn(api, 'saveCloudTrip').mockResolvedValue(sampleSavedDetail);
    const onTransferComplete = vi.fn();
    const onClose = vi.fn();

    render(
      <GuestTransferModal
        isOpen={true}
        savedTrips={[sampleTrip1]}
        authToken="test-token-user-1"
        language="en"
        onClose={onClose}
        onTransferComplete={onTransferComplete}
      />
    );

    const importBtn = screen.getByTestId('start-transfer-btn');
    fireEvent.click(importBtn);

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Hampi Heritage Trail' }),
        'test-token-user-1',
        'import-guest-1'
      );
    });

    await waitFor(() => {
      expect(onTransferComplete).toHaveBeenCalledWith(1);
    });
  });

  it('calls onClose when clicking cancel button', () => {
    const onClose = vi.fn();
    render(
      <GuestTransferModal
        isOpen={true}
        savedTrips={[sampleTrip1]}
        authToken="test-token"
        language="en"
        onClose={onClose}
      />
    );

    const cancelBtn = screen.getByTestId('cancel-transfer-btn');
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
