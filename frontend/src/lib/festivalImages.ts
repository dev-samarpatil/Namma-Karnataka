import { CulturalEvent, FestivalEvent, Language } from '../types';

/**
 * Verified local festival asset mapping for Namma Karnataka.
 * All assets are locally stored under public/assets/festivals/
 * providing instant rendering, zero 429 rate limits, and 100% offline availability.
 */
export const FESTIVAL_LOCAL_IMAGES: Record<string, string> = {
  // Direct Event Registry IDs
  'mysuru-dasara': '/assets/festivals/mysuru-dasara.jpg',
  'bengaluru-karaga': '/assets/festivals/bengaluru-karaga.jpg',
  'karnataka-rajyotsava': '/assets/festivals/karnataka-rajyotsava.jpg',
  'dakshina-kannada-kambala': '/assets/festivals/dakshina-kannada-kambala.jpg',
  'bhoota-kola-yakshagana-season': '/assets/festivals/bhoota-kola-yakshagana.jpg',
  'bhoota-kola-yakshagana': '/assets/festivals/bhoota-kola-yakshagana.jpg',
  'kadalekai-parishe': '/assets/festivals/kadalekai-parishe.jpg',
  'kailpodh-coorg': '/assets/festivals/kailpodh-coorg.jpg',
  'melukote-vairamudi': '/assets/festivals/melukote-vairamudi.jpg',
  'hampi-utsav': '/assets/festivals/hampi-utsav.jpg',
  'pattadakal-dance-festival': '/assets/festivals/pattadakal-dance.jpg',
  'pattadakal-dance': '/assets/festivals/pattadakal-dance.jpg',
  'lalbagh-flower-show-republic-day': '/assets/festivals/lalbagh-flower-show.jpg',
  'lalbagh-flower-show': '/assets/festivals/lalbagh-flower-show.jpg',
  'western-ghats-monsoon-jog': '/assets/festivals/monsoon-jog.jpg',
  'monsoon-jog': '/assets/festivals/monsoon-jog.jpg',
};

/**
 * Resolves a local festival image asset path from an event ID or name.
 */
export function getLocalFestivalImage(eventIdOrName?: string | null): string | null {
  if (!eventIdOrName) return null;
  const raw = eventIdOrName.trim().toLowerCase();

  // 1. Exact match on ID or key
  if (FESTIVAL_LOCAL_IMAGES[raw]) {
    return FESTIVAL_LOCAL_IMAGES[raw];
  }

  // 2. Dash/underscore normalized match
  const dashKey = raw.replace(/_/g, '-');
  if (FESTIVAL_LOCAL_IMAGES[dashKey]) {
    return FESTIVAL_LOCAL_IMAGES[dashKey];
  }

  // 3. Keyword / semantic matching
  if (raw.includes('rajyotsava')) return '/assets/festivals/karnataka-rajyotsava.jpg';
  if (raw.includes('karaga')) return '/assets/festivals/bengaluru-karaga.jpg';
  if (raw.includes('dasara') || raw.includes('mysore dasara')) return '/assets/festivals/mysuru-dasara.jpg';
  if (raw.includes('flower') || raw.includes('lalbagh')) return '/assets/festivals/lalbagh-flower-show.jpg';
  if (raw.includes('hampi') || raw.includes('vijaya utsav')) return '/assets/festivals/hampi-utsav.jpg';
  if (raw.includes('kambala')) return '/assets/festivals/dakshina-kannada-kambala.jpg';
  if (raw.includes('yakshagana') || raw.includes('bhoota kola') || raw.includes('daiva')) return '/assets/festivals/bhoota-kola-yakshagana.jpg';
  if (raw.includes('kadalekai') || raw.includes('groundnut')) return '/assets/festivals/kadalekai-parishe.jpg';
  if (raw.includes('kailpodh') || raw.includes('kodagu harvest')) return '/assets/festivals/kailpodh-coorg.jpg';
  if (raw.includes('vairamudi') || raw.includes('melukote')) return '/assets/festivals/melukote-vairamudi.jpg';
  if (raw.includes('pattadakal') || raw.includes('nritya')) return '/assets/festivals/pattadakal-dance.jpg';
  if (raw.includes('jog') || raw.includes('sharavathi')) return '/assets/festivals/monsoon-jog.jpg';

  return null;
}

/**
 * Normalizes either CulturalEvent or FestivalEvent into a unified FestivalEvent representation.
 */
export function toFestivalEvent(
  event: CulturalEvent | FestivalEvent,
  language: Language = 'en'
): FestivalEvent {
  const isKn = language === 'kn';

  // If already matches FestivalEvent
  if ('imageAlt' in event && 'startDate' in event) {
    const fe = event as FestivalEvent;
    const localImg = getLocalFestivalImage(fe.id) || getLocalFestivalImage(fe.name);
    return {
      ...fe,
      imageUrl: localImg || fe.imageUrl,
    };
  }

  // Convert from CulturalEvent
  const ce = event as CulturalEvent;
  const name = isKn && ce.name_kn ? ce.name_kn : ce.name_en;
  const desc = isKn && ce.description_kn ? ce.description_kn : ce.description_en;
  const localImg = getLocalFestivalImage(ce.id) || getLocalFestivalImage(ce.name_en);

  return {
    id: ce.id,
    name,
    imageUrl: localImg || ce.image_url || undefined,
    imageAlt: `${ce.name_en} — ${ce.location_name}`,
    category: ce.event_category || 'cultural_event',
    location: ce.location_name,
    startDate: ce.typical_start_date || '',
    endDate: ce.typical_end_date || '',
    description: desc,
    entryFee: ce.ticket_cost_min_inr,
    verificationSource: ce.source_name,
    officialUrl: ce.source_url,
    travelAdvisory: ce.travel_advisory,
  };
}

