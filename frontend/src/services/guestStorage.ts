/**
 * Guest Trip Storage Service
 * Hardened local persistence for guest itineraries in Namma Karnataka.
 * Provides corrupt-record isolation, stable identity management,
 * legacy schema migration, and quota error detection.
 */

import { SavedTrip, PlanningRequest, PlanningRecommendationResponse } from '../types';

export const GUEST_STORAGE_KEY = 'nk_saved_trips';
export const STORAGE_VERSION_KEY = 'nk_saved_trips_schema_v';
export const CURRENT_STORAGE_VERSION = 1;

export interface StorageWriteResult {
  success: boolean;
  error?: 'quota_exceeded' | 'storage_unavailable' | 'unknown';
  message?: string;
}

/**
 * Normalizes and validates any arbitrary saved trip object.
 * Returns null if the record cannot be safely salvaged.
 */
export function normalizeSavedTrip(raw: unknown): SavedTrip | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const candidate = raw as Record<string, unknown>;

  // Must have a usable id or create a stable one
  let id = typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id.trim() : null;
  if (!id) {
    id = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  // Must have a title or default
  const title =
    typeof candidate.title === 'string' && candidate.title.trim()
      ? candidate.title.trim()
      : 'Untitled Karnataka Trip';

  // Saved timestamp
  const saved_at =
    typeof candidate.saved_at === 'string' && !isNaN(Date.parse(candidate.saved_at))
      ? candidate.saved_at
      : new Date().toISOString();

  // Validate or build minimal fallback for plan
  if (!candidate.plan || typeof candidate.plan !== 'object') {
    return null; // Cannot salvage without itinerary plan
  }

  const rawPlan = candidate.plan as Record<string, unknown>;
  const items = Array.isArray(rawPlan.items) ? (rawPlan.items as any[]) : [];
  const duration_days =
    typeof rawPlan.duration_days === 'number' && rawPlan.duration_days > 0
      ? rawPlan.duration_days
      : Math.max(1, Math.ceil(items.length / 3));

  const plan: PlanningRecommendationResponse = {
    request_id: typeof rawPlan.request_id === 'string' ? rawPlan.request_id : undefined,
    language: (rawPlan.language as any) || 'en',
    generation_mode: (rawPlan.generation_mode as 'ai' | 'fallback') || 'fallback',
    provider_used: typeof rawPlan.provider_used === 'string' ? rawPlan.provider_used : 'deterministic',
    duration_days,
    items,
    total_destinations: typeof rawPlan.total_destinations === 'number' ? rawPlan.total_destinations : items.length,
    days: Array.isArray(rawPlan.days) ? (rawPlan.days as any[]) : undefined,
    budget_breakdown: rawPlan.budget_breakdown as any,
    assumptions: Array.isArray(rawPlan.assumptions) ? (rawPlan.assumptions as string[]) : undefined,
    data_limitations: Array.isArray(rawPlan.data_limitations) ? (rawPlan.data_limitations as string[]) : [],
    warnings: Array.isArray(rawPlan.warnings) ? (rawPlan.warnings as string[]) : [],
  };

  // Validate or build minimal request fallback
  const rawReq = (candidate.request && typeof candidate.request === 'object'
    ? candidate.request
    : {}) as Record<string, unknown>;

  const request: PlanningRequest = {
    language: (rawReq.language as any) || 'en',
    origin_label: typeof rawReq.origin_label === 'string' ? rawReq.origin_label : 'Bengaluru',
    duration_days: typeof rawReq.duration_days === 'number' ? rawReq.duration_days : duration_days,
    pace: (['relaxed', 'balanced', 'packed'].includes(rawReq.pace as string)
      ? rawReq.pace
      : 'balanced') as 'relaxed' | 'balanced' | 'packed',
    is_offbeat_preferred: Boolean(rawReq.is_offbeat_preferred),
    preferred_districts: Array.isArray(rawReq.preferred_districts) ? (rawReq.preferred_districts as string[]) : undefined,
  };

  const sync_status = (['local_only', 'pending_sync', 'synced', 'conflict', 'failed'].includes(
    candidate.sync_status as string
  )
    ? candidate.sync_status
    : 'local_only') as SavedTrip['sync_status'];

  const cloud_trip_id =
    typeof candidate.cloud_trip_id === 'string' && candidate.cloud_trip_id.trim()
      ? candidate.cloud_trip_id.trim()
      : undefined;

  const last_synced_at =
    typeof candidate.last_synced_at === 'string' ? candidate.last_synced_at : undefined;

  const version = typeof candidate.version === 'number' ? candidate.version : 1;

  return {
    id,
    title,
    saved_at,
    request,
    plan,
    cloud_trip_id,
    sync_status,
    last_synced_at,
    version,
  };
}

/**
 * Loads all guest trips from localStorage with corrupt-record isolation.
 * If one trip is malformed, it is skipped while preserving all valid trips.
 */
export function loadGuestTrips(): SavedTrip[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.warn('[guestStorage] Corrupted JSON in localStorage. Retaining raw value without crash.');
      return [];
    }

    if (!Array.isArray(parsed)) {
      console.warn('[guestStorage] Stored trips is not an array.');
      return [];
    }

    const validTrips: SavedTrip[] = [];
    let hadCorruptedRecord = false;

    for (const item of parsed) {
      const normalized = normalizeSavedTrip(item);
      if (normalized) {
        validTrips.push(normalized);
      } else {
        hadCorruptedRecord = true;
      }
    }

    // If corrupted records were dropped, save the cleaned array to prevent ongoing issues
    if (hadCorruptedRecord && validTrips.length > 0) {
      try {
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(validTrips));
      } catch {
        // Ignore write failure here
      }
    }

    return validTrips;
  } catch {
    return [];
  }
}

/**
 * Persists an array of guest trips to localStorage.
 * Handles storage quota exceeded and unavailable storage.
 */
export function persistGuestTrips(trips: SavedTrip[]): StorageWriteResult {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      success: false,
      error: 'storage_unavailable',
      message: 'Browser localStorage is not available.',
    };
  }

  try {
    const serialized = JSON.stringify(trips);
    localStorage.setItem(GUEST_STORAGE_KEY, serialized);
    localStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_STORAGE_VERSION));
    return { success: true };
  } catch (err: unknown) {
    const isQuota =
      err instanceof DOMException &&
      (err.code === 22 ||
        err.code === 1014 ||
        err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED');

    return {
      success: false,
      error: isQuota ? 'quota_exceeded' : 'unknown',
      message: isQuota
        ? 'Storage quota exceeded. Please remove older trips to save new itineraries.'
        : 'Failed to write to local device storage.',
    };
  }
}

/**
 * Saves or updates a single guest trip.
 * Preserves identity: if `trip.id` exists, updates the record in-place.
 * Otherwise, prepends the new trip.
 */
export function saveGuestTrip(trip: SavedTrip): StorageWriteResult {
  const normalized = normalizeSavedTrip(trip);
  if (!normalized) {
    return {
      success: false,
      error: 'unknown',
      message: 'Trip record failed normalization and cannot be saved.',
    };
  }

  const existing = loadGuestTrips();
  const existingIdx = existing.findIndex((t) => t.id === normalized.id);

  let updatedList: SavedTrip[];
  if (existingIdx >= 0) {
    updatedList = [...existing];
    updatedList[existingIdx] = normalized;
  } else {
    updatedList = [normalized, ...existing];
  }

  return persistGuestTrips(updatedList);
}

/**
 * Deletes a guest trip by ID from local storage.
 */
export function deleteGuestTrip(tripId: string): StorageWriteResult {
  const existing = loadGuestTrips();
  const filtered = existing.filter((t) => t.id !== tripId);
  return persistGuestTrips(filtered);
}

/**
 * Updates synchronization metadata on a local trip (e.g. after cloud import or sync).
 */
export function updateGuestTripSyncStatus(
  tripId: string,
  status: SavedTrip['sync_status'],
  cloudTripId?: string
): StorageWriteResult {
  const existing = loadGuestTrips();
  const idx = existing.findIndex((t) => t.id === tripId);
  if (idx === -1) {
    return { success: false, error: 'unknown', message: 'Trip not found.' };
  }

  const updated = [...existing];
  updated[idx] = {
    ...updated[idx],
    sync_status: status,
    cloud_trip_id: cloudTripId ?? updated[idx].cloud_trip_id,
    last_synced_at: new Date().toISOString(),
  };

  return persistGuestTrips(updated);
}
