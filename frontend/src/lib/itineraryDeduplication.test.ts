import { describe, it, expect } from 'vitest';
import {
  deduplicateItineraryDestinations,
  isDestinationDuplicate,
  findDuplicateDestinationDay,
  normalizeDestinationKey,
} from './itineraryDeduplication';
import { PlanningRecommendationResponse, ItineraryStop, RecommendedDestination, DayPlan } from '../types';

const createMockStop = (overrides: Partial<ItineraryStop>): ItineraryStop => ({
  stop_id: `stop-${Math.random().toString(36).substring(2, 7)}`,
  destination_id: 'test-dest',
  name: 'Test Destination',
  stop_type: 'attraction',
  start_time: '10:00',
  end_time: '12:00',
  duration_minutes: 120,
  currency: 'INR',
  cost_status: 'verified',
  ...overrides,
});

const createMockItem = (overrides: Partial<RecommendedDestination>): RecommendedDestination => ({
  id: 'test-dest',
  slug: 'test-dest',
  name: 'Test Destination',
  category: 'architecture',
  district_code: 'KA-MYS',
  day_number: 1,
  order: 1,
  currency_code: 'INR',
  access_status: 'open_reported',
  is_offbeat: false,
  rationale: 'Famous landmark',
  ...overrides,
});

const createMockDayPlan = (overrides: Partial<DayPlan>): DayPlan => ({
  day_number: 1,
  theme: 'Day Plan',
  total_duration_minutes: 300,
  transit_minutes: 30,
  stops: [],
  meals_covered: [],
  warnings: [],
  ...overrides,
});

describe('itineraryDeduplication', () => {
  it('normalizes destination keys accurately', () => {
    expect(normalizeDestinationKey('dest-mysore-palace')).toBe('mysore-palace');
    expect(normalizeDestinationKey('canonical-chamundi-hills')).toBe('chamundi-hills');
    expect(normalizeDestinationKey('Mysore Palace (Amba Vilas)')).toBe('mysore-palace-amba-vilas');
    expect(normalizeDestinationKey('')).toBe('');
    expect(normalizeDestinationKey(null)).toBe('');
  });

  it('detects cross-day destination duplicates', () => {
    const mockPlan: PlanningRecommendationResponse = {
      language: 'en',
      generation_mode: 'ai',
      provider_used: 'gemini',
      total_destinations: 2,
      duration_days: 2,
      items: [],
      days: [
        createMockDayPlan({
          day_number: 1,
          theme: 'Heritage Day 1',
          stops: [
            createMockStop({
              stop_id: 'stop-1',
              destination_id: 'mysore-palace',
              name: 'Mysore Palace',
            }),
          ],
        }),
        createMockDayPlan({
          day_number: 2,
          theme: 'Heritage Day 2',
          stops: [
            createMockStop({
              stop_id: 'stop-2',
              destination_id: 'chamundi-hill',
              name: 'Chamundi Hill',
            }),
          ],
        }),
      ],
    };

    expect(isDestinationDuplicate('mysore-palace', 'Mysore Palace', mockPlan)).toBe(true);
    expect(isDestinationDuplicate('mysore-palace', 'Mysore Palace', mockPlan, 1)).toBe(false);
    expect(isDestinationDuplicate('unknown-dest', 'Unknown Destination', mockPlan)).toBe(false);

    expect(findDuplicateDestinationDay('mysore-palace', 'Mysore Palace', mockPlan)).toBe(1);
    expect(findDuplicateDestinationDay('chamundi-hill', 'Chamundi Hill', mockPlan)).toBe(2);
    expect(findDuplicateDestinationDay('unknown-dest', 'Unknown', mockPlan)).toBe(null);
  });

  it('deduplicates duplicate destinations across days and within the same day', () => {
    const dirtyPlan: PlanningRecommendationResponse = {
      language: 'en',
      generation_mode: 'ai',
      provider_used: 'gemini',
      total_destinations: 4,
      duration_days: 2,
      items: [
        createMockItem({
          id: 'mysore-palace',
          slug: 'mysore-palace',
          name: 'Mysore Palace',
          day_number: 1,
          order: 1,
        }),
        createMockItem({
          id: 'mysore-palace', // Duplicate in items
          slug: 'mysore-palace',
          name: 'Mysore Palace',
          day_number: 2,
          order: 2,
        }),
        createMockItem({
          id: 'chamundi-hill',
          slug: 'chamundi-hill',
          name: 'Chamundi Hill',
          day_number: 2,
          order: 1,
        }),
      ],
      days: [
        createMockDayPlan({
          day_number: 1,
          theme: 'Day 1',
          stops: [
            createMockStop({
              stop_id: 'stop-1',
              destination_id: 'mysore-palace',
              name: 'Mysore Palace',
            }),
            createMockStop({
              stop_id: 'stop-1-dup',
              destination_id: 'mysore-palace', // Duplicate on same day
              name: 'Mysore Palace',
            }),
          ],
        }),
        createMockDayPlan({
          day_number: 2,
          theme: 'Day 2',
          stops: [
            createMockStop({
              stop_id: 'stop-2-dup',
              destination_id: 'mysore-palace', // Duplicate on day 2
              name: 'Mysore Palace',
            }),
            createMockStop({
              stop_id: 'stop-3',
              destination_id: 'chamundi-hill',
              name: 'Chamundi Hill',
            }),
            createMockStop({
              stop_id: 'stop-meal',
              destination_id: 'hotel-mylari',
              name: 'Hotel Mylari Lunch',
              stop_type: 'meal', // Meal should NOT be excluded
            }),
          ],
        }),
      ],
    };

    const clean = deduplicateItineraryDestinations(dirtyPlan);

    // Verify Day 1 has only 1 attraction
    expect(clean.days![0].stops).toHaveLength(1);
    expect(clean.days![0].stops[0].name).toBe('Mysore Palace');

    // Verify Day 2 does NOT have Mysore Palace again, but keeps Chamundi Hill and the meal stop
    expect(clean.days![1].stops).toHaveLength(2);
    expect(clean.days![1].stops[0].name).toBe('Chamundi Hill');
    expect(clean.days![1].stops[1].name).toBe('Hotel Mylari Lunch');

    // Verify items list was also deduplicated
    expect(clean.items).toHaveLength(2);
    expect(clean.total_destinations).toBe(2);
  });
});
