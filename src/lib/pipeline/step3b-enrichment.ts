/**
 * Enriches a raw LLM-generated Itinerary with hotel assignments,
 * transport legs, restaurant suggestions, and attraction highlights.
 *
 * Pure function: same inputs → same output. No LLM calls, no I/O.
 */

import type {
  Itinerary,
  DayEntry,
  DaySegment,
  HotelRecord,
  RestaurantRecord,
  AttractionRecord,
  TransportationRecord,
  HotelAssignment,
  TransportLeg,
  FilteredRAGSubset,
  TripProfile,
} from '../../types/pipeline';

// ─── Meal keyword list ────────────────────────────────────────────────────────

const MEAL_KEYWORDS = [
  'breakfast',
  'lunch',
  'dinner',
  'meal',
  'eat',
  'dining',
  'restaurant',
  'food',
  'cafe',
  'café',
  'kebab',
  'meze',
  'baklava',
  'tavern',
  'bistro',
  'cuisine',
  'lokanta',
] as const;

// ─── Sightseeing keyword list ─────────────────────────────────────────────────

const SIGHTSEEING_KEYWORDS = [
  'visit',
  'tour',
  'explore',
  'museum',
  'mosque',
  'church',
  'palace',
  'ruins',
  'castle',
  'bazaar',
  'market',
  'temple',
  'monument',
  'site',
  'historic',
  'ancient',
  'archaeological',
  'gallery',
  'sightseeing',
  'hot air balloon',
  'balloon',
  'valley',
  'canyon',
  'cave',
  'thermal',
  'travertine',
  'amphitheatre',
  'library',
  'agora',
] as const;

// ─── Pace caps ────────────────────────────────────────────────────────────────

interface PaceCaps {
  maxMealAnnotations: number;
  maxAttractionAnnotations: number;
}

function getPaceCaps(pace: TripProfile['pace']): PaceCaps {
  switch (pace) {
    case 'relaxed':
      return { maxMealAnnotations: 1, maxAttractionAnnotations: 0 };
    case 'moderate':
      return { maxMealAnnotations: 2, maxAttractionAnnotations: 1 };
    case 'packed':
      return { maxMealAnnotations: 3, maxAttractionAnnotations: 2 };
    default:
      return { maxMealAnnotations: 2, maxAttractionAnnotations: 1 };
  }
}

// ─── Helper: selectHotel ──────────────────────────────────────────────────────

/**
 * Selects the best hotel for a city.
 * - Filters by city
 * - Applies family-friendly preference when travelers > 1
 * - Returns highest-rated hotel or undefined
 */
function selectHotel(
  city: string,
  hotels: HotelRecord[],
  travelers: number,
): HotelAssignment | undefined {
  let candidates = hotels.filter((h) => h.city === city);

  if (candidates.length === 0) {
    return undefined;
  }

  if (travelers > 1) {
    const familyCandidates = candidates.filter((h) => h.family_friendly);
    if (familyCandidates.length > 0) {
      candidates = familyCandidates;
    }
  }

  const best = [...candidates].sort((a, b) => b.rating - a.rating)[0];

  return {
    name: best.name,
    city: best.city,
    price_per_night: best.price_per_night,
    rating: best.rating,
  };
}

// ─── Helper: selectTransportLeg ───────────────────────────────────────────────

/**
 * Selects the best transport leg for an origin–destination pair.
 *
 * Strategy: if the cheapest option exceeds MAX_BUS_HOURS, prefer the cheapest
 * flight instead (flights are always faster). Falls back to cheapest overall
 * if no flight exists.
 */
const MAX_BUS_HOURS = 4; // prefer flight over any option longer than this

function selectTransportLeg(
  origin: string,
  dest: string,
  transport: TransportationRecord[],
  travelers: number,
): TransportLeg | undefined {
  const candidates = transport.filter(
    (t) => t.origin_city === origin && t.destination_city === dest,
  );

  if (candidates.length === 0) {
    return undefined;
  }

  const sorted = [...candidates].sort((a, b) => a.cost_usd - b.cost_usd);
  const cheapest = sorted[0];

  // If cheapest option is a long journey, prefer cheapest flight
  if (cheapest.duration_hours > MAX_BUS_HOURS) {
    const flights = sorted.filter((t) => t.method === 'flight');
    if (flights.length > 0) {
      const pick = flights[0]; // already sorted by cost_usd ascending
      return {
        origin_city: pick.origin_city,
        destination_city: pick.destination_city,
        method: pick.method,
        cost_usd: pick.cost_usd * travelers,
        duration_hours: pick.duration_hours,
      };
    }
  }

  return {
    origin_city: cheapest.origin_city,
    destination_city: cheapest.destination_city,
    method: cheapest.method,
    cost_usd: cheapest.cost_usd * travelers,
    duration_hours: cheapest.duration_hours,
  };
}

// ─── Helper: isMealSegment ────────────────────────────────────────────────────

/**
 * Returns true if the segment's activity describes a meal.
 */
export function isMealSegment(segment: DaySegment): boolean {
  const lower = segment.activity.toLowerCase();
  return MEAL_KEYWORDS.some((kw) => lower.includes(kw));
}

// ─── Helper: isSightseeingSegment ─────────────────────────────────────────────

/**
 * Returns true if the segment's activity describes sightseeing.
 */
export function isSightseeingSegment(segment: DaySegment): boolean {
  const lower = segment.activity.toLowerCase();
  return SIGHTSEEING_KEYWORDS.some((kw) => lower.includes(kw));
}

// ─── Helper: annotateRestaurant ───────────────────────────────────────────────

/**
 * Appends a restaurant suggestion to the segment's notes.
 * - Respects halal filter
 * - Rotates through restaurants using usedNames set
 * - Returns a new segment object (does not mutate)
 */
function annotateRestaurant(
  segment: DaySegment,
  restaurants: RestaurantRecord[],
  city: string,
  wantsHalal: boolean,
  usedNames: Set<string>,
): DaySegment {
  let cityRestaurants = restaurants.filter((r) => r.city === city);

  if (wantsHalal) {
    cityRestaurants = cityRestaurants.filter((r) => r.halal === true);
  }

  if (cityRestaurants.length === 0) {
    return segment;
  }

  let available = cityRestaurants.filter((r) => !usedNames.has(r.name));
  if (available.length === 0) {
    available = cityRestaurants;
  }

  const pick = available[0];
  usedNames.add(pick.name);

  // Already annotated (e.g. enrichItinerary called twice after step 3 + step 5)
  if (segment.notes?.includes('🍽️')) {
    return segment;
  }

  const prefix = segment.notes ? segment.notes + ' ' : '';
  return {
    ...segment,
    notes: prefix + '🍽️ ' + pick.name,
  };
}

// ─── Helper: annotateAttraction ───────────────────────────────────────────────

/**
 * Appends an attraction highlight to the segment's notes.
 * - Prefers interest-matching attractions
 * - Rotates using usedNames set
 * - Returns a new segment object (does not mutate)
 */
function annotateAttraction(
  segment: DaySegment,
  attractions: AttractionRecord[],
  city: string,
  interests: string[],
  usedNames: Set<string>,
): DaySegment {
  const cityAttractions = attractions.filter((a) => a.city === city);

  if (cityAttractions.length === 0) {
    return segment;
  }

  const interestMatches = cityAttractions.filter((a) =>
    interests.some((i) => i.toLowerCase() === a.category.toLowerCase()),
  );

  const pool = interestMatches.length > 0 ? interestMatches : cityAttractions;

  let available = pool.filter((a) => !usedNames.has(a.name));
  if (available.length === 0) {
    available = pool;
  }

  const pick = available[0];
  usedNames.add(pick.name);

  // Already annotated (e.g. enrichItinerary called twice after step 3 + step 5)
  if (segment.notes?.includes('🏛️')) {
    return segment;
  }

  const prefix = segment.notes ? segment.notes + ' ' : '';
  return {
    ...segment,
    notes: prefix + '🏛️ ' + pick.name + ' (' + pick.category + ')',
  };
}

// ─── Main export: enrichItinerary ─────────────────────────────────────────────

/**
 * Enriches a raw LLM-generated Itinerary with hotel assignments,
 * transport legs, restaurant suggestions, and attraction highlights.
 *
 * Pure function: same inputs → same output. No LLM calls, no I/O.
 */
export function enrichItinerary(
  itinerary: Itinerary,
  ragSubset: FilteredRAGSubset,
  profile: TripProfile,
): Itinerary {
  const { hotels, restaurants, attractions, transportation } = ragSubset;
  const { travelers, interests, pace } = profile;
  const wantsHalal = interests.includes('halal food');
  const { maxMealAnnotations, maxAttractionAnnotations } = getPaceCaps(pace);

  // usedNames sets are scoped to the entire itinerary call for rotation across days
  const usedRestaurantNames = new Set<string>();
  const usedAttractionNames = new Set<string>();

  const enrichedDays: DayEntry[] = itinerary.days.map((day, index) => {
    try {
      // ── Hotel assignment ──────────────────────────────────────────────────
      const hotel = selectHotel(day.city, hotels, travelers);
      if (!hotel) {
        console.warn(
          `[enrichItinerary] No hotel found for city "${day.city}" on day ${day.day_number}`,
        );
      }

      // ── Transport leg to next city ────────────────────────────────────────
      let transport_to_next_city: TransportLeg | undefined;
      const nextDay = itinerary.days[index + 1];
      if (nextDay && nextDay.city !== day.city) {
        transport_to_next_city = selectTransportLeg(
          day.city,
          nextDay.city,
          transportation,
          travelers,
        );
        if (!transport_to_next_city) {
          console.warn(
            `[enrichItinerary] No transport found from "${day.city}" to "${nextDay.city}" on day ${day.day_number}`,
          );
        }
      }

      // ── Annotate segments (morning → afternoon → evening) ─────────────────
      let mealCount = 0;
      let attractionCount = 0;

      const segments: [keyof Pick<DayEntry, 'morning' | 'afternoon' | 'evening'>, DaySegment][] = [
        ['morning', day.morning],
        ['afternoon', day.afternoon],
        ['evening', day.evening],
      ];

      const annotatedSegments: Record<string, DaySegment> = {};

      for (const [slot, segment] of segments) {
        let annotated = segment;

        if (isMealSegment(segment) && mealCount < maxMealAnnotations) {
          annotated = annotateRestaurant(
            annotated,
            restaurants,
            day.city,
            wantsHalal,
            usedRestaurantNames,
          );
          mealCount++;
        } else if (
          isSightseeingSegment(segment) &&
          attractionCount < maxAttractionAnnotations
        ) {
          annotated = annotateAttraction(
            annotated,
            attractions,
            day.city,
            interests,
            usedAttractionNames,
          );
          attractionCount++;
        }

        annotatedSegments[slot] = annotated;
      }

      return {
        ...day,
        morning: annotatedSegments['morning'],
        afternoon: annotatedSegments['afternoon'],
        evening: annotatedSegments['evening'],
        hotel,
        transport_to_next_city,
      };
    } catch (err) {
      console.error(
        `[enrichItinerary] Error processing day ${day.day_number}:`,
        err,
      );
      // Return the original day unchanged so other days continue processing
      return day;
    }
  });

  return { days: enrichedDays };
}
