/**
 * Central API Client for Namma Karnataka.
 * Provides typed HTTP communication, timeout handling, and normalized error management.
 */

import {
  DestinationFilterParams,
  DestinationListResponse,
  DestinationRead,
  PlanningRequest,
  PlanningRecommendationResponse,
} from '../types';

export interface ErrorDetail {
  code: string;
  message: string;
  request_id?: string;
  details?: Array<{ location: string; message: string; type: string }>;
}

export interface ErrorEnvelope {
  error: ErrorDetail;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  environment: string;
  timestamp: string;
}

export interface ReadinessResponse {
  status: string;
  service: string;
  ready: boolean;
  checks: Record<string, string>;
  timestamp: string;
}

export class ApiClientError extends Error {
  code: string;
  status: number;
  requestId?: string;
  details?: Array<{ location: string; message: string; type: string }>;

  constructor(
    message: string,
    status: number,
    code: string = 'API_ERROR',
    requestId?: string,
    details?: Array<{ location: string; message: string; type: string }>
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

const DEFAULT_TIMEOUT_MS = 10000;
const PLANNING_TIMEOUT_MS = 32000; // Allows backend 28s monotonic deadline to complete

export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
}

/**
 * Core generic fetch wrapper with timeout and standardized error handling.
 */
export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers = new Headers(options.headers);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });

    const requestId = response.headers.get('X-Request-ID') || undefined;

    if (!response.ok) {
      let errorBody: ErrorEnvelope | null = null;
      try {
        errorBody = (await response.json()) as ErrorEnvelope;
      } catch {
        // Fallback for non-JSON error responses (e.g., 502/504 proxy errors)
      }

      if (errorBody?.error) {
        throw new ApiClientError(
          errorBody.error.message || `HTTP ${response.status}`,
          response.status,
          errorBody.error.code || 'HTTP_ERROR',
          errorBody.error.request_id || requestId,
          errorBody.error.details
        );
      }

      throw new ApiClientError(
        `Request failed with status ${response.status}`,
        response.status,
        `HTTP_${response.status}`,
        requestId
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiClientError(
        `Request to ${cleanEndpoint} timed out after ${timeoutMs}ms`,
        408,
        'TIMEOUT'
      );
    }

    throw new ApiClientError(
      error instanceof Error ? error.message : 'Network connection failed',
      0,
      'NETWORK_ERROR'
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Health check probe to test backend liveness.
 */
export async function checkHealth(): Promise<HealthResponse> {
  return fetchApi<HealthResponse>('/health');
}

/**
 * Readiness probe to test backend operational readiness.
 */
export async function checkReadiness(): Promise<ReadinessResponse> {
  return fetchApi<ReadinessResponse>('/ready');
}

/**
 * Retrieve curated destinations with optional keyword, category, district, and offbeat filtering.
 */
export async function listDestinations(
  params?: DestinationFilterParams,
  signal?: AbortSignal
): Promise<DestinationListResponse> {
  const queryParts: string[] = [];
  if (params) {
    if (params.q) queryParts.push(`q=${encodeURIComponent(params.q)}`);
    if (params.district) queryParts.push(`district=${encodeURIComponent(params.district)}`);
    if (params.category) queryParts.push(`category=${encodeURIComponent(params.category)}`);
    if (params.is_offbeat !== undefined) queryParts.push(`is_offbeat=${params.is_offbeat}`);
    if (params.lang) queryParts.push(`lang=${encodeURIComponent(params.lang)}`);
    if (params.limit !== undefined) queryParts.push(`limit=${params.limit}`);
    if (params.offset !== undefined) queryParts.push(`offset=${params.offset}`);
  }

  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  return fetchApi<DestinationListResponse>(`/destinations${queryString}`, { signal });
}

/**
 * Retrieve a single destination by stable UUID or URL slug.
 */
export async function getDestination(
  idOrSlug: string,
  signal?: AbortSignal
): Promise<DestinationRead> {
  return fetchApi<DestinationRead>(`/destinations/${encodeURIComponent(idOrSlug)}`, { signal });
}

/**
 * Request AI-orchestrated itinerary recommendations or deterministic fallback.
 */
export async function generatePlanningRecommendations(
  request: PlanningRequest,
  signal?: AbortSignal
): Promise<PlanningRecommendationResponse> {
  return fetchApi<PlanningRecommendationResponse>(
    '/planning/recommendations',
    {
      method: 'POST',
      body: JSON.stringify(request),
      signal,
    },
    PLANNING_TIMEOUT_MS
  );
}
