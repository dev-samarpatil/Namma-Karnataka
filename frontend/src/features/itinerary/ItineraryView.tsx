import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  PlanningRecommendationResponse,
  RecommendedDestination,
  Language,
  PlanningRequest,
  DayPlan,
  ItineraryStop,
  StopRegenerateCandidate,
  DestinationRead,
  TripShareInfo,
} from '../../types';
import { useTranslation, TranslationKey } from '../../lib/i18n';
import {
  recalculateItinerary,
  getStopAlternatives,
  regenerateDay,
  listDestinations,
  createTripShare,
  listTripShares,
  revokeTripShare,
  updateSharedTrip,
  getApiBaseUrl,
} from '../../lib/api';
import {
  getTripSyncStatus,
  processSyncQueue,
  enqueueOperation,
} from '../../services/offlineSync';
import { getOfflineDestinations } from '../../services/offlineStorage';
import verifiedDestinationsData from './verifiedDestinationMedia.json';
import { PolaroidLineCarousel, PolaroidSlide } from '../../components/ui/polaroid-line-carousel';
import { DayOverview } from './DayOverview';
import { DayNavigation } from './DayNavigation';
import { DailyBudgetSummary } from './DailyBudgetSummary';
import { OvernightStayCard } from './OvernightStayCard';
import { DayEventsSection } from './DayEventsSection';
import { TripWideOverview } from './TripWideOverview';
import { BudgetSummary } from './BudgetSummary';
import { MapView } from './MapView';
import { TransitComparisonCard } from './TransitComparisonCard';
import { TravelLegCard } from './TravelLegCard';
import './DayWiseItinerary.css';
import { deduplicateItineraryDestinations } from '../../lib/itineraryDeduplication';

// Fast static lookup map for guaranteed authentic destination photographs from verified catalogue
const VERIFIED_MEDIA_MAP = new Map<string, string>();
if (Array.isArray(verifiedDestinationsData)) {
  for (const item of verifiedDestinationsData as Array<{ id?: string; slug?: string; name_en?: string; primary_image_url?: string }>) {
    if (item.primary_image_url) {
      if (item.id) VERIFIED_MEDIA_MAP.set(item.id, item.primary_image_url);
      if (item.slug) {
        VERIFIED_MEDIA_MAP.set(item.slug, item.primary_image_url);
        VERIFIED_MEDIA_MAP.set(item.slug.replace(/-madikeri|-coorg/g, ''), item.primary_image_url);
        VERIFIED_MEDIA_MAP.set(item.slug.replace(/-s-/g, '-'), item.primary_image_url);
      }
      if (item.name_en) {
        const lower = item.name_en.toLowerCase();
        VERIFIED_MEDIA_MAP.set(lower, item.primary_image_url);
        VERIFIED_MEDIA_MAP.set(lower.replace(/[^a-z0-9 ]/g, '').trim(), item.primary_image_url);
        VERIFIED_MEDIA_MAP.set(lower.replace(/\s*\(.*?\)\s*/g, '').trim(), item.primary_image_url);
      }
    }
  }
}

interface ItineraryViewProps {
  plan: PlanningRecommendationResponse | null;
  language: Language;
  onReplan: () => void;
  onSaveTrip: (plan: PlanningRecommendationResponse) => void;
  isSaved?: boolean;
  request?: PlanningRequest | null;
  onUpdatePlan?: (updatedPlan: PlanningRecommendationResponse) => void;
  tripId?: string | null;
  cloudTripId?: string | null;
  authToken?: string | null;
  shareToken?: string | null;
  userRole?: 'owner' | 'editor' | 'viewer';
  version?: number;
  onReloadSharedTrip?: () => void;
}

export const ItineraryView: React.FC<ItineraryViewProps> = ({
  plan,
  language,
  onReplan,
  onSaveTrip,
  isSaved = false,
  request,
  onUpdatePlan,
  tripId,
  cloudTripId,
  authToken: _authToken,
  shareToken,
  userRole = 'owner',
  version = 1,
  onReloadSharedTrip,
}) => {

  const { t } = useTranslation(language);
  const [showMap, setShowMap] = useState<boolean>(true);
  const [activeDay, setActiveDay] = useState<number>(1);
  const [activeDayTab, setActiveDayTab] = useState<number>(1);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [isAllDaysView, setIsAllDaysView] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useState<boolean>(true);
  const [destinationsMap, setDestinationsMap] = useState<Map<string, DestinationRead>>(new Map());

  const handleSelectDay = (dNum: number) => {
    setActiveDay(dNum);
    setActiveDayTab(dNum);
    setIsAllDaysView(false);
    setActiveSlideIndex(0);
  };

  // Ensure plan destinations are strictly deduplicated across and within days
  const cleanPlan = useMemo(() => {
    return plan ? deduplicateItineraryDestinations(plan) : null;
  }, [plan]);

  // Backward compatibility: derive effectiveDays from plan.days or fallback to grouping items
  const effectiveDays: DayPlan[] = useMemo(() => {
    const activePlanObj = cleanPlan || plan;
    if (!activePlanObj) return [];
    if (activePlanObj.days && activePlanObj.days.length > 0) {
      return activePlanObj.days;
    }
    const grouped = new Map<number, RecommendedDestination[]>();
    for (const item of activePlanObj.items) {
      const dNum = item.day_number || 1;
      if (!grouped.has(dNum)) grouped.set(dNum, []);
      grouped.get(dNum)!.push(item);
    }
    const days: DayPlan[] = [];
    grouped.forEach((destList, dNum) => {
      days.push({
        day_number: dNum,
        theme: `Day ${dNum} Itinerary`,
        stops: destList.map((item, idx) => ({
          stop_id: `stop-d${dNum}-${item.slug || item.id || idx}`,
          destination_id: item.id || item.slug,
          stop_type: 'attraction',
          name: item.name,
          description: item.summary,
          start_time: '10:00',
          end_time: '12:00',
          duration_minutes: 120,
          cost_min_inr: item.entry_fee_min_inr,
          cost_max_inr: item.entry_fee_max_inr,
          cost_status: item.entry_fee_min_inr !== undefined ? 'verified' : 'unknown',
          currency: item.currency_code || 'INR',
          rationale: item.rationale,
        })),
        total_duration_minutes: 240,
        transit_minutes: 30,
        meals_covered: [],
        warnings: [],
      });
    });
    return days.sort((a, b) => a.day_number - b.day_number);
  }, [cleanPlan, plan]);

  // Load verified catalogue, offline catalogue and query API in background for authentic destination photos
  useEffect(() => {
    const map = new Map<string, DestinationRead>();

    const getImg = (obj: unknown): string | undefined => {
      if (!obj || typeof obj !== 'object') return undefined;
      const rec = obj as Record<string, unknown>;
      if (typeof rec.primary_image_url === 'string' && rec.primary_image_url.trim()) {
        return rec.primary_image_url;
      }
      if (Array.isArray(rec.media) && rec.media.length > 0) {
        const m = rec.media[0] as Record<string, unknown>;
        if (typeof m.thumbnail_url === 'string' && m.thumbnail_url) return m.thumbnail_url;
        if (typeof m.url === 'string' && m.url) return m.url;
      }
      return undefined;
    };

    const registerKey = (key: string, d: unknown) => {
      if (!key) return;
      const existing = map.get(key);
      if (existing) {
        const existingImg = getImg(existing);
        const incomingImg = getImg(d);
        if (existingImg && !incomingImg) {
          // Preserve existing verified image so incoming recommendations without images never strip photos
          map.set(key, { ...(d as object), primary_image_url: existingImg, media: (existing as DestinationRead).media } as DestinationRead);
          return;
        }
      }
      map.set(key, d as DestinationRead);
    };

    const indexDest = (d: unknown) => {
      if (!d || typeof d !== 'object') return;
      const rec = d as Record<string, unknown>;
      if (typeof rec.id === 'string') registerKey(rec.id, d);
      if (typeof rec.slug === 'string') {
        registerKey(rec.slug, d);
        registerKey(rec.slug.replace(/-madikeri|-coorg/g, ''), d);
        registerKey(rec.slug.replace(/-s-/g, '-'), d);
      }
      if (typeof rec.name_en === 'string') {
        const lower = rec.name_en.toLowerCase();
        registerKey(lower, d);
        registerKey(lower.replace(/[^a-z0-9 ]/g, '').trim(), d);
        registerKey(lower.replace(/\s*\(.*?\)\s*/g, '').trim(), d);
      }
      if (typeof rec.name === 'string') {
        const lower = rec.name.toLowerCase();
        registerKey(lower, d);
        registerKey(lower.replace(/[^a-z0-9 ]/g, '').trim(), d);
        registerKey(lower.replace(/\s*\(.*?\)\s*/g, '').trim(), d);
      }
      if (typeof rec.name_kn === 'string') {
        registerKey(rec.name_kn, d);
      }
    };

    // 1. Initial instant load from verified destination media catalogue (58 destinations)
    if (Array.isArray(verifiedDestinationsData)) {
      for (const d of verifiedDestinationsData) {
        indexDest(d);
      }
    }

    try {
      const offline = getOfflineDestinations();
      for (const d of offline) {
        indexDest(d);
      }
      if (plan?.items) {
        for (const item of plan.items) {
          indexDest(item);
        }
      }
      setDestinationsMap(new Map(map));
    } catch {
      // ignore
    }

    listDestinations({ limit: 100 })
      .then((res) => {
        setCatalogDests(res.items);
        for (const d of res.items) {
          indexDest(d);
        }
        if (plan?.items) {
          for (const item of plan.items) {
            indexDest(item);
          }
        }
        setDestinationsMap(new Map(map));
      })
      .catch(() => {
        // offline fallback
      });
  }, [plan?.items]);

  // Bounds check for activeDay
  useEffect(() => {
    if (effectiveDays.length > 0 && activeDay > effectiveDays.length) {
      setActiveDay(1);
      setActiveDayTab(1);
    }
  }, [effectiveDays.length, activeDay]);

  const currentDayPlan = useMemo(() => {
    if (effectiveDays.length === 0) return null;
    return effectiveDays.find((d) => d.day_number === activeDay) || effectiveDays[0];
  }, [effectiveDays, activeDay]);

  const resolveDestinationImage = useCallback(
    (destIdOrSlug?: string | null, stopName?: string | null, directImg?: string | null): { proxyUrl: string; rawUrl: string } => {
      let rawUrl: string | undefined = directImg && directImg.trim() ? directImg : undefined;

      let match: DestinationRead | RecommendedDestination | (DestinationRead & { primary_image_url?: string }) | undefined;
      if (destIdOrSlug) {
        match =
          destinationsMap.get(destIdOrSlug) ||
          destinationsMap.get(destIdOrSlug.replace(/-s-/g, '-')) ||
          plan?.items.find((i) => i.id === destIdOrSlug || i.slug === destIdOrSlug);
      }
      if (!match && stopName) {
        const norm = stopName.trim().toLowerCase();
        const stripped = norm.replace(/[^a-z0-9 ]/g, '').trim();
        const base = norm.replace(/\s*\(.*?\)\s*/g, '').trim();
        match =
          destinationsMap.get(norm) ||
          destinationsMap.get(stripped) ||
          destinationsMap.get(base) ||
          plan?.items.find((i) => {
            const iname = i.name.toLowerCase();
            return (
              iname === norm ||
              iname === stripped ||
              iname === base ||
              iname.includes(base) ||
              base.includes(iname)
            );
          });
      }

      if (!rawUrl && match) {
        if ('primary_image_url' in match && match.primary_image_url) {
          rawUrl = match.primary_image_url;
        } else if ('media' in match && match.media && match.media.length > 0) {
          rawUrl = match.media[0].thumbnail_url || match.media[0].url;
        }
      }

      // Static verified catalogue fallback
      if (!rawUrl && destIdOrSlug) {
        rawUrl = VERIFIED_MEDIA_MAP.get(destIdOrSlug) || VERIFIED_MEDIA_MAP.get(destIdOrSlug.replace(/-s-/g, '-'));
      }
      if (!rawUrl && stopName) {
        const norm = stopName.trim().toLowerCase();
        const stripped = norm.replace(/[^a-z0-9 ]/g, '').trim();
        const base = norm.replace(/\s*\(.*?\)\s*/g, '').trim();
        rawUrl = VERIFIED_MEDIA_MAP.get(norm) || VERIFIED_MEDIA_MAP.get(stripped) || VERIFIED_MEDIA_MAP.get(base);
      }

      if (!rawUrl) return { proxyUrl: '', rawUrl: '' };

      const cleanUrl = rawUrl.replace('thumb.wikimedia.org', 'upload.wikimedia.org').split('?')[0];
      const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
      const isLocalUrl = Boolean(cleanUrl && (cleanUrl.startsWith('/') || cleanUrl.startsWith('data:')));
      const proxyUrl = isLocalUrl ? cleanUrl : `${baseUrl}/destinations/media/proxy?url=${encodeURIComponent(cleanUrl)}`;
      return { proxyUrl, rawUrl: cleanUrl };
    },
    [destinationsMap, plan?.items]
  );

  // Eligible sightseeing stops for the selected day's photo gallery
  const ELIGIBLE_GALLERY_TYPES = useMemo(() => new Set(['attraction', 'activity']), []);

  const activeDaySightseeingStops = useMemo(() => {
    if (!currentDayPlan) return [];
    const seen = new Set<string>();
    return currentDayPlan.stops.filter((stop) => {
      // Strictly include only genuine sightseeing stops (attraction, activity)
      if (!ELIGIBLE_GALLERY_TYPES.has(stop.stop_type)) return false;
      // Safeguard against any accommodation, meal, or transport record
      if (
        stop.stop_type === 'accommodation' ||
        stop.stop_type === 'meal' ||
        stop.stop_type === 'transport' ||
        stop.stop_type === 'break'
      ) {
        return false;
      }
      // Deduplicate in case identical destination or alias is scheduled twice on same day
      const normName = stop.name.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]/g, '');
      const key = stop.destination_id || normName || stop.name;
      if (seen.has(key) || (normName && normName.length >= 4 && seen.has(normName))) return false;
      seen.add(key);
      if (normName && normName.length >= 4) seen.add(normName);
      return true;
    });
  }, [currentDayPlan, ELIGIBLE_GALLERY_TYPES]);

  // One Polaroid slide per eligible sightseeing destination for the currently selected day
  const carouselSlides: PolaroidSlide[] = useMemo(() => {
    if (!currentDayPlan || activeDaySightseeingStops.length === 0) {
      return [];
    }

    return activeDaySightseeingStops.map((stop, idx) => {
      const matched =
        (stop.destination_id ? destinationsMap.get(stop.destination_id) : null) ||
        destinationsMap.get(stop.name.toLowerCase()) ||
        plan?.items.find(
          (i) =>
            i.id === stop.destination_id ||
            i.slug === stop.destination_id ||
            i.name.toLowerCase() === stop.name.toLowerCase()
        );

      let districtName = '';
      if (matched) {
        if ('district' in matched && matched.district?.name_en) {
          districtName = matched.district.name_en;
        } else if ('district_name' in matched && matched.district_name) {
          districtName = matched.district_name;
        } else {
          districtName = matched.district_code || '';
        }
      }
      if (!districtName && currentDayPlan.start_location_name) {
        districtName = currentDayPlan.start_location_name;
      }

      let categoryName = '';
      if (matched && matched.category) {
        categoryName = matched.category;
      } else if (stop.stop_type === 'attraction') {
        categoryName = 'Attraction';
      } else if (stop.stop_type === 'activity') {
        categoryName = 'Activity';
      }

      const { proxyUrl, rawUrl } = resolveDestinationImage(stop.destination_id, stop.name, stop.primary_image_url);

      return {
        id: stop.stop_id,
        destinationId: stop.destination_id,
        title: stop.name,
        polaroidCaption: stop.name,
        district: districtName,
        category: categoryName,
        image: proxyUrl,
        rawImageUrl: rawUrl,
        caption: stop.description || stop.rationale || '',
        stopOrder: idx + 1,
        dayNumber: currentDayPlan.day_number,
      };
    });
  }, [currentDayPlan, activeDaySightseeingStops, destinationsMap, plan?.items, resolveDestinationImage]);

  // Selected Day Title for Gallery Information Bar
  const galleryDayTitle = useMemo(() => {
    if (!currentDayPlan) return '';
    const dNum = currentDayPlan.day_number;
    const rawTheme = currentDayPlan.theme?.trim() || '';
    const isHotelTheme = /hotel|resort|lodge|stay|mayura|inn|guest house/i.test(rawTheme);

    if (rawTheme && !isHotelTheme && !rawTheme.toLowerCase().startsWith('day ')) {
      return `Day ${dNum} — ${rawTheme}`;
    }

    const firstDest = activeDaySightseeingStops[0];
    const matched = firstDest ? destinationsMap.get(firstDest.destination_id || '') : null;
    const district =
      (matched && 'district' in matched && matched.district?.name_en) ||
      (matched && 'district_name' in matched && matched.district_name) ||
      currentDayPlan.start_location_name;

    if (activeDaySightseeingStops.length > 0) {
      return `Day ${dNum} — ${district ? `${district} Exploration` : (language === 'kn' ? 'ದೃಶ್ಯವೀಕ್ಷಣೆ' : 'Sightseeing Circuit')}`;
    }
    return `Day ${dNum} — ${language === 'kn' ? 'ಪ್ರಯಾಣ ಮತ್ತು ವಿಶ್ರಾಂತಿ' : 'Travel & Rest'}`;
  }, [currentDayPlan, activeDaySightseeingStops, destinationsMap, language]);

  // Selected Day Subtitle (Destination Cluster)
  const galleryDaySubtitle = useMemo(() => {
    if (!currentDayPlan) return '';
    if (activeDaySightseeingStops.length > 0) {
      return activeDaySightseeingStops.map((s) => s.name).join(' · ');
    }
    return language === 'kn'
      ? 'ಪ್ರಯಾಣ ಮತ್ತು ವಿಶ್ರಾಂತಿ ವೇಳಾಪಟ್ಟಿ · ವಾಸ್ತವ್ಯ ಮತ್ತು ಪ್ರಯಾಣದ ವಿವರಗಳು ಕೆಳಗಿವೆ'
      : 'Rest and travel schedule · Accommodations and transit details in View Details';
  }, [currentDayPlan, activeDaySightseeingStops, language]);

  // Phase 5 Interactive State
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Stop Editing Dialog
  const [editingStop, setEditingStop] = useState<{ dayNumber: number; stop: ItineraryStop } | null>(null);
  const [editDuration, setEditDuration] = useState<number>(90);
  const [editNotes, setEditNotes] = useState<string>('');
  const [editLocked, setEditLocked] = useState<boolean>(false);

  // Stop Alternatives / Regeneration Dialog
  const [regeneratingStop, setRegeneratingStop] = useState<{ dayNumber: number; stop: ItineraryStop } | null>(null);
  const [alternatives, setAlternatives] = useState<StopRegenerateCandidate[]>([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState<boolean>(false);

  // Add Destination to Day Dialog
  const [addingToDay, setAddingToDay] = useState<number | null>(null);
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [catalogDests, setCatalogDests] = useState<DestinationRead[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState<boolean>(false);

  // Remove Stop Confirmation Dialog
  const [removingStop, setRemovingStop] = useState<{ dayNumber: number; stop: ItineraryStop } | null>(null);

  // Duplicate Move Confirmation Dialog
  const [duplicateMovePrompt, setDuplicateMovePrompt] = useState<{
    dest: DestinationRead;
    existingDay: number;
    targetDay: number;
    existingStop: ItineraryStop;
  } | null>(null);

  // Day Regeneration Confirmation
  const [confirmingRegenDay, setConfirmingRegenDay] = useState<number | null>(null);

  // Phase 6 Export & Sharing State
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [excludeNotes, setExcludeNotes] = useState<boolean>(false);
  const [shareRole, setShareRole] = useState<'viewer' | 'editor'>('viewer');
  const [shareExpiresDays, setShareExpiresDays] = useState<number>(30);
  const [activeShares, setActiveShares] = useState<TripShareInfo[]>([]);
  const [shareLinkGenerated, setShareLinkGenerated] = useState<string | null>(null);
  const [copiedNotice, setCopiedNotice] = useState<boolean>(false);
  const [shareLoading, setShareLoading] = useState<boolean>(false);
  const [conflictError, setConflictError] = useState<boolean>(false);
  const [syncInfo, setSyncInfo] = useState(() => getTripSyncStatus(cloudTripId || tripId));
  const [isSyncingQueue, setIsSyncingQueue] = useState<boolean>(false);

  useEffect(() => {
    setSyncInfo(getTripSyncStatus(cloudTripId || tripId));
  }, [cloudTripId, tripId, plan]);

  const handleManualSync = async () => {
    setIsSyncingQueue(true);
    try {
      const res = await processSyncQueue(_authToken || undefined);
      setSyncInfo(getTripSyncStatus(cloudTripId || tripId));
      if (res.conflicts > 0) {
        setConflictError(true);
      }
    } catch {
      // ignore
    } finally {
      setIsSyncingQueue(false);
    }
  };

  const isReadOnly = userRole === 'viewer';

  // Load catalog destinations when Add Destination modal opens
  useEffect(() => {
    if (addingToDay !== null) {
      setLoadingCatalog(true);
      listDestinations({ limit: 100 })
        .then((res) => {
          setCatalogDests(res.items);
          setLoadingCatalog(false);
        })
        .catch(() => {
          setLoadingCatalog(false);
        });
    }
  }, [addingToDay]);


  if (!plan || plan.items.length === 0) {
    return (
      <section className="itinerary-empty-section" data-testid="itinerary-empty">
        <div className="empty-icon" aria-hidden="true">🗺️</div>
        <h2>{t('navItinerary')}</h2>
        <p>No active itinerary yet. Tell us where you want to go in the Trip Planner to craft one.</p>
        <button type="button" className="btn-primary" onClick={onReplan}>
          ✨ {t('navPlan')}
        </button>
      </section>
    );
  }

  // Active fallback request if none supplied
  const activeReq: PlanningRequest = request || {
    language,
    origin_label: 'Bengaluru',
    duration_days: plan.duration_days,
    travelers_count: 1,
    pace: 'balanced',
    is_offbeat_preferred: false,
    categories: [],
    travel_mode: 'driving_car',
    budget_scenario: 'standard',
    fuel_efficiency_km_per_litre: 14.0,
    fuel_price_per_litre: 102.86,
    is_return_trip: true,
  };

  const executeRecalculate = async (updatedDays: DayPlan[]) => {
    setIsRecalculating(true);
    setActionError(null);
    setConflictError(false);
    try {
      const rawResponse = await recalculateItinerary(activeReq, updatedDays);
      const response = deduplicateItineraryDestinations(rawResponse);
      if (shareToken && userRole === 'editor') {
        try {
          const updateRes = await updateSharedTrip(shareToken, {
            expected_version: version,
            itinerary: response,
          });
          if (onUpdatePlan) {
            onUpdatePlan(updateRes.snapshot);
          }
        } catch (updateErr: unknown) {
          const errStatus = (updateErr as { status?: number })?.status;
          const errMsg = updateErr instanceof Error ? updateErr.message : String(updateErr);
          if (errStatus === 409 || errMsg.includes('409') || errMsg.toLowerCase().includes('conflict')) {
            setConflictError(true);
            return;
          }
          // Offline or transient network failure: enqueue resilient sync operation
          enqueueOperation({
            operation_type: 'UPDATE_SHARED_TRIP',
            trip_id: cloudTripId || tripId || 'shared-trip',
            share_token: shareToken,
            expected_version: version,
            idempotency_key: `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            payload: { itinerary: response },
          });
          setSyncInfo(getTripSyncStatus(cloudTripId || tripId));
          if (onUpdatePlan) {
            onUpdatePlan(response);
          }
        }
      } else if (onUpdatePlan) {
        onUpdatePlan(response);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to recalculate itinerary schedule.';
      setActionError(msg);
    } finally {
      setIsRecalculating(false);
    }
  };

  // --- Handlers for Stop Editing ---
  const handleOpenEdit = (dayNumber: number, stop: ItineraryStop) => {
    setEditingStop({ dayNumber, stop });
    setEditDuration(stop.duration_minutes || 90);
    setEditNotes(stop.notes || '');
    setEditLocked(Boolean(stop.locked));
  };

  const handleSaveStopEdit = async () => {
    if (!editingStop || !plan.days) return;
    const { dayNumber, stop } = editingStop;

    const newDays = plan.days.map((d) => {
      if (d.day_number !== dayNumber) return d;
      return {
        ...d,
        stops: d.stops.map((s) => {
          if (s.stop_id !== stop.stop_id) return s;
          return {
            ...s,
            duration_minutes: editDuration,
            notes: editNotes.trim() ? editNotes.trim() : null,
            locked: editLocked,
            user_modified: true,
          };
        }),
      };
    });

    setEditingStop(null);
    await executeRecalculate(newDays);
  };

  // --- Handlers for Moving Stops (Reordering) ---
  const handleMoveUp = async (dayNumber: number, stopId: string) => {
    if (!plan.days) return;
    const day = plan.days.find((d) => d.day_number === dayNumber);
    if (!day) return;

    const attrIndices = day.stops
      .map((s, idx) => (s.stop_type === 'attraction' || s.stop_type === 'activity' ? idx : -1))
      .filter((idx) => idx !== -1);

    const currentAttrIdxInAttrList = attrIndices.findIndex((idx) => day.stops[idx].stop_id === stopId);
    if (currentAttrIdxInAttrList <= 0) return; // Already first attraction

    const prevStopIdx = attrIndices[currentAttrIdxInAttrList - 1];
    const currStopIdx = attrIndices[currentAttrIdxInAttrList];

    const newStops = [...day.stops];
    const temp = newStops[prevStopIdx];
    newStops[prevStopIdx] = newStops[currStopIdx];
    newStops[currStopIdx] = temp;

    const newDays = plan.days.map((d) => (d.day_number === dayNumber ? { ...d, stops: newStops } : d));
    await executeRecalculate(newDays);
  };

  const handleMoveDown = async (dayNumber: number, stopId: string) => {
    if (!plan.days) return;
    const day = plan.days.find((d) => d.day_number === dayNumber);
    if (!day) return;

    const attrIndices = day.stops
      .map((s, idx) => (s.stop_type === 'attraction' || s.stop_type === 'activity' ? idx : -1))
      .filter((idx) => idx !== -1);

    const currentAttrIdxInAttrList = attrIndices.findIndex((idx) => day.stops[idx].stop_id === stopId);
    if (currentAttrIdxInAttrList === -1 || currentAttrIdxInAttrList >= attrIndices.length - 1) return; // Already last

    const currStopIdx = attrIndices[currentAttrIdxInAttrList];
    const nextStopIdx = attrIndices[currentAttrIdxInAttrList + 1];

    const newStops = [...day.stops];
    const temp = newStops[currStopIdx];
    newStops[currStopIdx] = newStops[nextStopIdx];
    newStops[nextStopIdx] = temp;

    const newDays = plan.days.map((d) => (d.day_number === dayNumber ? { ...d, stops: newStops } : d));
    await executeRecalculate(newDays);
  };

  // --- Handlers for Stop Alternatives & Regeneration ---
  const handleOpenAlternatives = async (dayNumber: number, stop: ItineraryStop) => {
    setRegeneratingStop({ dayNumber, stop });
    setAlternatives([]);
    setLoadingAlternatives(true);
    setActionError(null);

    try {
      const res = await getStopAlternatives(dayNumber, stop.stop_id, plan, activeReq);
      setAlternatives(res.candidates);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve alternatives.';
      setActionError(msg);
    } finally {
      setLoadingAlternatives(false);
    }
  };

  const handleApplyAlternative = async (candidate: StopRegenerateCandidate) => {
    if (!regeneratingStop || !plan.days) return;
    const { dayNumber, stop } = regeneratingStop;

    const travelers = activeReq.travelers_count || 1;
    const costMin = candidate.entry_fee_min_inr !== null && candidate.entry_fee_min_inr !== undefined
      ? candidate.entry_fee_min_inr * travelers
      : null;
    const costMax = candidate.entry_fee_max_inr !== null && candidate.entry_fee_max_inr !== undefined
      ? candidate.entry_fee_max_inr * travelers
      : costMin;

    const newDays = plan.days.map((d) => {
      if (d.day_number !== dayNumber) return d;
      return {
        ...d,
        stops: d.stops.map((s) => {
          if (s.stop_id !== stop.stop_id) return s;
          return {
            ...s,
            destination_id: candidate.destination_id,
            name: candidate.name,
            description: candidate.summary || null,
            duration_minutes: candidate.estimated_visit_minutes || 90,
            coordinates: candidate.coordinates || null,
            cost_min_inr: costMin,
            cost_max_inr: costMax,
            cost_status: candidate.cost_status,
            rationale: candidate.rationale,
            user_modified: true,
          };
        }),
      };
    });

    setRegeneratingStop(null);
    await executeRecalculate(newDays);
  };

  // --- Handlers for Adding a Destination ---
  const handleConfirmMoveDuplicate = async () => {
    if (!duplicateMovePrompt || !plan.days) return;
    const { dest, existingDay, targetDay, existingStop } = duplicateMovePrompt;
    setDuplicateMovePrompt(null);

    const destName = language === 'kn' && dest.name_kn ? dest.name_kn : dest.name_en;
    const destSummary = language === 'kn' && dest.summary_kn ? dest.summary_kn : dest.summary_en;

    const movedStop: ItineraryStop = {
      ...existingStop,
      stop_id: `stop-d${targetDay}-${dest.slug || 'dest'}-${Date.now()}`,
      destination_id: dest.id,
      name: destName,
      description: destSummary || existingStop.description,
      user_modified: true,
    };

    const newDays = plan.days.map((d) => {
      if (d.day_number === existingDay) {
        return {
          ...d,
          stops: d.stops.filter((s) => s.stop_id !== existingStop.stop_id),
        };
      }
      if (d.day_number === targetDay) {
        return {
          ...d,
          stops: [...d.stops, movedStop],
        };
      }
      return d;
    });

    await executeRecalculate(newDays);
  };

  const handleAddDestinationToDay = async (dest: DestinationRead) => {
    if (addingToDay === null || !plan.days) return;
    const dayNumber = addingToDay;

    const destName = language === 'kn' && dest.name_kn ? dest.name_kn : dest.name_en;

    // Check if destination is already scheduled anywhere across all days
    let existingDay: number | null = null;
    let existingStop: ItineraryStop | null = null;
    const normAdd = (dest.name_en || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]/g, '');

    for (const d of plan.days) {
      for (const s of d.stops) {
        if (s.stop_type === 'attraction' || s.stop_type === 'activity') {
          const normStop = (s.name || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]/g, '');
          const isSame =
            s.destination_id === dest.id ||
            s.destination_id === dest.slug ||
            (normAdd && normStop && normAdd === normStop && normAdd.length >= 4) ||
            (dest.coordinates && s.coordinates &&
              Math.hypot(dest.coordinates.lat - s.coordinates.lat, dest.coordinates.lon - s.coordinates.lon) < 0.005);
          if (isSame) {
            existingDay = d.day_number;
            existingStop = s;
            break;
          }
        }
      }
      if (existingDay !== null) break;
    }

    if (existingDay !== null && existingStop) {
      setAddingToDay(null);
      if (existingDay === dayNumber) {
        setActionError(
          language === 'kn'
            ? `"${destName}" ಈಗಾಗಲೇ ಈ ದಿನದ ಪ್ರವಾಸ ಪಟ್ಟಿಯಲ್ಲಿದೆ. ಪ್ರತಿ ತಾಣವನ್ನು ಒಮ್ಮೆ ಮಾತ್ರ ಭೇಟಿ ನೀಡಲಾಗುತ್ತದೆ.`
            : `"${destName}" is already scheduled on Day ${dayNumber}. Each destination can only be visited once per trip.`
        );
      } else {
        setDuplicateMovePrompt({
          dest,
          existingDay,
          targetDay: dayNumber,
          existingStop,
        });
      }
      return;
    }

    const travelers = activeReq.travelers_count || 1;
    const feeMin = dest.entry_fee_min_inr ?? null;
    const feeMax = dest.entry_fee_max_inr ?? feeMin;
    const costMin = feeMin !== null ? feeMin * travelers : null;
    const costMax = feeMax !== null ? feeMax * travelers : null;
    const costStatus = feeMin !== null ? 'verified' : 'unknown';

    const destSummary = language === 'kn' && dest.summary_kn ? dest.summary_kn : dest.summary_en;

    const newStop: ItineraryStop = {
      stop_id: `stop-d${dayNumber}-${dest.slug}-${Date.now()}`,
      destination_id: dest.id,
      stop_type: 'attraction',
      name: destName,
      description: destSummary || null,
      start_time: '14:00',
      end_time: '15:30',
      duration_minutes: dest.estimated_visit_minutes || 90,
      coordinates: dest.coordinates || null,
      cost_min_inr: costMin,
      cost_max_inr: costMax,
      currency: 'INR',
      cost_status: costStatus,
      rationale: `Added by user from ${dest.district?.name_en || dest.district_code}.`,
      user_modified: true,
    };

    const newDays = plan.days.map((d) => {
      if (d.day_number !== dayNumber) return d;
      return {
        ...d,
        stops: [...d.stops, newStop],
      };
    });

    setAddingToDay(null);
    await executeRecalculate(newDays);
  };

  // --- Handlers for Removing Stops ---
  const handleConfirmRemoveStop = async () => {
    if (!removingStop || !plan.days) return;
    const { dayNumber, stop } = removingStop;

    const newDays = plan.days.map((d) => {
      if (d.day_number !== dayNumber) return d;
      return {
        ...d,
        stops: d.stops.filter((s) => s.stop_id !== stop.stop_id),
      };
    });

    setRemovingStop(null);
    await executeRecalculate(newDays);
  };

  // --- Handlers for Day Regeneration ---
  const handleRegenerateDayAction = async (dayNumber: number) => {
    setIsRecalculating(true);
    setActionError(null);
    setConflictError(false);
    setConfirmingRegenDay(null);

    try {
      const response = await regenerateDay(dayNumber, plan, activeReq);
      if (shareToken && userRole === 'editor') {
        try {
          const updateRes = await updateSharedTrip(shareToken, {
            expected_version: version,
            itinerary: response,
          });
          if (onUpdatePlan) {
            onUpdatePlan(updateRes.snapshot);
          }
        } catch (updateErr: unknown) {
          const errStatus = (updateErr as { status?: number })?.status;
          const errMsg = updateErr instanceof Error ? updateErr.message : String(updateErr);
          if (errStatus === 409 || errMsg.includes('409') || errMsg.toLowerCase().includes('conflict')) {
            setConflictError(true);
            return;
          }
          throw updateErr;
        }
      } else if (onUpdatePlan) {
        onUpdatePlan(response);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to regenerate day.';
      setActionError(msg);
    } finally {
      setIsRecalculating(false);
    }
  };

  // --- Handlers for Export & Print ---
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const exportData = {
      $schema: 'https://nammakarnataka.travel/schemas/itinerary-v1.json',
      exported_at: new Date().toISOString(),
      title: request?.origin_label
        ? `${request.duration_days}-Day ${request.origin_label} Itinerary`
        : 'Namma Karnataka Itinerary',
      duration_days: plan.duration_days,
      travelers_count: activeReq.travelers_count,
      travel_mode: activeReq.travel_mode || 'driving_car',
      budget_scenario: activeReq.budget_scenario,
      days: (plan.days || []).map((d) => ({
        day_number: d.day_number,
        date: d.date,
        theme: d.theme,
        stops: d.stops.map((s) => {
          if (excludeNotes) {
            const rest = { ...s };
            delete rest.notes;
            return rest;
          }
          return s;
        }),
      })),
      budget: plan.budget_breakdown || null,
      disclosures: {
        routing: 'Terrain-adjusted road estimates based on Karnataka topography',
        transit: 'Curated static rail and bus corridors with fixed fare rules',
        costs: 'Deterministic budget calculations with contingency buffer',
      },
    };

    try {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const createUrl = typeof window !== 'undefined' && window.URL && typeof window.URL.createObjectURL === 'function'
        ? window.URL.createObjectURL
        : () => 'mock-blob-url';
      const revokeUrl = typeof window !== 'undefined' && window.URL && typeof window.URL.revokeObjectURL === 'function'
        ? window.URL.revokeObjectURL
        : () => {};

      const url = createUrl(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `namma_karnataka_itinerary_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      revokeUrl(url);
    } catch {
      // browser fallback
    }
  };

  // --- Handlers for Trip Sharing ---
  const handleCreateShare = async () => {
    const targetId = cloudTripId || tripId;
    if (!targetId) return;
    setShareLoading(true);
    setActionError(null);
    try {
      const share = await createTripShare(targetId, shareRole, shareExpiresDays);
      const origin = window.location.origin;
      const shareUrl = `${origin}?share_token=${share.share_token}`;
      setShareLinkGenerated(shareUrl);
      const res = await listTripShares(targetId);
      setActiveShares(res.items);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create share link.';
      setActionError(msg);
    } finally {
      setShareLoading(false);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    const targetId = cloudTripId || tripId;
    if (!targetId) return;
    try {
      await revokeTripShare(targetId, shareId);
      const res = await listTripShares(targetId);
      setActiveShares(res.items);
      if (shareLinkGenerated?.includes(shareId)) {
        setShareLinkGenerated(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to revoke share link.';
      setActionError(msg);
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareLinkGenerated) return;
    try {
      await navigator.clipboard.writeText(shareLinkGenerated);
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 2500);
    } catch {
      // fallback
    }
  };

  // Render timeline block for a day
  const renderDayTimelineBlock = (day: DayPlan) => {
    const attrStopsInDay = day.stops.filter(
      (s) => s.stop_type === 'attraction' || s.stop_type === 'activity'
    );

    return (
      <div
        key={day.day_number}
        id={`day-block-${day.day_number}`}
        className={`timeline-day-block ${activeDayTab === day.day_number ? 'day-block-active' : ''}`}
        data-testid={`day-block-${day.day_number}`}
      >
        <div className="day-header">
          <div>
            <span className="day-pill">{t('day')} {day.day_number}</span>
            <span className="day-theme-title">{day.theme}</span>
            {day.meals_covered && day.meals_covered.length > 0 && (
              <span className="day-badge-meals" style={{ marginLeft: '8px', fontSize: '0.8rem', background: '#ecfdf5', color: '#065f46', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                🍽️ {day.meals_covered.join(' · ')}
              </span>
            )}
            {day.start_location_name && day.end_location_name && (
              <div className="day-route-corridor" style={{ fontSize: '0.84rem', color: 'var(--accent-cyan, #38bdf8)', marginTop: '4px', fontWeight: 600 }}>
                🚩 {day.start_location_name} ➔ {day.end_location_name === day.start_location_name ? 'Local Circuit' : `🏁 ${day.end_location_name}`}
                {day.driving_distance_km ? ` · ~${day.driving_distance_km} km` : ''}
                {day.transit_minutes ? ` (${Math.floor(day.transit_minutes / 60)}h ${day.transit_minutes % 60}m driving)` : ''}
              </div>
            )}
          </div>

          <div className="day-actions-toolbar">
            <button
              type="button"
              className="btn-day-action"
              onClick={() => setAddingToDay(day.day_number)}
              data-testid={`add-stop-day-${day.day_number}`}
            >
              ➕ {t('addStop')}
            </button>
            <button
              type="button"
              className="btn-day-action"
              onClick={() => setConfirmingRegenDay(day.day_number)}
              data-testid={`regen-day-${day.day_number}`}
            >
              ✨ {t('regenerateDay')}
            </button>
            {day.daily_cost_min_inr !== null && day.daily_cost_min_inr !== undefined && (
              <span className="day-badge-cost">
                ₹{day.daily_cost_min_inr} – ₹{day.daily_cost_max_inr}
              </span>
            )}
            <span className="day-stops-count">{day.stops.length} stops</span>
          </div>
        </div>

        {day.warnings.length > 0 && (
          <div className="day-warnings-box">
            {day.warnings.map((w, idx) => (
              <div key={idx} className="day-warning-text">⚠️ {w}</div>
            ))}
          </div>
        )}

        <div className="day-stops-list">
          {day.stops.map((stop, sIdx) => {
            const matchedItem = plan.items.find((i) => i.id === stop.destination_id || i.slug === stop.destination_id);
            const stopCardTestId = matchedItem ? `stop-card-${matchedItem.slug}` : `stop-card-${stop.stop_id}`;

            const hasTravelLeg = stop.travel_leg || (stop.distance_from_prev_km !== null && stop.distance_from_prev_km !== undefined && stop.distance_from_prev_km > 0);
            const prevStopName = sIdx > 0 ? day.stops[sIdx - 1]?.name : day.start_location_name || undefined;
            const travelLegElement = hasTravelLeg ? (
              <TravelLegCard
                travelLeg={stop.travel_leg}
                distanceKm={stop.distance_from_prev_km}
                transitMinutes={stop.transit_from_prev_minutes}
                prevStopName={prevStopName}
                destStopName={stop.name}
                language={language}
              />
            ) : null;

            if (stop.stop_type === 'meal') {
              return (
                <React.Fragment key={stop.stop_id}>
                  {travelLegElement}
                  <article className="timeline-stop-card meal-stop-card" data-testid={stopCardTestId}>
                    <div className="stop-order-indicator stop-type-meal">
                      <span className="order-icon" aria-hidden="true">🍽️</span>
                    </div>
                    <div className="stop-content">
                      <div className="stop-header-row">
                        <h4 className="stop-name">{stop.name}</h4>
                        <div className="stop-pills">
                          <span className="stop-time-badge">⏰ {stop.start_time} – {stop.end_time}</span>
                          <span className="card-category-pill meal-pill">
                            {language === 'kn' ? 'ಆಹಾರ ಮತ್ತು ಪಾನೀಯ' : 'Dining & Food'}
                          </span>
                          {stop.source_reference && (
                            <span className="card-district-pill">🏛️ {stop.source_reference}</span>
                          )}
                        </div>
                      </div>
                      {stop.description && <p className="stop-summary text-muted">{stop.description}</p>}
                      <div className="stop-footer-row">
                        <span className="stop-fee-info">
                          💵 {stop.cost_status === 'verified' ? (language === 'kn' ? 'ವೆಚ್ಚ:' : 'Cost:') : (language === 'kn' ? 'ಅಂದಾಜು ವೆಚ್ಚ:' : 'Est. Cost:')} ₹{stop.cost_min_inr} – ₹{stop.cost_max_inr}
                        </span>
                        {stop.cost_status === 'verified' ? (
                          <span className="status-badge status-verified">✓ {language === 'kn' ? 'ಪರಿಶೀಲಿಸಲಾಗಿದೆ' : 'Verified'}</span>
                        ) : (
                          <span className="status-badge status-estimated">≈ {language === 'kn' ? 'ಅಂದಾಜು' : 'Estimated'}</span>
                        )}
                      </div>
                    </div>
                  </article>
                </React.Fragment>
              );
            }

            if (stop.stop_type === 'accommodation') {
              return (
                <React.Fragment key={stop.stop_id}>
                  {travelLegElement}
                  <article className="timeline-stop-card accommodation-stop-card" data-testid={stopCardTestId}>
                    <div className="stop-order-indicator stop-type-stay">
                      <span className="order-icon" aria-hidden="true">🏨</span>
                    </div>
                    <div className="stop-content">
                      <div className="stop-header-row">
                        <h4 className="stop-name">{stop.name}</h4>
                        <div className="stop-pills">
                          <span className="stop-time-badge">🌙 {stop.start_time} Check-in</span>
                          <span className="card-category-pill stay-pill">
                            {language === 'kn' ? 'ವಾಸ್ತವ್ಯ' : 'Lodging'}
                          </span>
                          {stop.source_reference && (
                            <span className="card-district-pill">🏛️ {stop.source_reference}</span>
                          )}
                        </div>
                      </div>
                      {stop.description && <p className="stop-summary text-muted">{stop.description}</p>}
                      <div className="stop-footer-row">
                        <span className="stop-fee-info">
                          💵 {stop.cost_status === 'verified' ? (language === 'kn' ? 'ದರ:' : 'Tariff:') : (language === 'kn' ? 'ಅಂದಾಜು ದರ:' : 'Est. Lodging:')} ₹{stop.cost_min_inr} – ₹{stop.cost_max_inr}
                        </span>
                        {stop.cost_status === 'verified' ? (
                          <span className="status-badge status-verified">✓ {language === 'kn' ? 'ದೃಢೀಕೃತ ದರ' : 'Verified Tariff'}</span>
                        ) : (
                          <span className="status-badge status-estimated">≈ {language === 'kn' ? 'ಅಂದಾಜು' : 'Estimated'}</span>
                        )}
                      </div>
                    </div>
                  </article>
                </React.Fragment>
              );
            }

            if (stop.stop_type === 'event') {
              return (
                <React.Fragment key={stop.stop_id}>
                  {travelLegElement}
                  <article className="timeline-stop-card event-stop-card" data-testid={stopCardTestId}>
                    <div className="stop-order-indicator stop-type-event">
                      <span className="order-icon" aria-hidden="true">🎪</span>
                    </div>
                    <div className="stop-content">
                      <div className="stop-header-row">
                        <h4 className="stop-name">{stop.name}</h4>
                        <div className="stop-pills">
                          <span className="stop-time-badge">⏰ {stop.start_time} – {stop.end_time}</span>
                          <span className="card-category-pill event-pill">
                            🎪 {language === 'kn' ? 'ಸಾಂಸ್ಕೃತಿಕ ಉತ್ಸವ / ಜಾತ್ರೆ' : 'Cultural Festival'}
                          </span>
                          {stop.source_reference && (
                            <a href={stop.source_reference} target="_blank" rel="noopener noreferrer" className="card-district-pill" style={{ textDecoration: 'underline' }}>
                              🏛️ {language === 'kn' ? 'ಮೂಲ ಪರಿಶೀಲನೆ' : 'Official Citation'}
                            </a>
                          )}
                        </div>
                      </div>
                      {stop.description && <p className="stop-summary text-muted">{stop.description}</p>}
                      <div className="stop-footer-row">
                        <span className="stop-fee-info">
                          🎟️ {stop.cost_min_inr !== null && stop.cost_min_inr !== undefined
                            ? (stop.cost_min_inr === 0 ? (language === 'kn' ? 'ಉಚಿತ ಪ್ರವೇಶ' : 'Free Entry') : `₹${stop.cost_min_inr}`)
                            : (language === 'kn' ? 'ಪ್ರವೇಶ ಶುಲ್ಕ ಅನ್ವಯಿಸಬಹುದು' : 'Entry fee may apply')}
                        </span>
                        {stop.cost_status === 'verified' ? (
                          <span className="status-badge status-verified">✓ {language === 'kn' ? 'ದೃಢೀಕೃತ ಉತ್ಸವ' : 'Verified Event'}</span>
                        ) : (
                          <span className="status-badge status-estimated">≈ {language === 'kn' ? 'ೠತುಮಾನದ ಉತ್ಸವ' : 'Seasonal Festival'}</span>
                        )}
                      </div>
                    </div>
                  </article>
                </React.Fragment>
              );
            }

            if (stop.stop_type === 'transport') {
              return (
                <React.Fragment key={stop.stop_id}>
                  {travelLegElement}
                  <article className="timeline-stop-card transport-stop-card" data-testid={stopCardTestId}>
                    <div className="stop-order-indicator stop-type-transport">
                      <span className="order-icon" aria-hidden="true">🚗</span>
                    </div>
                    <div className="stop-content">
                      <div className="stop-header-row">
                        <h4 className="stop-name">{stop.name}</h4>
                        <div className="stop-pills">
                          <span className="stop-time-badge">⏰ {stop.start_time} – {stop.end_time}</span>
                          <span className="card-category-pill transport-pill">
                            {language === 'kn' ? 'ಹಿಂತಿರುಗುವ ಪ್ರಯಾಣ' : 'Return Transit'}
                          </span>
                        </div>
                      </div>
                      {stop.description && <p className="stop-summary text-muted">{stop.description}</p>}
                      <div className="stop-footer-row">
                        <span className="stop-fee-info">
                          🚗 {stop.distance_from_prev_km} km ({stop.transit_from_prev_minutes} mins)
                        </span>
                      </div>
                    </div>
                  </article>
                </React.Fragment>
              );
            }

            // Attraction or Activity Stop
            const categoryKey = matchedItem ? (`cat_${matchedItem.category}` as TranslationKey) : undefined;
            const categoryLabel = categoryKey ? t(categoryKey) || matchedItem?.category : 'Attraction';

            const attrIdxInDay = attrStopsInDay.findIndex((s) => s.stop_id === stop.stop_id);
            const isFirstAttr = attrIdxInDay === 0;
            const isLastAttr = attrIdxInDay === attrStopsInDay.length - 1;

            return (
              <React.Fragment key={stop.stop_id}>
                {travelLegElement}
                <article className="timeline-stop-card" data-testid={stopCardTestId}>
                  <div className="stop-order-indicator">
                    <span className="order-number">{sIdx + 1}</span>
                  </div>

                  <div className="stop-content">
                    <div className="stop-header-row">
                      <h4 className="stop-name">{stop.name}</h4>
                      <div className="stop-pills">
                        <span className="stop-time-badge">⏰ {stop.start_time} – {stop.end_time}</span>
                        <span className="stop-duration-badge">⏳ {stop.duration_minutes}m</span>
                        <span className="card-category-pill">{categoryLabel}</span>
                        {matchedItem && (
                          <span className="card-district-pill">📍 {matchedItem.district_name || matchedItem.district_code}</span>
                        )}
                        {matchedItem?.is_offbeat && (
                          <span className="card-offbeat-badge">⭐ {t('offbeatBadge')}</span>
                        )}
                        {stop.user_modified && (
                          <span className="pill-customized">✏️ {t('stopCustomized')}</span>
                        )}
                        {stop.locked && (
                          <span className="pill-locked">🔒 {t('lockedBadge')}</span>
                        )}
                      </div>
                    </div>

                    {stop.description && <p className="stop-summary">{stop.description}</p>}

                    {stop.notes && (
                      <div className="stop-user-notes" data-testid={`stop-notes-${stop.stop_id}`}>
                        <strong>📝 {t('notes')}:</strong> {stop.notes}
                      </div>
                    )}

                    {stop.transit_from_prev_minutes && stop.distance_from_prev_km && (
                      <div className="transit-indicator-row">
                        🚗 ~{stop.distance_from_prev_km} km ({stop.transit_from_prev_minutes} mins ·{' '}
                        {stop.transit_method === 'terrain_adjusted_estimate'
                          ? language === 'kn'
                            ? 'ಘಟ್ಟ/ರಸ್ತೆ ಅಂದಾಜು'
                            : 'Terrain-adjusted road estimate'
                          : language === 'kn'
                          ? 'ನೇರ ರೇಖೆ ಅಂದಾಜು'
                          : 'Straight-line estimate'}
                        )
                      </div>
                    )}

                    {(() => {
                      const prevStop = sIdx > 0 ? day.stops[sIdx - 1] : null;
                      const prevMatched = prevStop
                        ? plan.items.find(
                            (i) => i.id === prevStop.destination_id || i.slug === prevStop.destination_id
                          )
                        : null;
                      if (prevMatched?.coordinates && matchedItem?.coordinates) {
                        return (
                          <TransitComparisonCard
                            originLat={prevMatched.coordinates.lat}
                            originLon={prevMatched.coordinates.lon}
                            destLat={matchedItem.coordinates.lat}
                            destLon={matchedItem.coordinates.lon}
                            language={language}
                          />
                        );
                      }
                      return null;
                    })()}

                    {stop.rationale && (
                      <div className="stop-rationale-box">
                        <span className="stop-rationale-label">💡 <strong>{t('whyThisStop')}</strong></span>{' '}
                        <span className="stop-rationale-text">{stop.rationale}</span>
                      </div>
                    )}

                    <div className="stop-footer-row">
                      <span className="stop-fee-info">
                        🎟️ Entry:{' '}
                        {stop.cost_min_inr === 0 && stop.cost_max_inr === 0 ? (
                          <span className="text-free">{t('feeFree')}</span>
                        ) : stop.cost_min_inr !== undefined && stop.cost_min_inr !== null ? (
                          <span>
                            ₹{stop.cost_min_inr}
                            {stop.cost_max_inr && stop.cost_max_inr > stop.cost_min_inr
                              ? ` - ₹${stop.cost_max_inr}`
                              : ''}
                          </span>
                        ) : (
                          <span className="text-unknown">{t('feeUnknown')}</span>
                        )}
                      </span>

                      {stop.coordinates && (
                        <span className="stop-coords-text">
                          📍 {stop.coordinates.lat.toFixed(4)}° N, {stop.coordinates.lon.toFixed(4)}° E
                        </span>
                      )}
                    </div>

                    {/* Interactive Stop Actions Toolbar (Phase 5) */}
                    <div className="stop-actions-row" data-testid={`stop-actions-${stop.stop_id}`}>
                      <button
                        type="button"
                        className="btn-stop-action"
                        onClick={() => handleOpenEdit(day.day_number, stop)}
                        data-testid={`edit-stop-${stop.stop_id}`}
                      >
                        ✏️ {t('editStop')}
                      </button>

                      <button
                        type="button"
                        className="btn-stop-action"
                        onClick={() => handleMoveUp(day.day_number, stop.stop_id)}
                        disabled={isFirstAttr}
                        data-testid={`move-up-${stop.stop_id}`}
                        aria-label="Move stop earlier in day"
                      >
                        ⬆️ {t('moveUp')}
                      </button>

                      <button
                        type="button"
                        className="btn-stop-action"
                        onClick={() => handleMoveDown(day.day_number, stop.stop_id)}
                        disabled={isLastAttr}
                        data-testid={`move-down-${stop.stop_id}`}
                        aria-label="Move stop later in day"
                      >
                        ⬇️ {t('moveDown')}
                      </button>

                      <button
                        type="button"
                        className="btn-stop-action btn-stop-regen"
                        onClick={() => handleOpenAlternatives(day.day_number, stop)}
                        data-testid={`regen-stop-${stop.stop_id}`}
                      >
                        ✨ {t('regenerateStop')}
                      </button>

                      <button
                        type="button"
                        className="btn-stop-action btn-stop-danger"
                        onClick={() => setRemovingStop({ dayNumber: day.day_number, stop })}
                        data-testid={`remove-stop-${stop.stop_id}`}
                      >
                        🗑️ {t('removeStop')}
                      </button>
                    </div>
                  </div>
                </article>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <section className="itinerary-section" aria-label="Generated Itinerary">
      {/* Recalculating Overlay Status */}
      {isRecalculating && (
        <div className="recalculating-overlay" role="status" aria-live="polite">
          <span className="spinner-icon">🔄</span>
          <span>{t('recalculatingSchedule')}</span>
        </div>
      )}

      {/* Action Error Banner */}
      {actionError && (
        <div className="app-error-banner" role="alert" style={{ marginBottom: '1rem' }}>
          <span>⚠️ {actionError}</span>
          <button type="button" onClick={() => setActionError(null)}>✕</button>
        </div>
      )}

      {/* Version Conflict Banner */}
      {conflictError && (
        <div className="version-conflict-banner" data-testid="version-conflict-alert" style={{ background: '#fef2f2', border: '1px solid #ef4444', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>⚠️ {t('versionConflictTitle')}</strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>{t('versionConflictMsg')}</p>
          </div>
          {onReloadSharedTrip && (
            <button
              type="button"
              className="btn-primary"
              style={{ background: '#dc2626', borderColor: '#dc2626' }}
              onClick={() => {
                setConflictError(false);
                onReloadSharedTrip();
              }}
              data-testid="reload-latest-plan-btn"
            >
              🔄 {t('reloadLatest')}
            </button>
          )}
        </div>
      )}

      {/* Viewer / Editor Role Status Banner */}
      {isReadOnly && (
        <div className="viewer-role-banner" data-testid="viewer-mode-banner" style={{ background: '#eff6ff', border: '1px solid #3b82f6', color: '#1e40af', padding: '10px 16px', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
          👁️ {t('viewerModeBanner')}
        </div>
      )}

      {userRole === 'editor' && (
        <div className="editor-role-banner" data-testid="editor-mode-banner" style={{ background: '#f0fdf4', border: '1px solid #22c55e', color: '#166534', padding: '8px 16px', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
          ✏️ {t('editorModeBanner')} ({t('versionLabel')}{version})
        </div>
      )}

      <div className="itinerary-header">
        <div>
          <div className="itinerary-badges">
            {plan.generation_mode === 'ai' ? (
              <span className="badge badge-ai" data-testid="generation-mode-ai">
                ✨ {t('modeAi')} ({plan.provider_used.toUpperCase()})
              </span>
            ) : (
              <span className="badge badge-fallback" data-testid="generation-mode-fallback">
                🛡️ {t('modeFallback')}
              </span>
            )}
            <span className="badge badge-neutral">
              📅 {plan.duration_days} {language === 'kn' ? 'ದಿನಗಳು' : 'Days'} · {plan.total_destinations} {t('destinationsFound')}
            </span>
            <div
              className="badge"
              data-testid="pwa-sync-status-pill"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: syncInfo.status === 'conflict' ? '#fef2f2' : syncInfo.pendingCount > 0 ? '#fffbeb' : '#f0fdf4',
                color: syncInfo.status === 'conflict' ? '#991b1b' : syncInfo.pendingCount > 0 ? '#b45309' : '#166534',
                border: '1px solid currentColor',
              }}
            >
              <span>
                {syncInfo.status === 'conflict'
                  ? `⚠️ ${t('syncStatusConflict')}`
                  : syncInfo.status === 'needs_auth'
                  ? `🔒 ${t('syncStatusNeedsAuth')}`
                  : syncInfo.pendingCount > 0
                  ? `⏳ ${syncInfo.pendingCount} ${t('syncStatusPending')}`
                  : `✓ ${t('syncStatusSynced')}`}
              </span>
              {syncInfo.pendingCount > 0 && (
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncingQueue}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0 2px',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    color: 'inherit',
                  }}
                  data-testid="pwa-sync-now-btn"
                >
                  {isSyncingQueue ? '...' : t('syncNowBtn')}
                </button>
              )}
            </div>
          </div>
          <h2>{t('itineraryTitle')}</h2>
        </div>

        <div className="itinerary-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowExportModal(true)}
            data-testid="export-itinerary-btn"
          >
            📄 {t('exportItinerary')}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setShowShareModal(true);
              const targetId = cloudTripId || tripId;
              if (targetId) {
                listTripShares(targetId).then((res) => setActiveShares(res.items)).catch(() => {});
              }
            }}
            data-testid="share-trip-btn"
          >
            🔗 {t('shareTrip')}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowMap(!showMap)}
            data-testid="toggle-map-btn"
          >
            {showMap ? `🗺️ ${t('hideMap')}` : `🗺️ ${t('viewOnMap')}`}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={onReplan}
            data-testid="adjust-preferences-btn"
          >
            ⚙️ {t('adjustPreferences')}
          </button>
          {!isReadOnly && (
            <button
              type="button"
              className={`btn-primary ${isSaved ? 'btn-saved' : ''}`}
              onClick={() => onSaveTrip(plan)}
              data-testid="save-trip-btn"
            >
              {isSaved ? `✓ Saved` : `💾 ${t('saveItinerary')}`}
            </button>
          )}
        </div>
      </div>


      {/* Day Navigation Controls: [Previous Day] Day 1 Day 2 ... [Next Day] */}
      {effectiveDays.length > 0 && (
        <DayNavigation
          currentDay={activeDay}
          totalDays={effectiveDays.length}
          onSelectDay={handleSelectDay}
          isAllDaysView={isAllDaysView}
          onToggleAllDaysView={() => setIsAllDaysView((prev) => !prev)}
          language={language}
        />
      )}

      {isAllDaysView ? (
        /* Phase 6: Trip-Wide Overview */
        <TripWideOverview
          plan={plan}
          effectiveDays={effectiveDays}
          originLabel={plan.origin_label || 'Bengaluru'}
          language={language}
          onSelectDay={handleSelectDay}
          destinationsMap={destinationsMap}
          onReplan={onReplan}
        />
      ) : (
        <>
          {/* Daily Destination Gallery (Refined Light Travel Scrapbook) */}
          <PolaroidLineCarousel
            slides={carouselSlides}
            activeIndex={activeSlideIndex}
            onChange={(index) => setActiveSlideIndex(index)}
            dayTitle={galleryDayTitle}
            daySubtitle={galleryDaySubtitle}
            dayNumber={activeDay}
            autoplay={0}
            language={language}
            emptyStateTitle={
              language === 'kn'
                ? 'ಈ ದಿನಕ್ಕೆ ಯಾವುದೇ ದೃಶ್ಯವೀಕ್ಷಣೆಯ ತಾಣಗಳು ನಿಗದಿಯಾಗಿಲ್ಲ.'
                : 'No sightseeing destinations scheduled for this day.'
            }
            emptyStateSubtitle={
              language === 'kn'
                ? 'ನಿಮ್ಮ ವಾಸ್ತವ್ಯ ಮತ್ತು ಪ್ರಯಾಣದ ವಿವರಗಳು ಕೆಳಗಿನ ವಿವರಗಳಲ್ಲಿ ಲಭ್ಯವಿದೆ.'
                : 'Your accommodation and travel details are available in View Details.'
            }
          />

          {currentDayPlan && (
            <div className="day-view-wrapper" data-testid={`day-view-${currentDayPlan.day_number}`}>
            {/* Phase 3: Selected Day Overview */}
            <DayOverview
              day={currentDayPlan}
              totalDays={effectiveDays.length}
              originLabel={plan.origin_label || 'Bengaluru'}
              language={language}
              showDetails={showDetails}
              onToggleDetails={() => setShowDetails((prev) => !prev)}
              onAddStop={(dNum) => setAddingToDay(dNum)}
              onRegenerateDay={(dNum) => setConfirmingRegenDay(dNum)}
              isReadOnly={isReadOnly}
            />

            {/* Phase 5: View Details Experience */}
            {showDetails && (
              <div className="nk-day-details" data-testid="day-details-container">
                {/* 5.1 Day Route Map */}
                {showMap && (
                  <div className="nk-details-card">
                    <div className="nk-details-card-header">
                      <h3 className="nk-details-card-title">
                        <span>🗺️</span>
                        <span>
                          {language === 'kn'
                            ? `ದಿನ ${currentDayPlan.day_number} ರಸ್ತೆ ನಕ್ಷೆ ಮತ್ತು ಮಾರ್ಗ`
                            : `Day ${currentDayPlan.day_number} Route & Directions Map`}
                        </span>
                      </h3>
                      <span className="nk-details-card-subtitle">
                        {currentDayPlan.start_location_name} ➔ {currentDayPlan.end_location_name || currentDayPlan.start_location_name}
                      </span>
                    </div>
                    <MapView
                      stops={plan.items}
                      dayPlans={plan.days}
                      language={language}
                      originLabel={plan.origin_label || 'Bengaluru'}
                      travelMode={activeReq.travel_mode || 'driving'}
                      activeDayFilter={currentDayPlan.day_number}
                    />
                  </div>
                )}

                {/* 5.2 Stop-by-Stop Schedule Timeline */}
                <div className="timeline-container" data-testid="itinerary-timeline">
                  {renderDayTimelineBlock(currentDayPlan)}
                </div>

                {/* 5.4 Daily Budget */}
                <DailyBudgetSummary
                  day={currentDayPlan}
                  travelersCount={activeReq.travelers_count}
                  language={language}
                />

                {/* 5.5 Accommodation & Overnight Stay */}
                <OvernightStayCard
                  day={currentDayPlan}
                  nextDay={effectiveDays.find((d) => d.day_number === currentDayPlan.day_number + 1)}
                  isLastDay={currentDayPlan.day_number === effectiveDays.length}
                  travelersCount={activeReq.travelers_count}
                  originLabel={plan.origin_label || 'Bengaluru'}
                  language={language}
                />

                {/* 5.6 Festivals and Local Events */}
                <DayEventsSection
                  day={currentDayPlan}
                  events={plan.recommended_festivals}
                  language={language}
                />
              </div>
            )}

            {/* Trip-Wide Budget Summary Section */}
            <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-subtle, #DCE6F2)', paddingTop: '1.5rem' }}>
              <BudgetSummary stops={plan.items} language={language} budget={plan.budget_breakdown} />
            </div>
          </div>
        )}
      </>
    )}

      {/* Assumptions & Limitations Card */}
      {plan.assumptions && plan.assumptions.length > 0 && (
        <div className="itinerary-assumptions-card">
          <h4>ℹ️ {language === 'kn' ? 'ಪ್ರವಾಸ ಯೋಜನೆ ಆಧಾರಗಳು' : 'Planning Assumptions'}</h4>
          <ul className="assumptions-list">
            {plan.assumptions.map((a, idx) => (
              <li key={idx}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: Edit Stop Details Dialog                              */}
      {/* ============================================================== */}
      {editingStop && (
        <div
          className="modal-backdrop"
          onClick={() => setEditingStop(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-stop-title"
        >
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="edit-stop-title">✏️ {t('editStopTitle')}</h3>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEditingStop(null)}
                style={{ padding: '0.2rem 0.5rem' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: 0, fontWeight: 600, color: '#fff' }}>
              {editingStop.stop.name}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                  ⏱️ {t('durationMinutes')}:
                </label>
                <input
                  type="number"
                  min={15}
                  max={360}
                  step={15}
                  value={editDuration}
                  onChange={(e) => setEditDuration(Math.max(15, Math.min(360, Number(e.target.value))))}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  data-testid="edit-duration-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                  📝 {t('notes')}:
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder={t('stopNotesPlaceholder')}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  data-testid="edit-notes-input"
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="lock-stop-check"
                  checked={editLocked}
                  onChange={(e) => setEditLocked(e.target.checked)}
                  data-testid="edit-lock-checkbox"
                />
                <label htmlFor="lock-stop-check" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                  🔒 {t('lockStop')}
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEditingStop(null)}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveStopEdit}
                data-testid="save-stop-edit-btn"
              >
                💾 {t('saveChanges')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: Regenerate / Grounded Alternatives Dialog             */}
      {/* ============================================================== */}
      {regeneratingStop && (
        <div
          className="modal-backdrop"
          onClick={() => setRegeneratingStop(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="regen-stop-title"
        >
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="regen-stop-title">✨ {t('alternativeStops')}</h3>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setRegeneratingStop(null)}
                style={{ padding: '0.2rem 0.5rem' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Alternatives to replace <strong>{regeneratingStop.stop.name}</strong> on Day {regeneratingStop.dayNumber}:
            </p>

            {loadingAlternatives && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-cyan)' }}>
                🔄 {t('regenerating')}
              </div>
            )}

            {!loadingAlternatives && alternatives.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                {t('noAlternativesFound')}
              </div>
            )}

            {!loadingAlternatives && alternatives.length > 0 && (
              <div className="candidate-card-list" data-testid="candidates-list">
                {alternatives.map((cand) => (
                  <div key={cand.destination_id} className="candidate-card" data-testid={`candidate-card-${cand.slug}`}>
                    <div className="candidate-header">
                      <div>
                        <h4 className="candidate-name">{cand.name}</h4>
                        <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.2rem' }}>
                          <span className="card-category-pill">{cand.category}</span>
                          <span className="card-district-pill">📍 {cand.district_name || cand.district_code}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn-primary"
                        style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                        onClick={() => handleApplyAlternative(cand)}
                        data-testid={`select-cand-${cand.slug}`}
                      >
                        ✓ {t('selectAlternative')}
                      </button>
                    </div>

                    {cand.summary && (
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {cand.summary}
                      </p>
                    )}

                    <div className="candidate-deltas">
                      <span className="delta-pill-time">
                        🚗 {cand.transit_delta_minutes !== null && cand.transit_delta_minutes !== undefined && cand.transit_delta_minutes > 0
                          ? `+${cand.transit_delta_minutes}m detour`
                          : cand.transit_delta_minutes !== null && cand.transit_delta_minutes !== undefined && cand.transit_delta_minutes < 0
                          ? `${cand.transit_delta_minutes}m closer`
                          : '~0m travel diff'}
                      </span>

                      <span className="delta-pill-fee">
                        🎟️ {cand.entry_fee_min_inr === 0 ? 'Free Entry' : `₹${cand.entry_fee_min_inr || 0}`}
                      </span>

                      {cand.fee_difference_inr !== null && cand.fee_difference_inr !== undefined && cand.fee_difference_inr !== 0 && (
                        <span style={{ fontSize: '0.75rem', color: cand.fee_difference_inr > 0 ? '#fbbf24' : '#4ade80' }}>
                          {cand.fee_difference_inr > 0 ? `(+₹${cand.fee_difference_inr})` : `(-₹${Math.abs(cand.fee_difference_inr)})`}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#fde68a', fontStyle: 'italic' }}>
                      💡 {cand.rationale}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: Add Destination to Day Dialog                         */}
      {/* ============================================================== */}
      {addingToDay !== null && (
        <div
          className="modal-backdrop"
          onClick={() => setAddingToDay(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-dest-title"
        >
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="add-dest-title">➕ {t('addDestinationToDay')} {addingToDay}</h3>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setAddingToDay(null)}
                style={{ padding: '0.2rem 0.5rem' }}
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              placeholder={t('searchCatalog')}
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '0.375rem',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              data-testid="catalog-search-input"
            />

            {loadingCatalog && (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--accent-cyan)' }}>
                🔄 Loading verified catalogue...
              </div>
            )}

            {!loadingCatalog && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '50vh', overflowY: 'auto' }}>
                {catalogDests
                  .filter((d) => {
                    if (!catalogSearch.trim()) return true;
                    const query = catalogSearch.toLowerCase();
                    return (
                      d.name_en.toLowerCase().includes(query) ||
                      (d.name_kn && d.name_kn.includes(query)) ||
                      (d.district?.name_en && d.district.name_en.toLowerCase().includes(query)) ||
                      d.category.toLowerCase().includes(query)
                    );
                  })
                  .slice(0, 15)
                  .map((dest) => (
                    <div
                      key={dest.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.65rem 0.85rem',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid #334155',
                        borderRadius: '0.375rem',
                      }}
                      data-testid={`catalog-item-${dest.slug}`}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>
                          {language === 'kn' && dest.name_kn ? dest.name_kn : dest.name_en}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          📍 {dest.district?.name_en || dest.district_code} · {dest.category} · ⏱️ {dest.estimated_visit_minutes || 90}m
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                        onClick={() => handleAddDestinationToDay(dest)}
                        data-testid={`add-to-day-btn-${dest.slug}`}
                      >
                        ➕ {t('selectDestination')}
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: Remove Stop Confirmation Dialog                       */}
      {/* ============================================================== */}
      {removingStop && (
        <div
          className="modal-backdrop"
          onClick={() => setRemovingStop(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-stop-title"
        >
          <div className="modal-container" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="remove-stop-title">🗑️ {t('confirmRemoveTitle')}</h3>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setRemovingStop(null)}
                style={{ padding: '0.2rem 0.5rem' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.95rem', color: '#fff' }}>
              <strong>{removingStop.stop.name}</strong>
            </p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {t('confirmRemoveMsg')}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setRemovingStop(null)}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
                onClick={handleConfirmRemoveStop}
                data-testid="confirm-remove-btn"
              >
                🗑️ {t('remove')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4B: Duplicate Destination Move Dialog                    */}
      {/* ============================================================== */}
      {duplicateMovePrompt && (
        <div
          className="modal-backdrop"
          onClick={() => setDuplicateMovePrompt(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="duplicate-move-title"
        >
          <div className="modal-container" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="duplicate-move-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#f59e0b', fontSize: '1.1rem' }}>⚠️</span>
                {language === 'kn' ? 'ತಾಣ ಈಗಾಗಲೇ ನಿಗದಿಯಾಗಿದೆ' : 'Destination Already Scheduled'}
              </h3>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDuplicateMovePrompt(null)}
                style={{ padding: '0.2rem 0.5rem' }}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <p style={{ margin: '0.5rem 0', fontSize: '0.95rem', color: '#fff' }}>
              <strong>{language === 'kn' && duplicateMovePrompt.dest.name_kn ? duplicateMovePrompt.dest.name_kn : duplicateMovePrompt.dest.name_en}</strong>
            </p>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              {language === 'kn'
                ? `ಈ ತಾಣವು ಈಗಾಗಲೇ ದಿನ ${duplicateMovePrompt.existingDay} ರಲ್ಲಿದೆ. ಪುನರಾವರ್ತನೆಗಳನ್ನು ತಪ್ಪಿಸಲು ತಾಣಗಳನ್ನು ಪ್ರವಾಸದಲ್ಲಿ ಒಮ್ಮೆ ಮಾತ್ರ ಭೇಟಿ ನೀಡಲಾಗುತ್ತದೆ. ನೀವು ಇದನ್ನು ದಿನ ${duplicateMovePrompt.targetDay} ಕ್ಕೆ ಸ್ಥಳಾಂತರಿಸಲು ಬಯಸುವಿರಾ?`
                : `This destination is already scheduled on Day ${duplicateMovePrompt.existingDay}. To maintain itinerary variety and prevent repetition, attractions can only be visited once per trip. Would you like to move it to Day ${duplicateMovePrompt.targetDay} instead?`}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDuplicateMovePrompt(null)}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={handleConfirmMoveDuplicate}
                data-testid="confirm-move-duplicate-btn"
              >
                {language === 'kn' ? `ದಿನ ${duplicateMovePrompt.targetDay} ಕ್ಕೆ ಸರಿಸಿ` : `Move to Day ${duplicateMovePrompt.targetDay}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: Regenerate Day Confirmation Dialog                     */}
      {/* ============================================================== */}
      {confirmingRegenDay !== null && (
        <div
          className="modal-backdrop"
          onClick={() => setConfirmingRegenDay(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="regen-day-title"
        >
          <div className="modal-container" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="regen-day-title">✨ {t('confirmRegenDayTitle')}</h3>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setConfirmingRegenDay(null)}
                style={{ padding: '0.2rem 0.5rem' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.95rem', color: '#fff' }}>
              Day {confirmingRegenDay}
            </p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {t('confirmRegenDayMsg')}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setConfirmingRegenDay(null)}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleRegenerateDayAction(confirmingRegenDay)}
                data-testid="confirm-regen-day-btn"
              >
                ✨ {t('regenerateDay')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 6: Export Itinerary Dialog                                */}
      {/* ============================================================== */}
      {showExportModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowExportModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-modal-title"
        >
          <div className="modal-container" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="export-modal-title">📄 {t('exportItinerary')}</h3>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowExportModal(false)}
                style={{ padding: '0.2rem 0.5rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <h4 style={{ margin: '0 0 0.5rem', color: '#0891B2', fontSize: '1.05rem', fontWeight: 700 }}>
                {request?.origin_label ? `${request.duration_days}-Day ${request.origin_label} Itinerary` : t('itineraryTitle')}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <div>📅 <strong>{plan.duration_days}</strong> {language === 'kn' ? 'ದಿನಗಳು' : 'Days'}</div>
                <div>📍 <strong>{plan.total_destinations}</strong> {t('destinationsFound')}</div>
                <div>💰 <strong>₹{plan.budget_breakdown?.grand_total_min_inr ? plan.budget_breakdown.grand_total_min_inr.toLocaleString() : '0'}</strong> ({activeReq.budget_scenario})</div>
                <div>🚗 <strong>{(activeReq.travel_mode || 'driving_car').replace('_', ' ').toUpperCase()}</strong></div>
              </div>
            </div>

            <div style={{ margin: '0.75rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)', background: '#F8FAFC', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>ℹ️ {t('reliabilityDisclosures')}</strong>
              <ul style={{ margin: '0.35rem 0 0 1.2rem', padding: 0, fontSize: '0.8rem', lineHeight: '1.4' }}>
                <li>{t('routingEstimateNotice')}</li>
                <li>{t('staticTransitNotice')}</li>
                <li>{t('deterministicBudgetNotice')}</li>
              </ul>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={excludeNotes}
                onChange={(e) => setExcludeNotes(e.target.checked)}
                data-testid="exclude-notes-checkbox"
              />
              <span>{t('excludePrivateNotes')}</span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowExportModal(false)}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handlePrint}
                data-testid="print-itinerary-btn"
              >
                🖨️ {t('printItinerary')}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleDownloadJson}
                data-testid="download-json-btn"
              >
                💾 {t('downloadJson')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 7: Share Trip Dialog                                      */}
      {/* ============================================================== */}
      {showShareModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowShareModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-modal-title"
        >
          <div className="modal-container" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="share-modal-title">🔗 {t('shareTripModalTitle')}</h3>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowShareModal(false)}
                style={{ padding: '0.2rem 0.5rem' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
              {t('shareTripModalDesc')}
            </p>

            {!(cloudTripId || tripId) ? (
              <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#fca5a5', fontSize: '0.9rem' }}>
                ⚠️ {t('saveTripFirstToShare')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#cbd5e1' }}>
                      {t('shareRoleLabel')}
                    </label>
                    <select
                      className="form-control"
                      value={shareRole}
                      onChange={(e) => setShareRole(e.target.value as 'viewer' | 'editor')}
                      data-testid="share-role-select"
                      style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px' }}
                    >
                      <option value="viewer">👁️ {t('roleViewer')}</option>
                      <option value="editor">✏️ {t('roleEditor')}</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#cbd5e1' }}>
                      {t('shareExpiryLabel')}
                    </label>
                    <select
                      className="form-control"
                      value={shareExpiresDays}
                      onChange={(e) => setShareExpiresDays(Number(e.target.value))}
                      data-testid="share-expiry-select"
                      style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px' }}
                    >
                      <option value={7}>7 {language === 'kn' ? 'ದಿನಗಳು' : 'Days'}</option>
                      <option value={30}>30 {language === 'kn' ? 'ದಿನಗಳು' : 'Days'}</option>
                      <option value={90}>90 {language === 'kn' ? 'ದಿನಗಳು' : 'Days'}</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleCreateShare}
                  disabled={shareLoading}
                  data-testid="create-share-link-btn"
                  style={{ width: '100%', marginTop: '0.25rem' }}
                >
                  {shareLoading ? '⏳ Generating...' : `✨ ${t('generateShareLink')}`}
                </button>

                {shareLinkGenerated && (
                  <div style={{ marginTop: '0.5rem', background: '#F8FAFC', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      {t('shareLinkGeneratedNotice')}
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        readOnly
                        value={shareLinkGenerated}
                        data-testid="generated-share-link-input"
                        style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.85rem', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
                      />
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleCopyShareLink}
                        data-testid="copy-share-link-btn"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {copiedNotice ? '✅ Copied!' : '📋 Copy'}
                      </button>
                    </div>
                  </div>
                )}

                {activeShares.length > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <h5 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      {t('activeSharesTitle')} ({activeShares.length})
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '140px', overflowY: 'auto' }}>
                      {activeShares.map((s) => (
                        <div
                          key={s.id}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: '#F8FAFC', border: '1px solid var(--border-subtle)', borderRadius: '4px', fontSize: '0.8rem' }}
                        >
                          <div>
                            <span style={{ fontWeight: 600, color: s.role === 'editor' ? '#4ade80' : '#60a5fa' }}>
                              {s.role === 'editor' ? '✏️ Editor' : '👁️ Viewer'}
                            </span>
                            <span style={{ color: '#64748b', marginLeft: '0.5rem' }}>
                              {s.expires_at ? `Expires ${s.expires_at.slice(0, 10)}` : 'No expiry'}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => handleRevokeShare(s.id)}
                            data-testid="revoke-share-btn"
                            style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem', color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}
                          >
                            Revoke
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowShareModal(false)}
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
