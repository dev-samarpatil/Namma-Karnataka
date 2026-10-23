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
  lang?: Language;
  limit?: number;
  offset?: number;
}

export interface PlanningRequest {
  language: Language;
  origin_label: string;
  duration_days: number;
  preferred_districts?: string[];
  categories?: DestinationCategory[];
  pace: 'relaxed' | 'balanced' | 'packed';
  is_offbeat_preferred: boolean;
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

export interface PlanningRecommendationResponse {
  request_id?: string;
  language: Language;
  generation_mode: 'ai' | 'fallback';
  provider_used: string;
  items: RecommendedDestination[];
  total_destinations: number;
  duration_days: number;
  warnings?: string[];
}

export interface SavedTrip {
  id: string;
  title: string;
  saved_at: string;
  request: PlanningRequest;
  plan: PlanningRecommendationResponse;
}
