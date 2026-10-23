import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkHealth,
  checkReadiness,
  fetchApi,
  ApiClientError,
  listDestinations,
  getDestination,
  generatePlanningRecommendations,
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
