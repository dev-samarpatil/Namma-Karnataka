/**
 * Central API Client for Namma Karnataka.
 * Provides typed HTTP communication, timeout handling, and normalized error management.
 */

import {
  DestinationFilterParams,
  DestinationListResponse,
  DestinationRead,
  DestinationNearbyResponse,
  PlanningRequest,
  PlanningRecommendationResponse,
  SaveCloudTripPayload,
  UpdateCloudTripPayload,
  SavedTripDetail,
  CloudTripListResponse,
  TripShareInfo,
  TripShareListResponse,
  SharedTripDetail,
  UpdateSharedTripRequest,
  TripAuditHistoryResponse,
  RestaurantRead,
  AccommodationRead,
  TransitStop,
  TransitJourneyOption,
  TransitComparison,
  DayPlan,
  DestinationCategory,
  StopRegenerateResponse,
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
    if (params.fee_type) queryParts.push(`fee_type=${encodeURIComponent(params.fee_type)}`);
    if (params.min_duration !== undefined) queryParts.push(`min_duration=${params.min_duration}`);
    if (params.max_duration !== undefined) queryParts.push(`max_duration=${params.max_duration}`);
    if (params.sort_by) queryParts.push(`sort_by=${encodeURIComponent(params.sort_by)}`);
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

/**
 * Deterministically recalculate itinerary schedule, transit times, and budget.
 */
export async function recalculateItinerary(
  request: PlanningRequest,
  days: DayPlan[],
  signal?: AbortSignal
): Promise<PlanningRecommendationResponse> {
  return fetchApi<PlanningRecommendationResponse>(
    '/planning/recalculate',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request, days }),
      signal,
    },
    PLANNING_TIMEOUT_MS
  );
}

/**
 * Propose grounded alternative destinations for an individual stop.
 */
export async function getStopAlternatives(
  dayNumber: number,
  stopId: string,
  currentPlan: PlanningRecommendationResponse,
  request: PlanningRequest,
  preferredCategory?: DestinationCategory,
  signal?: AbortSignal
): Promise<StopRegenerateResponse> {
  return fetchApi<StopRegenerateResponse>(
    '/planning/regenerate-stop',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        day_number: dayNumber,
        stop_id: stopId,
        preferred_category: preferredCategory,
        request,
        current_plan: currentPlan,
      }),
      signal,
    },
    PLANNING_TIMEOUT_MS
  );
}

/**
 * Regenerate attractions for a single day while preserving locked stops and other days.
 */
export async function regenerateDay(
  dayNumber: number,
  currentPlan: PlanningRecommendationResponse,
  request: PlanningRequest,
  signal?: AbortSignal
): Promise<PlanningRecommendationResponse> {
  return fetchApi<PlanningRecommendationResponse>(
    '/planning/regenerate-day',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        day_number: dayNumber,
        request,
        current_plan: currentPlan,
      }),
      signal,
    },
    PLANNING_TIMEOUT_MS
  );
}

/**
 * List the current authenticated user's cloud-persisted trips.
 */
export async function listCloudTrips(
  token: string,
  signal?: AbortSignal
): Promise<CloudTripListResponse> {
  return fetchApi<CloudTripListResponse>('/trips', {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

/**
 * Retrieve a specific cloud-persisted trip by ID, enforcing user ownership.
 */
export async function getCloudTrip(
  tripId: string,
  token: string,
  signal?: AbortSignal
): Promise<SavedTripDetail> {
  return fetchApi<SavedTripDetail>(`/trips/${encodeURIComponent(tripId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

/**
 * Save an itinerary to cloud persistence for the authenticated user.
 */
export async function saveCloudTrip(
  payload: SaveCloudTripPayload,
  token: string,
  signal?: AbortSignal
): Promise<SavedTripDetail> {
  return fetchApi<SavedTripDetail>('/trips', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  });
}

/**
 * Update an existing cloud-persisted trip by ID for the authenticated user.
 */
export async function updateCloudTrip(
  tripId: string,
  payload: UpdateCloudTripPayload,
  token: string,
  signal?: AbortSignal
): Promise<SavedTripDetail> {
  return fetchApi<SavedTripDetail>(`/trips/${encodeURIComponent(tripId)}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  });
}

/**
 * Delete a cloud-persisted trip by ID for the authenticated user.
 */
export async function deleteCloudTrip(
  tripId: string,
  token: string,
  signal?: AbortSignal
): Promise<{ success: boolean; id: string }> {
  return fetchApi<{ success: boolean; id: string }>(`/trips/${encodeURIComponent(tripId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

/**
 * Search verified restaurants near coordinates.
 */
export async function fetchRestaurantsNear(
  lat: number,
  lon: number,
  radiusKm: number = 25.0,
  cuisine?: string,
  isVegetarian?: boolean,
  signal?: AbortSignal
): Promise<RestaurantRead[]> {
  const query = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    radius_km: radiusKm.toString(),
  });
  if (cuisine) query.set('cuisine', cuisine);
  if (isVegetarian !== undefined) query.set('is_vegetarian', String(isVegetarian));

  return fetchApi<RestaurantRead[]>(`/places/restaurants?${query.toString()}`, { signal });
}

/**
 * Search verified accommodations near coordinates.
 */
export async function fetchAccommodationsNear(
  lat: number,
  lon: number,
  radiusKm: number = 40.0,
  accommodationType?: string,
  signal?: AbortSignal
): Promise<AccommodationRead[]> {
  const query = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    radius_km: radiusKm.toString(),
  });
  if (accommodationType) query.set('accommodation_type', accommodationType);

  return fetchApi<AccommodationRead[]>(`/places/accommodations?${query.toString()}`, { signal });
}

/**
 * Discover verified public transit terminals near coordinates.
 */
export async function fetchTransitStopsNear(
  lat: number,
  lon: number,
  radiusKm: number = 25.0,
  limit: number = 10,
  signal?: AbortSignal
): Promise<TransitStop[]> {
  const query = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    radius_km: radiusKm.toString(),
    limit: limit.toString(),
  });
  return fetchApi<TransitStop[]>(`/transit/stops?${query.toString()}`, { signal });
}

/**
 * Find scheduled public transit journeys between points.
 */
export async function fetchTransitJourneys(
  originLat: number,
  originLon: number,
  destLat: number,
  destLon: number,
  departureTime: string = '08:00',
  maxTransfers: number = 2,
  signal?: AbortSignal
): Promise<TransitJourneyOption[]> {
  const query = new URLSearchParams({
    origin_lat: originLat.toString(),
    origin_lon: originLon.toString(),
    dest_lat: destLat.toString(),
    dest_lon: destLon.toString(),
    departure_time: departureTime,
    max_transfers: maxTransfers.toString(),
  });
  return fetchApi<TransitJourneyOption[]>(`/transit/journeys?${query.toString()}`, { signal });
}

/**
 * Compare road cab/car travel with public transit alternatives.
 */
export async function compareTransitAndRoad(
  originLat: number,
  originLon: number,
  destLat: number,
  destLon: number,
  departureTime: string = '08:00',
  signal?: AbortSignal
): Promise<TransitComparison> {
  const query = new URLSearchParams({
    origin_lat: originLat.toString(),
    origin_lon: originLon.toString(),
    dest_lat: destLat.toString(),
    dest_lon: destLon.toString(),
    departure_time: departureTime,
  });
  return fetchApi<TransitComparison>(`/transit/compare?${query.toString()}`, { signal });
}

/**
 * Retrieve nearby attractions, transit hubs, and places around a destination.
 */
export async function getDestinationNearby(
  idOrSlug: string,
  radiusKm: number = 30.0,
  signal?: AbortSignal
): Promise<DestinationNearbyResponse> {
  return fetchApi<DestinationNearbyResponse>(
    `/destinations/${encodeURIComponent(idOrSlug)}/nearby?radius_km=${radiusKm}`,
    { signal }
  );
}

/**
 * Create a secure viewer or editor share link for an owned trip.
 */
export async function createTripShare(
  tripId: string,
  role: 'viewer' | 'editor',
  expiresInDays: number = 30
): Promise<TripShareInfo> {
  return fetchApi<TripShareInfo>(`/trips/${encodeURIComponent(tripId)}/shares`, {
    method: 'POST',
    body: JSON.stringify({ role, expires_in_days: expiresInDays }),
  });
}

/**
 * List all share links for an owned trip.
 */
export async function listTripShares(tripId: string): Promise<TripShareListResponse> {
  return fetchApi<TripShareListResponse>(`/trips/${encodeURIComponent(tripId)}/shares`);
}

/**
 * Revoke an existing share link.
 */
export async function revokeTripShare(
  tripId: string,
  shareId: string
): Promise<{ revoked: boolean; share_id: string }> {
  return fetchApi<{ revoked: boolean; share_id: string }>(
    `/trips/${encodeURIComponent(tripId)}/shares/${encodeURIComponent(shareId)}`,
    { method: 'DELETE' }
  );
}

/**
 * Access a shared itinerary using a valid share token.
 */
export async function getSharedTrip(shareToken: string): Promise<SharedTripDetail> {
  return fetchApi<SharedTripDetail>(`/trips/shared/${encodeURIComponent(shareToken)}`);
}

/**
 * Update a shared itinerary as an authorized collaborator under optimistic concurrency.
 */
export async function updateSharedTrip(
  shareToken: string,
  request: UpdateSharedTripRequest
): Promise<SharedTripDetail> {
  return fetchApi<SharedTripDetail>(`/trips/shared/${encodeURIComponent(shareToken)}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  });
}

/**
 * Retrieve chronological change audit history for a trip.
 */
export async function getTripHistory(
  tripId: string,
  shareToken?: string
): Promise<TripAuditHistoryResponse> {
  const query = shareToken ? `?share_token=${encodeURIComponent(shareToken)}` : '';
  return fetchApi<TripAuditHistoryResponse>(`/trips/${encodeURIComponent(tripId)}/history${query}`);
}


