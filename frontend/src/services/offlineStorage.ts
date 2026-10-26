/**
 * Offline Storage Service
 * Provides client-side caching of the public destination catalogue and saved trips
 * for resilient travel discovery in areas with limited or no internet connectivity.
 */

import { DestinationRead, DestinationFilterParams, SavedTrip } from '../types';

const OFFLINE_DESTINATIONS_KEY = 'nk_offline_destinations_v2';
const OFFLINE_FRESHNESS_KEY = 'nk_offline_freshness_v2';
const LEGACY_DESTINATIONS_KEY = 'nk_offline_destinations_v1';
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
    // Clean legacy v1 cache to prevent stale broken media records
    localStorage.removeItem(LEGACY_DESTINATIONS_KEY);
    localStorage.removeItem('nk_offline_freshness_v1');
  } catch {
    // Gracefully handle storage quota exceeded
  }
}

export function getOfflineDestinations(): DestinationRead[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    // Check v2 first
    let raw = localStorage.getItem(OFFLINE_DESTINATIONS_KEY);
    if (!raw) {
      // Check legacy v1 and clean if needed
      const legacyRaw = localStorage.getItem(LEGACY_DESTINATIONS_KEY);
      if (legacyRaw && !legacyRaw.includes('thumb.wikimedia.org')) {
        raw = legacyRaw;
      } else {
        localStorage.removeItem(LEGACY_DESTINATIONS_KEY);
      }
    }
    if (!raw) return [];
    const items = JSON.parse(raw) as DestinationRead[];
    // Self-heal any legacy thumb.wikimedia.org URLs in memory
    return items.map((dest) => {
      const cleanImg = dest.primary_image_url
        ? dest.primary_image_url.replace('thumb.wikimedia.org', 'upload.wikimedia.org').split('?')[0]
        : dest.primary_image_url;
      const cleanMedia = dest.media?.map((m) => ({
        ...m,
        url: m.url ? m.url.replace('thumb.wikimedia.org', 'upload.wikimedia.org').split('?')[0] : m.url,
        thumbnail_url: m.thumbnail_url
          ? m.thumbnail_url.replace('thumb.wikimedia.org', 'upload.wikimedia.org').split('?')[0]
          : undefined,
      }));
      return {
        ...dest,
        primary_image_url: cleanImg,
        media: cleanMedia,
      };
    });
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
