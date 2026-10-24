import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkHealth,
  checkReadiness,
  fetchApi,
  ApiClientError,
  listDestinations,
  getDestination,
  generatePlanningRecommendations,
  listCloudTrips,
  getCloudTrip,
  saveCloudTrip,
  deleteCloudTrip,
  fetchTransitStopsNear,
  fetchTransitJourneys,
  compareTransitAndRoad,
} from './api';
import { getSavedLanguage, saveLanguage, translations } from './i18n';
import { PlanningRequest } from '../types';

describe('Central API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('successfully fetches and returns typed health data', async () => {
    const mockData = {
      status: 'ok',
      service: 'namma-karnataka-api',
      version: '0.1.0',
      environment: 'development',
      timestamp: '2026-10-23T00:00:00Z',
    };

    const mockResponse = new Response(JSON.stringify(mockData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': 'req-test-1234',
      },
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    const result = await checkHealth();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('namma-karnataka-api');
    expect(result.version).toBe('0.1.0');
  });

  it('successfully fetches and returns readiness data', async () => {
    const mockData = {
      status: 'ready',
      service: 'namma-karnataka-api',
      ready: true,
      checks: { configuration: 'valid', runtime: 'ready' },
      timestamp: '2026-10-23T00:00:00Z',
    };

    const mockResponse = new Response(JSON.stringify(mockData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    const result = await checkReadiness();
    expect(result.status).toBe('ready');
    expect(result.ready).toBe(true);
    expect(result.checks.configuration).toBe('valid');
  });

  it('parses structured JSON error envelope on HTTP 422', async () => {
    const errorPayload = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid duration specified',
        request_id: 'req-val-fail-001',
        details: [{ location: 'body -> duration', message: 'Must be between 1 and 7', type: 'value_error' }],
      },
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(errorPayload), {
          status: 422,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': 'req-val-fail-001',
          },
        })
      )
    );

    await expect(fetchApi('/dummy')).rejects.toThrow(ApiClientError);

    try {
      await fetchApi('/dummy');
    } catch (err) {
      const apiErr = err as ApiClientError;
      expect(apiErr.status).toBe(422);
      expect(apiErr.code).toBe('VALIDATION_ERROR');
      expect(apiErr.message).toBe('Invalid duration specified');
      expect(apiErr.requestId).toBe('req-val-fail-001');
      expect(apiErr.details).toHaveLength(1);
    }
  });

  it('handles non-JSON error responses safely without syntax errors', async () => {
    const mockResponse = new Response('<html><body>502 Bad Gateway</body></html>', {
      status: 502,
      headers: { 'Content-Type': 'text/html' },
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    try {
      await fetchApi('/destinations');
    } catch (err) {
      const apiErr = err as ApiClientError;
      expect(apiErr.status).toBe(502);
      expect(apiErr.code).toBe('HTTP_502');
      expect(apiErr.message).toContain('502');
    }
  });

  it('correctly constructs query string for listDestinations', async () => {
    const mockData = {
      items: [],
      total: 0,
      limit: 10,
      offset: 0,
      has_more: false,
    };

    let requestedUrl = '';
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      requestedUrl = input.toString();
      return Promise.resolve(
        new Response(JSON.stringify(mockData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    await listDestinations({
      q: 'palace',
      district: 'KA-MYS',
      category: 'heritage',
      is_offbeat: true,
      lang: 'kn',
      limit: 10,
      offset: 0,
    });

    expect(requestedUrl).toContain('q=palace');
    expect(requestedUrl).toContain('district=KA-MYS');
    expect(requestedUrl).toContain('category=heritage');
    expect(requestedUrl).toContain('is_offbeat=true');
    expect(requestedUrl).toContain('lang=kn');
  });

  it('fetches single destination by slug with getDestination', async () => {
    const mockDest = {
      id: '00000000-0000-0000-0000-000000000001',
      slug: 'bangalore-palace',
      name_en: 'Bangalore Palace',
      category: 'heritage',
      district_code: 'KA-BLU',
      currency_code: 'INR',
    };

    let requestedUrl = '';
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      requestedUrl = input.toString();
      return Promise.resolve(
        new Response(JSON.stringify(mockDest), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    const dest = await getDestination('bangalore-palace');
    expect(dest.slug).toBe('bangalore-palace');
    expect(requestedUrl).toContain('/destinations/bangalore-palace');
  });

  it('submits planning request payload with generatePlanningRecommendations', async () => {
    const mockPlan = {
      generation_mode: 'ai',
      provider_used: 'groq',
      items: [],
      total_destinations: 0,
      duration_days: 2,
    };

    let requestBody = '';
    vi.spyOn(globalThis, 'fetch').mockImplementation((_, init) => {
      requestBody = (init?.body as string) || '';
      return Promise.resolve(
        new Response(JSON.stringify(mockPlan), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    const planReq: PlanningRequest = {
      language: 'en',
      origin_label: 'Bengaluru',
      duration_days: 2,
      pace: 'relaxed',
      is_offbeat_preferred: true,
      categories: ['heritage'],
    };

    const res = await generatePlanningRecommendations(planReq);
    expect(res.generation_mode).toBe('ai');
    expect(res.provider_used).toBe('groq');
    const parsed = JSON.parse(requestBody);
    expect(parsed.duration_days).toBe(2);
    expect(parsed.pace).toBe('relaxed');
    expect(parsed.is_offbeat_preferred).toBe(true);
  });

  it('performs authenticated cloud trips CRUD operations', async () => {
    let capturedHeaders: Headers | undefined;
    let capturedMethod = '';

    vi.spyOn(globalThis, 'fetch').mockImplementation((_, init) => {
      capturedHeaders = new Headers(init?.headers);
      capturedMethod = init?.method || 'GET';
      return Promise.resolve(
        new Response(
          JSON.stringify({
            items: [
              {
                id: 'trip-101',
                title: 'Mysuru Heritage Trip',
                origin_label: 'Bengaluru',
                duration_days: 2,
                pace: 'balanced',
                currency_code: 'INR',
                total_stops: 3,
                created_at: '2026-10-23T00:00:00Z',
                updated_at: '2026-10-23T00:00:00Z',
              },
            ],
            total: 1,
            limit: 20,
            offset: 0,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
    });

    const listRes = await listCloudTrips('test-jwt-token');
    expect(listRes.items).toHaveLength(1);
    expect(listRes.items[0].id).toBe('trip-101');
    expect(capturedHeaders?.get('Authorization')).toBe('Bearer test-jwt-token');
    expect(capturedMethod).toBe('GET');

    // Test deleteCloudTrip
    vi.spyOn(globalThis, 'fetch').mockImplementation((_, init) => {
      capturedMethod = init?.method || 'GET';
      return Promise.resolve(
        new Response(JSON.stringify({ success: true, id: 'trip-101' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    const delRes = await deleteCloudTrip('trip-101', 'test-jwt-token');
    expect(delRes.success).toBe(true);
    expect(delRes.id).toBe('trip-101');
    expect(capturedMethod).toBe('DELETE');

    // Test getCloudTrip
    vi.spyOn(globalThis, 'fetch').mockImplementation((_, init) => {
      capturedMethod = init?.method || 'GET';
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: 'trip-101',
            user_id: 'usr-1',
            title: 'Mysuru Heritage Trip',
            origin_label: 'Bengaluru',
            duration_days: 2,
            pace: 'balanced',
            is_offbeat_preferred: false,
            preferences: {},
            currency_code: 'INR',
            status: 'active',
            snapshot: {
              language: 'en',
              generation_mode: 'fallback',
              provider_used: 'deterministic_fallback',
              items: [],
              total_destinations: 0,
              duration_days: 2,
            },
            created_at: '2026-10-23T00:00:00Z',
            updated_at: '2026-10-23T00:00:00Z',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
    });

    const detailRes = await getCloudTrip('trip-101', 'test-jwt-token');
    expect(detailRes.id).toBe('trip-101');
    expect(detailRes.title).toBe('Mysuru Heritage Trip');

    // Test saveCloudTrip
    vi.spyOn(globalThis, 'fetch').mockImplementation((_, init) => {
      capturedMethod = init?.method || 'POST';
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: 'trip-102',
            user_id: 'usr-1',
            title: 'Hampi Ancient Marvels',
            origin_label: 'Hosapete',
            duration_days: 3,
            pace: 'relaxed',
            is_offbeat_preferred: true,
            preferences: {},
            currency_code: 'INR',
            status: 'active',
            snapshot: {
              language: 'en',
              generation_mode: 'ai',
              provider_used: 'gemini',
              items: [],
              total_destinations: 0,
              duration_days: 3,
            },
            created_at: '2026-10-23T00:00:00Z',
            updated_at: '2026-10-23T00:00:00Z',
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        )
      );
    });

    const saveRes = await saveCloudTrip(
      {
        title: 'Hampi Ancient Marvels',
        origin_label: 'Hosapete',
        duration_days: 3,
        pace: 'relaxed',
        itinerary: {
          language: 'en',
          generation_mode: 'ai',
          provider_used: 'gemini',
          items: [],
          total_destinations: 0,
          duration_days: 3,
        },
      },
      'test-jwt-token'
    );
    expect(saveRes.id).toBe('trip-102');
    expect(capturedMethod).toBe('POST');
  });

  it('fetches nearby transit stops and parses parameters correctly', async () => {
    let capturedUrl = '';
    vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
      capturedUrl = input.toString();
      return Promise.resolve(
        new Response(
          JSON.stringify([
            {
              stop_id: 'stop-blr-majestic',
              name_en: 'Kempegowda Bus Station',
              name_kn: 'ಕೆಂಪೇಗೌಡ ಬಸ್ ನಿಲ್ದಾಣ',
              district_code: 'KA-BLRU',
              station_type: 'bus_terminal',
              latitude: 12.9778,
              longitude: 77.5713,
              operator: 'KSRTC / BMTC',
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
    });

    const stops = await fetchTransitStopsNear(12.9778, 77.5713, 15.0, 5);
    expect(stops).toHaveLength(1);
    expect(stops[0].stop_id).toBe('stop-blr-majestic');
    expect(capturedUrl).toContain('/transit/stops?lat=12.9778&lon=77.5713&radius_km=15&limit=5');
  });

  it('fetches scheduled transit journeys between origin and destination coordinates', async () => {
    let capturedUrl = '';
    vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
      capturedUrl = input.toString();
      return Promise.resolve(
        new Response(
          JSON.stringify([
            {
              journey_id: 'journey-1',
              origin_label: 'Kempegowda Bus Station',
              destination_label: 'Mysuru Suburban Bus Stand',
              total_duration_minutes: 195,
              transfers_count: 0,
              legs: [],
              total_fare_min_inr: 210,
              total_fare_max_inr: 360,
              fare_status: 'verified',
              calculation_basis: 'Direct KSRTC scheduled service',
              operator_name: 'KSRTC',
              feed_version: 'ksrtc_bmtc_swr_static_2026_v1',
              disclaimer: 'Static scheduled transit data.',
              is_realtime: false,
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
    });

    const journeys = await fetchTransitJourneys(12.9716, 77.5946, 12.2958, 76.6394, '07:30', 2);
    expect(journeys).toHaveLength(1);
    expect(journeys[0].operator_name).toBe('KSRTC');
    expect(capturedUrl).toContain('/transit/journeys?origin_lat=12.9716&origin_lon=77.5946&dest_lat=12.2958&dest_lon=76.6394&departure_time=07%3A30&max_transfers=2');
  });

  it('compares road and public transit alternatives with honest disclosures', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            origin_lat: 12.9716,
            origin_lon: 77.5946,
            dest_lat: 12.2958,
            dest_lon: 76.6394,
            road_distance_km: 142.5,
            road_duration_minutes: 175,
            road_method: 'terrain_adjusted_estimate',
            road_estimated_cab_cost_inr: 2565,
            transit_available: true,
            transit_options: [
              {
                journey_id: 'journey-1',
                origin_label: 'Kempegowda Bus Station',
                destination_label: 'Mysuru Suburban Bus Stand',
                total_duration_minutes: 195,
                transfers_count: 0,
                legs: [],
                total_fare_min_inr: 210,
                total_fare_max_inr: 360,
                fare_status: 'verified',
                calculation_basis: 'Direct KSRTC scheduled service (KSRTC-BLR-MYS-EXP)',
                operator_name: 'KSRTC Airavat / Rajahamsa',
                feed_version: 'ksrtc_bmtc_swr_static_2026_v1',
                disclaimer: 'Static scheduled transit data.',
                is_realtime: false,
              },
            ],
            carbon_comparison_note_en: 'Taking public transit reduces carbon emissions by ~70%.',
            carbon_comparison_note_kn: 'ಸಾರ್ವಜನಿಕ ಸಾರಿಗೆ ಬಳಕೆಯು ಇಂಗಾಲದ ಹೊರಸೂಸುವಿಕೆಯನ್ನು ಗಣನೀಯವಾಗಿ ಕಡಿಮೆ ಮಾಡುತ್ತದೆ.',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );

    const comp = await compareTransitAndRoad(12.9716, 77.5946, 12.2958, 76.6394);
    expect(comp.transit_available).toBe(true);
    expect(comp.road_distance_km).toBe(142.5);
    expect(comp.transit_options[0].is_realtime).toBe(false);
    expect(comp.transit_options[0].total_fare_min_inr).toBe(210);
  });
});

describe('Bilingual i18n module', () => {
  it('saves and retrieves language preference from localStorage', () => {
    saveLanguage('kn');
    expect(getSavedLanguage()).toBe('kn');
    saveLanguage('en');
    expect(getSavedLanguage()).toBe('en');
  });

  it('has consistent keys across English and Kannada dictionaries', () => {
    const enKeys = Object.keys(translations.en).sort();
    const knKeys = Object.keys(translations.kn).sort();
    expect(knKeys).toEqual(enKeys);
  });
});
