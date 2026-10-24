import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveOfflineDestinations,
  getOfflineDestinations,
  getOfflineCatalogueMetadata,
  filterOfflineDestinations,
  getOfflineSavedTrips,
} from './offlineStorage';
import { DestinationRead } from '../types';

const mockDestinations: DestinationRead[] = [
  {
    id: 'dest-1',
    slug: 'lalbagh-botanical-garden',
    name_en: 'Lalbagh Botanical Garden',
    name_kn: 'ಲಾಲ್‌ಬಾಗ್ ಸಸ್ಯತೋಟ',
    summary_en: 'Historical 240-acre botanical garden',
    category: 'nature',
    district_code: 'KA-BLRU',
    access_status: 'open_reported',
    verification_status: 'source_checked',
    content_status: 'verified',
    active: true,
    is_offbeat: false,
    currency_code: 'INR',
  },
  {
    id: 'dest-2',
    slug: 'chennakeshava-temple-belur',
    name_en: 'Chennakeshava Temple Belur',
    name_kn: 'ಚೆನ್ನಕೇಶವ ದೇವಾಲಯ ಬೇಲೂರು',
    summary_en: 'Hoysala masterpiece',
    category: 'heritage',
    district_code: 'KA-HAS',
    access_status: 'open_reported',
    verification_status: 'source_checked',
    content_status: 'verified',
    active: true,
    is_offbeat: false,
    currency_code: 'INR',
  },
  {
    id: 'dest-3',
    slug: 'yana-caves',
    name_en: 'Yana Rocks and Caves',
    name_kn: 'ಯಾಣದ ಬಂಡೆಗಳು ಮತ್ತು ಗುಹೆಗಳು',
    summary_en: 'Karst rock formations in Western Ghats',
    category: 'nature',
    district_code: 'KA-UKN',
    access_status: 'open_reported',
    verification_status: 'source_checked',
    content_status: 'verified',
    active: true,
    is_offbeat: true,
    currency_code: 'INR',
  },
];

describe('Offline Storage Service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and retrieves offline destinations', () => {
    saveOfflineDestinations(mockDestinations);
    const retrieved = getOfflineDestinations();
    expect(retrieved).toHaveLength(3);
    expect(retrieved[0].slug).toBe('lalbagh-botanical-garden');

    const meta = getOfflineCatalogueMetadata();
    expect(meta).not.toBeNull();
    expect(meta?.count).toBe(3);
    expect(meta?.is_partial).toBe(false);
  });

  it('filters offline destinations by district', () => {
    const results = filterOfflineDestinations(mockDestinations, { district: 'KA-HAS' });
    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe('chennakeshava-temple-belur');
  });

  it('filters offline destinations by offbeat status', () => {
    const results = filterOfflineDestinations(mockDestinations, { is_offbeat: true });
    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe('yana-caves');
  });

  it('filters offline destinations by search keyword in English and Kannada', () => {
    const resultsEn = filterOfflineDestinations(mockDestinations, { q: 'botanical' });
    expect(resultsEn).toHaveLength(1);
    expect(resultsEn[0].slug).toBe('lalbagh-botanical-garden');

    const resultsKn = filterOfflineDestinations(mockDestinations, { q: 'ಬೇಲೂರು' });
    expect(resultsKn).toHaveLength(1);
    expect(resultsKn[0].slug).toBe('chennakeshava-temple-belur');
  });

  it('gracefully returns empty list when no saved trips exist', () => {
    const trips = getOfflineSavedTrips();
    expect(trips).toEqual([]);
  });

  it('safely handles corrupted or malformed localStorage entries', () => {
    localStorage.setItem('nk_saved_trips', 'invalid-json{{{');
    const trips = getOfflineSavedTrips();
    expect(trips).toEqual([]);

    localStorage.setItem('nk_offline_destinations_v1', 'bad-data[');
    const dests = getOfflineDestinations();
    expect(dests).toEqual([]);
  });
});

