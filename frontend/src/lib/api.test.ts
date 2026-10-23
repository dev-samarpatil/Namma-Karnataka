import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkHealth, checkReadiness, fetchApi, ApiClientError } from './api';

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
      await fetchApi('/dummy');
      expect.fail('Should have thrown an ApiClientError');
    } catch (err) {
      const apiErr = err as ApiClientError;
      expect(apiErr.status).toBe(502);
      expect(apiErr.code).toBe('HTTP_502');
      expect(apiErr.message).toContain('502');
    }
  });

  it('handles complete network failure gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    try {
      await fetchApi('/health');
      expect.fail('Should have thrown an ApiClientError');
    } catch (err) {
      const apiErr = err as ApiClientError;
      expect(apiErr.status).toBe(0);
      expect(apiErr.code).toBe('NETWORK_ERROR');
      expect(apiErr.message).toBe('Failed to fetch');
    }
  });
});
