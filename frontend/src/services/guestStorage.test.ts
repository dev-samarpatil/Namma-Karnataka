import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadGuestTrips,
  saveGuestTrip,
  deleteGuestTrip,
  updateGuestTripSyncStatus,
  normalizeSavedTrip,
  GUEST_STORAGE_KEY,
} from './guestStorage';
import { SavedTrip } from '../types';

describe('guestStorage service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const validSampleTrip: SavedTrip = {
    id: 'guest-trip-101',
    title: 'Weekend in Mysuru',
    saved_at: '2026-10-24T10:00:00.000Z',
    request: {
      language: 'en',
      origin_label: 'Bengaluru',
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
          id: 'item-1',
          slug: 'mysuru-palace',
          name: 'Mysuru Palace',
          category: 'heritage',
          district_code: 'KA-MY',
          order: 1,
          day_number: 1,
          rationale: 'Iconic historic palace',
          entry_fee_min_inr: 100,
          entry_fee_max_inr: 100,
          currency_code: 'INR',
          access_status: 'open_reported',
          is_offbeat: false,
        },
      ],
    },
  };

  describe('normalizeSavedTrip', () => {
    it('normalizes a valid trip without losing data', () => {
      const normalized = normalizeSavedTrip(validSampleTrip);
      expect(normalized).not.toBeNull();
      expect(normalized?.id).toBe('guest-trip-101');
      expect(normalized?.title).toBe('Weekend in Mysuru');
      expect(normalized?.sync_status).toBe('local_only');
    });

    it('returns null if input is not an object or lacks a plan', () => {
      expect(normalizeSavedTrip(null)).toBeNull();
      expect(normalizeSavedTrip('invalid-string')).toBeNull();
      expect(normalizeSavedTrip({ id: '123', title: 'No Plan' })).toBeNull();
    });

    it('assigns fallback values for missing optional fields', () => {
      const minimalRaw = {
        plan: {
          items: [{ id: 'stop-1', name: 'Kabini' }],
        },
      };
      const normalized = normalizeSavedTrip(minimalRaw);
      expect(normalized).not.toBeNull();
      expect(normalized?.id).toMatch(/^guest-/);
      expect(normalized?.title).toBe('Untitled Karnataka Trip');
      expect(normalized?.request.origin_label).toBe('Bengaluru');
      expect(normalized?.request.pace).toBe('balanced');
      expect(normalized?.plan.duration_days).toBe(1);
    });
  });

  describe('loadGuestTrips with corrupt-record isolation', () => {
    it('returns empty array when nothing stored', () => {
      expect(loadGuestTrips()).toEqual([]);
    });

    it('returns empty array gracefully on invalid top-level JSON without crashing', () => {
      localStorage.setItem(GUEST_STORAGE_KEY, '{ invalid json string');
      expect(loadGuestTrips()).toEqual([]);
    });

    it('filters out corrupted records and preserves valid ones', () => {
      const mixed = [
        validSampleTrip,
        { id: 'corrupt-1' }, // Missing plan -> will be skipped
        null,
        {
          ...validSampleTrip,
          id: 'guest-trip-102',
          title: 'Coorg Coffee Trails',
        },
      ];
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(mixed));

      const loaded = loadGuestTrips();
      expect(loaded.length).toBe(2);
      expect(loaded[0].id).toBe('guest-trip-101');
      expect(loaded[1].id).toBe('guest-trip-102');
    });
  });

  describe('saveGuestTrip with stable identity and quota handling', () => {
    it('prepends a new trip when ID is new', () => {
      const res = saveGuestTrip(validSampleTrip);
      expect(res.success).toBe(true);
      const loaded = loadGuestTrips();
      expect(loaded.length).toBe(1);
      expect(loaded[0].title).toBe('Weekend in Mysuru');
    });

    it('updates an existing trip in-place preserving its stable identity', () => {
      saveGuestTrip(validSampleTrip);

      const modified: SavedTrip = {
        ...validSampleTrip,
        title: 'Updated Mysuru & Srirangapatna Heritage',
      };
      const res = saveGuestTrip(modified);
      expect(res.success).toBe(true);

      const loaded = loadGuestTrips();
      expect(loaded.length).toBe(1);
      expect(loaded[0].id).toBe('guest-trip-101');
      expect(loaded[0].title).toBe('Updated Mysuru & Srirangapatna Heritage');
    });

    it('detects QuotaExceededError and returns structured quota error', () => {
      const originalSetItem = localStorage.setItem;
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        const err = new DOMException('QuotaExceededError', 'QuotaExceededError');
        throw err;
      });

      const res = saveGuestTrip(validSampleTrip);
      expect(res.success).toBe(false);
      expect(res.error).toBe('quota_exceeded');
      expect(res.message).toContain('Storage quota exceeded');

      Storage.prototype.setItem = originalSetItem;
    });
  });

  describe('deleteGuestTrip & updateGuestTripSyncStatus', () => {
    it('deletes trip by ID', () => {
      saveGuestTrip(validSampleTrip);
      expect(loadGuestTrips().length).toBe(1);

      deleteGuestTrip('guest-trip-101');
      expect(loadGuestTrips().length).toBe(0);
    });

    it('updates sync status and links cloud_trip_id', () => {
      saveGuestTrip(validSampleTrip);

      updateGuestTripSyncStatus('guest-trip-101', 'synced', 'cloud-uuid-999');
      const loaded = loadGuestTrips();
      expect(loaded[0].sync_status).toBe('synced');
      expect(loaded[0].cloud_trip_id).toBe('cloud-uuid-999');
      expect(loaded[0].last_synced_at).toBeDefined();
    });
  });
});
