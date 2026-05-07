import type {
  RetrievalQueries,
  TripProfile,
  FilteredRAGSubset,
  HotelRecord,
  RestaurantRecord,
  AttractionRecord,
  TransportationRecord,
} from '@/types/pipeline';

import hotelsData from '@/data/hotels.json';
import restaurantsData from '@/data/restaurants.json';
import attractionsData from '@/data/attractions.json';
import transportationData from '@/data/transportation.json';

const hotels = hotelsData as HotelRecord[];
const restaurants = restaurantsData as RestaurantRecord[];
const attractions = attractionsData as AttractionRecord[];
const transportation = transportationData as TransportationRecord[];

/**
 * Map interest names to attraction categories so we can scope the
 * attraction filter to what the user actually cares about.
 */
const INTEREST_TO_CATEGORIES: Record<string, string[]> = {
  history: ['history'],
  culture: ['culture'],
  nature: ['nature'],
  shopping: ['shopping'],
  religion: ['religion'],
  'halal food': [], // food interest — handled via restaurants, not attractions
};

/**
 * Extract relevant attraction categories from the retrieval queries and
 * the user's interest list.  Falls back to all categories when no specific
 * mapping is found so the LLM always has something to work with.
 */
function resolveAttractionCategories(
  queries: RetrievalQueries,
  profile: TripProfile,
): Set<string> {
  const categories = new Set<string>();

  // Add categories derived from the user's declared interests
  for (const interest of profile.interests) {
    const mapped = INTEREST_TO_CATEGORIES[interest.toLowerCase()];
    if (mapped) {
      mapped.forEach((c) => categories.add(c));
    }
  }

  // Also scan the free-text attraction queries for known category keywords
  const allCategories = ['history', 'culture', 'nature', 'shopping', 'religion'];
  const queryText = queries.attraction_queries.join(' ').toLowerCase();
  for (const cat of allCategories) {
    if (queryText.includes(cat)) {
      categories.add(cat);
    }
  }

  // If we still have nothing (e.g. only halal food interest selected),
  // include every category so the itinerary step has options.
  if (categories.size === 0) {
    allCategories.forEach((c) => categories.add(c));
  }

  return categories;
}

/**
 * Filter the four RAG data files down to records relevant to the user's
 * selected cities and interests.
 *
 * Rules (per requirements 4.6 – 4.8):
 *  - Hotels   : scoped to selected cities; family_friendly records sorted first.
 *  - Restaurants: scoped to selected cities; when "halal food" is an interest,
 *                 only halal:true records are included.
 *  - Attractions: scoped to selected cities and relevant categories.
 *  - Transport  : only routes where both origin and destination are among the
 *                 selected cities.
 */
export function filterRAGData(
  queries: RetrievalQueries,
  profile: TripProfile,
): FilteredRAGSubset {
  const selectedCities = new Set(profile.cities.map((c) => c.toLowerCase()));
  const wantsHalal = profile.interests
    .map((i) => i.toLowerCase())
    .includes('halal food');

  // ── Hotels ────────────────────────────────────────────────────────────────
  const filteredHotels = hotels
    .filter((h) => selectedCities.has(h.city.toLowerCase()))
    // family_friendly records first (requirement 4.8)
    .sort((a, b) => {
      if (a.family_friendly === b.family_friendly) return 0;
      return a.family_friendly ? -1 : 1;
    });

  // ── Restaurants ───────────────────────────────────────────────────────────
  const filteredRestaurants = restaurants.filter((r) => {
    if (!selectedCities.has(r.city.toLowerCase())) return false;
    // requirement 4.7: halal-only when interest is "halal food"
    if (wantsHalal && !r.halal) return false;
    return true;
  });

  // ── Attractions ───────────────────────────────────────────────────────────
  const relevantCategories = resolveAttractionCategories(queries, profile);
  const filteredAttractions = attractions.filter(
    (a) =>
      selectedCities.has(a.city.toLowerCase()) &&
      relevantCategories.has(a.category.toLowerCase()),
  );

  // ── Transportation ────────────────────────────────────────────────────────
  // Include routes where both endpoints are in the selected city set so the
  // LLM can plan inter-city travel within the chosen destinations.
  const filteredTransportation = transportation.filter(
    (t) =>
      selectedCities.has(t.origin_city.toLowerCase()) &&
      selectedCities.has(t.destination_city.toLowerCase()),
  );

  return {
    hotels: filteredHotels,
    restaurants: filteredRestaurants,
    attractions: filteredAttractions,
    transportation: filteredTransportation,
  };
}
