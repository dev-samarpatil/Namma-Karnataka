/**
 * Core Domain and API Types for Namma Karnataka Frontend.
 */

export type Language = 'en' | 'kn';

export type DestinationCategory =
  | 'nature'
  | 'waterfall'
  | 'hill_station'
  | 'viewpoint'
  | 'heritage'
  | 'architecture'
  | 'beach'
  | 'wildlife'
  | 'food_culture'
  | 'spiritual_cultural'
  | 'adventure'
  | 'museum'
  | 'town_city'
  | 'other';

export type AccessStatus =
  | 'open_reported'
  | 'restricted'
  | 'seasonal'
  | 'closed_reported'
  | 'unknown';

export type VerificationStatus =
  | 'human_reviewed'
  | 'source_checked'
  | 'needs_review'
  | 'stale'
  | 'unknown';

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface DistrictSummary {
  code: string;
  name_en: string;
  name_kn: string;
}

export interface DistrictOption {
  code: string;
  name_en: string;
  name_kn: string;
}

export const KARNATAKA_DISTRICTS: DistrictOption[] = [
  { code: 'KA-BLRU', name_en: 'Bengaluru Urban', name_kn: 'ಬೆಂಗಳೂರು ನಗರ' },
  { code: 'KA-BLRR', name_en: 'Bengaluru Rural', name_kn: 'ಬೆಂಗಳೂರು ಗ್ರಾಮಾಂತರ' },
  { code: 'KA-MYS', name_en: 'Mysuru', name_kn: 'ಮೈಸೂರು' },
  { code: 'KA-KOD', name_en: 'Kodagu (Coorg)', name_kn: 'ಕೊಡಗು' },
  { code: 'KA-CKM', name_en: 'Chikkamagaluru', name_kn: 'ಚಿಕ್ಕಮಗಳೂರು' },
  { code: 'KA-HAS', name_en: 'Hassan', name_kn: 'ಹಾಸನ' },
  { code: 'KA-SHI', name_en: 'Shivamogga', name_kn: 'ಶಿವಮೊಗ್ಗ' },
  { code: 'KA-UKN', name_en: 'Uttara Kannada (Gokarna)', name_kn: 'ಉತ್ತರ ಕನ್ನಡ (ಗೋಕರ್ಣ)' },
  { code: 'KA-UDP', name_en: 'Udupi', name_kn: 'ಉಡುಪಿ' },
  { code: 'KA-DKN', name_en: 'Dakshina Kannada (Mangaluru)', name_kn: 'ದಕ್ಷಿಣ ಕನ್ನಡ (ಮಂಗಳೂರು)' },
  { code: 'KA-VJN', name_en: 'Vijayanagara (Hampi)', name_kn: 'ವಿಜಯನಗರ (ಹಂಪಿ)' },
  { code: 'KA-BAL', name_en: 'Ballari', name_kn: 'ಬಳ್ಳಾರಿ' },
  { code: 'KA-BLG', name_en: 'Belagavi', name_kn: 'ಬೆಳಗಾವಿ' },
  { code: 'KA-DHW', name_en: 'Dharwad', name_kn: 'ಧಾರವಾಡ' },
  { code: 'KA-BAG', name_en: 'Bagalkote (Badami)', name_kn: 'ಬಾಗಲಕೋಟೆ (ಬಾದಾಮಿ)' },
  { code: 'KA-VIJ', name_en: 'Vijayapura', name_kn: 'ವಿಜಯಪುರ' },
  { code: 'KA-BID', name_en: 'Bidar', name_kn: 'ಬೀದರ್' },
  { code: 'KA-KAL', name_en: 'Kalaburagi', name_kn: 'ಕಲಬುರಗಿ' },
  { code: 'KA-RAI', name_en: 'Raichur', name_kn: 'ರಾಯಚೂರು' },
  { code: 'KA-KOP', name_en: 'Koppal', name_kn: 'ಕೊಪ್ಪಳ' },
  { code: 'KA-GAD', name_en: 'Gadag', name_kn: 'ಗದಗ' },
  { code: 'KA-HAV', name_en: 'Haveri', name_kn: 'ಹಾವೇರಿ' },
  { code: 'KA-DAV', name_en: 'Davanagere', name_kn: 'ದಾವಣಗೆರೆ' },
  { code: 'KA-CHI', name_en: 'Chitradurga', name_kn: 'ಚಿತ್ರದುರ್ಗ' },
  { code: 'KA-TUM', name_en: 'Tumakuru', name_kn: 'ತುಮಕೂರು' },
  { code: 'KA-MAN', name_en: 'Mandya', name_kn: 'ಮಂಡ್ಯ' },
  { code: 'KA-CHA', name_en: 'Chamarajanagar', name_kn: 'ಚಾಮರಾಜನಗರ' },
  { code: 'KA-RAM', name_en: 'Ramanagara', name_kn: 'ರಾಮನಗರ' },
  { code: 'KA-KOL', name_en: 'Kolar', name_kn: 'ಕೋಲಾರ' },
  { code: 'KA-CBL', name_en: 'Chikkaballapura', name_kn: 'ಚಿಕ್ಕಬಳ್ಳಾಪುರ' },
  { code: 'KA-YAD', name_en: 'Yadgir', name_kn: 'ಯಾದಗಿರಿ' },
];

export interface DestinationSource {
  source_type: string;
  title: string;
  url?: string;
}

export interface DestinationMedia {
  id: string;
  destination_id: string;
  url: string;
  thumbnail_url?: string;
  caption_en?: string;
  caption_kn?: string;
  alt_en?: string;
  alt_kn?: string;
  source_name: string;
  source_url?: string;
  license_type: string;
  attribution: string;
  is_primary: boolean;
  verification_status?: VerificationStatus | string;
}

export interface DestinationRead {
  id: string;
  slug: string;
  name_en: string;
  name_kn?: string;
  summary_en?: string;
  summary_kn?: string;
  description_en?: string;
  description_kn?: string;
  how_to_reach_en?: string;
  how_to_reach_kn?: string;
  accessibility_notes_en?: string;
  accessibility_notes_kn?: string;
  category: DestinationCategory;
  district_code: string;
  district?: DistrictSummary;
  coordinates?: Coordinates;
  access_status: AccessStatus;
  verification_status: VerificationStatus;
  content_status: string;
  active: boolean;
  is_offbeat: boolean;
  estimated_visit_minutes?: number;
  entry_fee_min_inr?: number;
  entry_fee_max_inr?: number;
  currency_code: string;
  sources?: DestinationSource[];
  media?: DestinationMedia[];
  primary_image_url?: string;
  aliases?: string[];
}

export interface DestinationListResponse {
  items: DestinationRead[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface DestinationFilterParams {
  q?: string;
  district?: string;
  category?: DestinationCategory;
  is_offbeat?: boolean;
  fee_type?: 'free' | 'paid' | 'unknown';
  min_duration?: number;
  max_duration?: number;
  sort_by?: 'name' | 'district' | 'duration_asc' | 'duration_desc';
  lang?: Language;
  limit?: number;
  offset?: number;
}


export type StopType =
  | 'attraction'
  | 'activity'
  | 'meal'
  | 'accommodation'
  | 'transport'
  | 'break'
  | 'event';

export type CostStatus =
  | 'verified'
  | 'estimated'
  | 'user_provided'
  | 'unknown'
  | 'not_applicable';

export interface PlanningRequest {
  language: Language;
  origin_label: string;
  duration_days: number;
  travelers_count?: number;
  start_date?: string;
  preferred_districts?: string[];
  categories?: DestinationCategory[];
  pace: 'relaxed' | 'balanced' | 'packed';
  is_offbeat_preferred: boolean;
  travel_mode?: 'driving_car' | 'cab_taxi' | 'public_transit' | 'mixed';
  budget_scenario?: 'budget' | 'standard' | 'comfort';
  budget_limit_inr?: number;
  budget_scope?: 'total_trip' | 'per_person';
  fuel_efficiency_km_per_litre?: number;
  fuel_price_per_litre?: number;
  is_return_trip?: boolean;
  notes?: string;
}

export interface RecommendedDestination {
  id: string;
  slug: string;
  name: string;
  summary?: string;
  category: DestinationCategory;
  district_code: string;
  district_name?: string;
  coordinates?: Coordinates;
  day_number: number;
  order: number;
  rationale: string;
  entry_fee_min_inr?: number;
  entry_fee_max_inr?: number;
  currency_code: string;
  access_status: AccessStatus;
  is_offbeat: boolean;
  sources?: DestinationSource[];
}

export interface TravelLegAlternative {
  mode: string;
  mode_label: string;
  mode_label_kn?: string | null;
  duration_minutes: number;
  cost_inr?: number | null;
  cost_status: CostStatus;
  notes?: string | null;
  notes_kn?: string | null;
}

export interface TravelLegSegment {
  segment_order: number;
  segment_type: string;
  mode: string;
  mode_label: string;
  mode_label_kn?: string | null;
  description: string;
  description_kn?: string | null;
  operator_name?: string | null;
  route_service_number?: string | null;
  origin_name?: string | null;
  destination_name?: string | null;
  distance_km?: number | null;
  duration_minutes?: number | null;
  cost_inr?: number | null;
  cost_status: CostStatus;
  is_per_person: boolean;
}

export interface TravelLegDetails {
  leg_id?: string | null;
  origin_name?: string | null;
  destination_name?: string | null;
  distance_km?: number | null;
  duration_minutes?: number | null;
  selected_mode?: string;
  recommended_mode: string;
  recommendation_reason?: string | null;
  recommendation_reason_kn?: string | null;
  cost_per_person_inr?: number | null;
  cost_group_inr?: number | null;
  fare_status: CostStatus;
  calculation_basis?: string | null;
  operator_name?: string | null;
  route_service_number?: string | null;
  origin_terminal?: string | null;
  destination_terminal?: string | null;
  fuel_cost_inr?: number | null;
  fuel_litres?: number | null;
  vehicles_count?: number;
  toll_note?: string | null;
  toll_note_kn?: string | null;
  parking_note?: string | null;
  parking_note_kn?: string | null;
  walking_feasible?: boolean;
  walking_notes?: string | null;
  walking_notes_kn?: string | null;
  first_mile_required?: boolean;
  last_mile_required?: boolean;
  source_reference?: string | null;
  segments?: TravelLegSegment[];
  alternatives?: TravelLegAlternative[];
  warnings?: string[];
}

export interface ItineraryStop {
  stop_id: string;
  destination_id?: string | null;
  stop_type: StopType;
  name: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  coordinates?: Coordinates | null;
  distance_from_prev_km?: number | null;
  transit_from_prev_minutes?: number | null;
  transit_method?: string | null;
  travel_leg?: TravelLegDetails | null;
  cost_min_inr?: number | null;
  cost_max_inr?: number | null;
  currency: string;
  cost_status: CostStatus;
  source_reference?: string | null;
  rationale?: string | null;
  notes?: string | null;
  user_modified?: boolean;
  locked?: boolean;
}

export interface DayPlan {
  day_number: number;
  date?: string | null;
  theme: string;
  stops: ItineraryStop[];
  total_duration_minutes: number;
  transit_minutes: number;
  driving_distance_km?: number | null;
  start_location_name?: string | null;
  start_coordinates?: Coordinates | null;
  end_location_name?: string | null;
  end_coordinates?: Coordinates | null;
  accommodation_name?: string | null;
  meals_covered: string[];
  daily_cost_min_inr?: number | null;
  daily_cost_max_inr?: number | null;
  warnings: string[];
}

export interface BudgetCategoryItem {
  category_name: string;
  estimated_min_inr?: number | null;
  estimated_max_inr?: number | null;
  cost_status: CostStatus;
  calculation_basis: string;
  notes?: string | null;
  basis_type?: string;
  subtotal_type?: string;
}

export interface CompleteBudgetBreakdown {
  grand_total_min_inr?: number | null;
  grand_total_max_inr?: number | null;
  per_person_min_inr?: number | null;
  per_person_max_inr?: number | null;
  verified_subtotal_inr?: number;
  estimated_subtotal_min_inr?: number;
  estimated_subtotal_max_inr?: number;
  currency: string;
  traveler_count: number;
  travel_mode_used?: string;
  budget_scenario_used?: string;
  is_return_trip?: boolean;
  budget_limit_inr?: number;
  budget_scope?: 'total_trip' | 'per_person';
  is_budget_feasible?: boolean;
  budget_overrun_inr?: number;
  categories: BudgetCategoryItem[];
  has_unknown_costs: boolean;
  calculation_notes?: string[];
  warnings: string[];
}

export interface PlanningRecommendationResponse {
  request_id?: string;
  language: Language;
  generation_mode: 'ai' | 'fallback';
  provider_used: string;
  items: RecommendedDestination[];
  total_destinations: number;
  duration_days: number;
  days?: DayPlan[];
  budget_breakdown?: CompleteBudgetBreakdown;
  origin_label?: string;
  corridor_name?: string;
  assumptions?: string[];
  data_limitations?: string[];
  warnings?: string[];
}

export interface SavedTrip {
  id: string;
  title: string;
  saved_at: string;
  request: PlanningRequest;
  plan: PlanningRecommendationResponse;
  cloud_trip_id?: string;
  sync_status?: 'local_only' | 'pending_sync' | 'synced' | 'conflict' | 'failed';
  last_synced_at?: string;
  version?: number;
}

export interface SaveCloudTripPayload {
  title: string;
  origin_label: string;
  duration_days: number;
  pace: 'relaxed' | 'balanced' | 'packed';
  is_offbeat_preferred?: boolean;
  preferences?: Record<string, unknown>;
  budget_min_inr?: number;
  budget_max_inr?: number;
  currency_code?: string;
  itinerary: PlanningRecommendationResponse;
}

export interface UpdateCloudTripPayload {
  title?: string;
  itinerary: PlanningRecommendationResponse;
}

export interface StopRegenerateCandidate {
  destination_id: string;
  slug: string;
  name: string;
  summary?: string | null;
  category: DestinationCategory;
  district_code: string;
  district_name?: string | null;
  coordinates?: Coordinates | null;
  estimated_visit_minutes: number;
  entry_fee_min_inr?: number | null;
  entry_fee_max_inr?: number | null;
  cost_status: CostStatus;
  distance_delta_km?: number | null;
  transit_delta_minutes?: number | null;
  fee_difference_inr?: number | null;
  rationale: string;
}

export interface StopRegenerateResponse {
  original_stop_id: string;
  day_number: number;
  candidates: StopRegenerateCandidate[];
}

export interface ItineraryRecalculateRequest {
  request: PlanningRequest;
  days: DayPlan[];
  generation_mode?: string;
  provider_used?: string;
}

export interface NearbyAttractionItem {
  id: string;
  slug: string;
  name: string;
  category: DestinationCategory;
  district_code: string;
  distance_km: number;
  entry_fee_min_inr?: number;
  entry_fee_max_inr?: number;
  estimated_visit_minutes?: number;
  primary_image_url?: string;
}

export interface NearbyTransitItem {
  hub_id: string;
  name: string;
  hub_type: string;
  distance_km: number;
  connectivity_summary: string;
}

export interface DestinationNearbyResponse {
  destination_id: string;
  destination_slug: string;
  radius_km: number;
  nearby_attractions: NearbyAttractionItem[];
  nearby_transit: NearbyTransitItem[];
  nearby_restaurants: Record<string, unknown>[];
  nearby_accommodations: Record<string, unknown>[];
}

export interface SavedTripSummary {
  id: string;
  title: string;
  origin_label: string;
  duration_days: number;
  pace: string;
  budget_min_inr?: number;
  budget_max_inr?: number;
  currency_code: string;
  total_stops: number;
  version?: number;
  created_at: string;
  updated_at: string;
}

export interface SavedTripDetail {
  id: string;
  user_id: string;
  title: string;
  origin_label: string;
  duration_days: number;
  pace: string;
  is_offbeat_preferred: boolean;
  preferences: Record<string, unknown>;
  budget_min_inr?: number;
  budget_max_inr?: number;
  currency_code: string;
  status: string;
  version?: number;
  last_modified_by?: string;
  snapshot: PlanningRecommendationResponse;
  created_at: string;
  updated_at: string;
}

export interface CloudTripListResponse {
  items: SavedTripSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateTripShareRequest {
  role: 'viewer' | 'editor';
  expires_in_days?: number | null;
}

export interface TripShareInfo {
  id: string;
  trip_id: string;
  created_by: string;
  role: 'viewer' | 'editor';
  share_token: string;
  expires_at?: string | null;
  is_revoked: boolean;
  created_at: string;
}

export interface TripShareListResponse {
  items: TripShareInfo[];
  total: number;
}

export interface SharedTripDetail {
  id: string;
  title: string;
  origin_label: string;
  duration_days: number;
  pace: string;
  is_offbeat_preferred: boolean;
  budget_min_inr?: number;
  budget_max_inr?: number;
  currency_code: string;
  version: number;
  role: 'viewer' | 'editor';
  snapshot: PlanningRecommendationResponse;
  created_at: string;
  updated_at: string;
}

export interface UpdateSharedTripRequest {
  expected_version: number;
  title?: string;
  itinerary: PlanningRecommendationResponse;
}

export interface TripAuditEvent {
  id: string;
  trip_id: string;
  actor_type: 'owner' | 'editor' | 'guest';
  actor_id?: string;
  action: string;
  summary: string;
  version_before?: number;
  version_after?: number;
  created_at: string;
}

export interface TripAuditHistoryResponse {
  items: TripAuditEvent[];
  total: number;
}


export interface RestaurantRead {
  id: string;
  name_en: string;
  name_kn: string;
  place_type: 'restaurant';
  district_code: string;
  nearby_destination_slug: string;
  latitude: number;
  longitude: number;
  address_en: string;
  address_kn?: string;
  cuisines: string[];
  is_vegetarian: boolean;
  price_tier: 'budget' | 'mid_range' | 'premium';
  estimated_cost_per_person_inr?: number;
  price_status: 'verified' | 'estimated' | 'unknown';
  opening_hours?: string;
  official_website_url?: string | null;
  link_status?: 'verified' | 'needs_review' | 'unavailable';
  source_name: string;
  source_type: string;
  verified_at: string;
  user_notes_en?: string;
  user_notes_kn?: string;
  distance_km?: number;
}

export interface AccommodationRead {
  id: string;
  name_en: string;
  name_kn: string;
  place_type: 'accommodation';
  accommodation_type: 'hotel' | 'resort' | 'homestay' | 'lodge' | 'heritage';
  district_code: string;
  nearby_destination_slug: string;
  latitude: number;
  longitude: number;
  address_en: string;
  address_kn?: string;
  price_tier: 'budget' | 'mid_range' | 'premium';
  estimated_cost_per_night_inr?: number;
  price_status: 'verified' | 'estimated' | 'unknown';
  amenities: string[];
  booking_reference_url?: string;
  official_website_url?: string | null;
  official_booking_url?: string | null;
  link_source_name?: string | null;
  link_status?: 'verified' | 'needs_review' | 'unavailable';
  link_verified_at?: string | null;
  source_name: string;
  source_type: string;
  verified_at: string;
  user_notes_en?: string;
  user_notes_kn?: string;
  distance_km?: number;
}

export interface TransitStop {
  stop_id: string;
  name_en: string;
  name_kn: string;
  district_code: string;
  station_type: 'bus_terminal' | 'railway_station' | 'metro_station' | 'bus_stop';
  latitude: number;
  longitude: number;
  address_en: string;
  address_kn: string;
  operator: string;
  distance_km?: number;
}

export interface TransitLeg {
  leg_id: string;
  origin_stop: TransitStop;
  destination_stop: TransitStop;
  transit_mode: 'ksrtc_express_bus' | 'bmtc_city_bus' | 'swr_railway' | 'namma_metro';
  line_name: string;
  route_number: string;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  distance_km: number;
  fare_inr: number;
  fare_status: string;
  frequency_summary: string;
  operator_name: string;
  source_name: string;
  source_url?: string;
}

export interface TransitJourneyOption {
  journey_id: string;
  origin_label: string;
  destination_label: string;
  total_duration_minutes: number;
  transfers_count: number;
  legs: TransitLeg[];
  total_fare_min_inr: number;
  total_fare_max_inr: number;
  fare_status: string;
  calculation_basis: string;
  operator_name: string;
  feed_version: string;
  disclaimer: string;
  is_realtime: boolean;
}

export interface TransitComparison {
  origin_lat: number;
  origin_lon: number;
  dest_lat: number;
  dest_lon: number;
  road_distance_km: number;
  road_duration_minutes: number;
  road_method: string;
  road_estimated_cab_cost_inr: number;
  transit_options: TransitJourneyOption[];
  transit_available: boolean;
  carbon_comparison_note_en: string;
  carbon_comparison_note_kn: string;
}

// ============================================================================
// Phase 7: AI Visual Place Discovery & Resilient PWA Synchronization Types
// ============================================================================

export type ConfidenceLabel = 'strong_match' | 'possible_match' | 'uncertain_suggestion';

export interface VisualEvidence {
  observed_features: string[];
  architectural_style?: string | null;
  landscape_clues: string[];
  detected_signage?: string | null;
  notes?: string | null;
}

export interface VisualDiscoveryCandidate {
  destination_id: string;
  slug: string;
  name_en: string;
  name_kn: string;
  district_code: string;
  district_name_en?: string | null;
  district_name_kn?: string | null;
  category: DestinationCategory | string;
  summary_en?: string | null;
  summary_kn?: string | null;
  match_score: number;
  confidence_label: ConfidenceLabel;
  matching_reasons: string[];
  visual_evidence?: VisualEvidence | null;
  uncertainty_notes?: string | null;
  image_url?: string | null;
}

export interface VisualDiscoveryResponse {
  query_type: 'image' | 'video';
  is_confident: boolean;
  message_en: string;
  message_kn: string;
  candidates: VisualDiscoveryCandidate[];
  sampled_frame_count?: number | null;
  analyzed_at: string;
  privacy_notice: string;
}

export type SyncOperationStatus =
  | 'pending'
  | 'syncing'
  | 'synced'
  | 'conflict'
  | 'needs_auth'
  | 'failed_retryable'
  | 'failed_permanent';

export interface SyncOperation {
  operation_id: string;
  idempotency_key: string;
  trip_id: string;
  share_token?: string;
  operation_type: 'UPDATE_TRIP' | 'UPDATE_SHARED_TRIP';
  payload: Record<string, unknown>;
  expected_version: number;
  created_at: string;
  retry_count: number;
  status: SyncOperationStatus;
  last_error?: string;
  last_attempt_at?: string;
}

export interface Waypoint {
  name: string;
  lat: number;
  lon: number;
  stop_id?: string;
  stop_order?: number;
  day_number?: number;
}

export interface RouteStep {
  instruction: string;
  distance_meters: number;
  duration_seconds: number;
  name?: string;
}

export interface RouteLeg {
  origin: Waypoint;
  destination: Waypoint;
  distance_meters: number;
  distance_km: number;
  duration_seconds: number;
  duration_minutes: number;
  steps: RouteStep[];
  geometry_coordinates: [number, number][];
  calculation_method: string;
  warnings: string[];
}

export interface DirectionsRequest {
  origin: Waypoint;
  destination: Waypoint;
  waypoints?: Waypoint[];
  travel_mode?: string;
  day_number?: number;
}

export interface DirectionsResponse {
  provider: string;
  calculation_method: string;
  travel_mode: string;
  total_distance_km: number;
  total_duration_minutes: number;
  legs: RouteLeg[];
  all_coordinates: [number, number][];
  google_maps_url: string;
  is_live_traffic?: boolean;
  warnings?: string[];
}

