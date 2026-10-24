/**
 * Offline Storage Service
 * Provides client-side caching of the public destination catalogue and saved trips
 * for resilient travel discovery in areas with limited or no internet connectivity.
 */

import { DestinationRead, DestinationFilterParams, SavedTrip } from '../types';

const OFFLINE_DESTINATIONS_KEY = 'nk_offline_destinations_v1';
const OFFLINE_FRESHNESS_KEY = 'nk_offline_freshness_v1';
const SAVED_TRIPS_KEY = 'nk_saved_trips';

export interface OfflineCatalogueMetadata {
  cached_at: string;
  count: number;
  is_partial: boolean;
}

export function saveOfflineDestinations(destinations: DestinationRead[], isPartial = false): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    localStorage.setItem(OFFLINE_DESTINATIONS_KEY, JSON.stringify(destinations));
    const meta: OfflineCatalogueMetadata = {
      cached_at: new Date().toISOString(),
      count: destinations.length,
      is_partial: isPartial,
    };
    localStorage.setItem(OFFLINE_FRESHNESS_KEY, JSON.stringify(meta));
  } catch {
    // Gracefully handle storage quota exceeded
  }
}

export function getOfflineDestinations(): DestinationRead[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = localStorage.getItem(OFFLINE_DESTINATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getOfflineCatalogueMetadata(): OfflineCatalogueMetadata | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = localStorage.getItem(OFFLINE_FRESHNESS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function filterOfflineDestinations(
  items: DestinationRead[],
  params?: DestinationFilterParams
): DestinationRead[] {
  if (!params) return items;
  return items.filter((dest) => {
    if (params.district && dest.district_code !== params.district) {
      return false;
    }
    if (params.category && dest.category !== params.category) {
      return false;
    }
    if (params.is_offbeat && !dest.is_offbeat) {
      return false;
    }
    if (params.q) {
      const q = params.q.toLowerCase().trim();
      const matchEn = dest.name_en.toLowerCase().includes(q);
      const matchKn = dest.name_kn ? dest.name_kn.includes(q) : false;
      const matchSummary = dest.summary_en ? dest.summary_en.toLowerCase().includes(q) : false;
      if (!matchEn && !matchKn && !matchSummary) {
        return false;
      }
    }
    return true;
  });
}

export function getOfflineSavedTrips(): SavedTrip[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = localStorage.getItem(SAVED_TRIPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
