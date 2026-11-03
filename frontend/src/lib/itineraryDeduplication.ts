import { PlanningRecommendationResponse, DayPlan, ItineraryStop, RecommendedDestination } from '../types';

/**
 * Normalizes a destination identifier, slug, or name for cross-day comparison.
 */
export function normalizeDestinationKey(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .trim()
    .replace(/^dest-/, '')
    .replace(/^canonical-/, '')
    .replace(/[_\s-]+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Checks whether a given destination is already scheduled in an itinerary plan,
 * optionally excluding a specific day (e.g. when editing or moving within the same day).
 */
export function isDestinationDuplicate(
  destinationId: string | null | undefined,
  destinationName: string | null | undefined,
  plan: PlanningRecommendationResponse,
  excludeDayNumber?: number
): boolean {
  if (!destinationId && !destinationName) return false;
  const idKey = normalizeDestinationKey(destinationId);
  const nameKey = normalizeDestinationKey(destinationName);

  if (plan.days && plan.days.length > 0) {
    for (const day of plan.days) {
      if (excludeDayNumber !== undefined && day.day_number === excludeDayNumber) {
        continue;
      }
      for (const stop of day.stops || []) {
        if (stop.stop_type !== 'attraction') continue;
        const stopIdKey = normalizeDestinationKey(stop.destination_id);
        const stopNameKey = normalizeDestinationKey(stop.name);

        if (idKey && stopIdKey && idKey === stopIdKey) return true;
        if (nameKey && stopNameKey && nameKey === stopNameKey) return true;
      }
    }
  }

  return false;
}

/**
 * Finds the day number where a destination is currently scheduled in the plan.
 */
export function findDuplicateDestinationDay(
  destinationId: string | null | undefined,
  destinationName: string | null | undefined,
  plan: PlanningRecommendationResponse
): number | null {
  if (!destinationId && !destinationName) return null;
  const idKey = normalizeDestinationKey(destinationId);
  const nameKey = normalizeDestinationKey(destinationName);

  if (plan.days && plan.days.length > 0) {
    for (const day of plan.days) {
      for (const stop of day.stops || []) {
        if (stop.stop_type !== 'attraction') continue;
        const stopIdKey = normalizeDestinationKey(stop.destination_id);
        const stopNameKey = normalizeDestinationKey(stop.name);

        if ((idKey && stopIdKey && idKey === stopIdKey) || (nameKey && stopNameKey && nameKey === stopNameKey)) {
          return day.day_number;
        }
      }
    }
  }

  return null;
}

/**
 * Deduplicates destinations across all days and within days in an itinerary plan.
 * Retains only the first occurrence of each destination and filters out duplicate items.
 */
export function deduplicateItineraryDestinations(
  plan: PlanningRecommendationResponse
): PlanningRecommendationResponse {
  if (!plan) return plan;

  const seenKeys = new Set<string>();

  // 1. Process days and stops
  const newDays: DayPlan[] = [];
  let totalDestinationsCount = 0;

  if (plan.days && plan.days.length > 0) {
    for (const day of plan.days) {
      const filteredStops: ItineraryStop[] = [];

      for (const stop of day.stops || []) {
        // Non-attractions (transit, meal, stay) are not deduplicated against attractions
        if (stop.stop_type !== 'attraction') {
          filteredStops.push(stop);
          continue;
        }

        const idKey = normalizeDestinationKey(stop.destination_id);
        const nameKey = normalizeDestinationKey(stop.name);
        const primaryKey = idKey || nameKey;

        if (!primaryKey) {
          filteredStops.push(stop);
          continue;
        }

        if (seenKeys.has(primaryKey) || (idKey && seenKeys.has(idKey)) || (nameKey && seenKeys.has(nameKey))) {
          // Duplicate attraction found across or within days - exclude it
          continue;
        }

        if (idKey) seenKeys.add(idKey);
        if (nameKey) seenKeys.add(nameKey);
        filteredStops.push(stop);
        totalDestinationsCount += 1;
      }

      newDays.push({
        ...day,
        stops: filteredStops,
      });
    }
  }

  // 2. Process items list
  const seenItemKeys = new Set<string>();
  const newItems: RecommendedDestination[] = [];

  for (const item of plan.items || []) {
    const idKey = normalizeDestinationKey(item.id);
    const slugKey = normalizeDestinationKey(item.slug);
    const nameKey = normalizeDestinationKey(item.name);
    const key = idKey || slugKey || nameKey;

    if (!key || seenItemKeys.has(key)) {
      continue;
    }

    seenItemKeys.add(key);
    if (idKey) seenItemKeys.add(idKey);
    if (slugKey) seenItemKeys.add(slugKey);
    if (nameKey) seenItemKeys.add(nameKey);
    newItems.push(item);
  }

  return {
    ...plan,
    days: newDays.length > 0 ? newDays : plan.days,
    items: newItems,
    total_destinations: totalDestinationsCount > 0 ? totalDestinationsCount : newItems.length,
  };
}

