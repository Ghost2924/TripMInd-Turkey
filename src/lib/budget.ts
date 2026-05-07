import type { Itinerary, DayBudget, BudgetBreakdown, DaySegment } from '@/types/pipeline';

// ─── Category Classification ──────────────────────────────────────────────────

/**
 * Classify a DaySegment into one of the four budget categories based on
 * keywords in the activity name. The LLM names activities after RAG records
 * (hotel names, restaurant names, attraction names, transport methods), so
 * keyword matching is reliable enough for budget display purposes.
 */
type BudgetCategory = 'accommodation' | 'food' | 'attractions' | 'transportation';

const ACCOMMODATION_KEYWORDS = [
  'hotel', 'stay', 'check-in', 'check in', 'accommodation', 'lodge', 'hostel',
  'resort', 'inn', 'pension', 'guesthouse', 'guest house', 'boutique',
];

const FOOD_KEYWORDS = [
  'restaurant', 'dinner', 'lunch', 'breakfast', 'eat', 'food', 'cafe', 'café',
  'kebab', 'meze', 'baklava', 'tavern', 'taverna', 'bistro', 'meal', 'dining',
  'cuisine', 'lokantas', 'lokanta',
  // additional patterns LLM commonly generates
  'brunch', 'snack', 'tasting', 'culinary', 'eatery', 'dine', 'diner',
  'buffet', 'grill', 'seafood', 'dessert', 'pastry', 'bakery', 'street food',
  'evening meal', 'morning meal', 'afternoon tea',
];

const TRANSPORTATION_KEYWORDS = [
  'flight', 'bus', 'ferry', 'train', 'transfer', 'transport', 'travel to',
  'travel from', 'depart', 'arrive', 'airport', 'station', 'port', 'taxi',
  'shuttle', 'dolmuş', 'dolmus',
];

function classifySegment(segment: DaySegment): BudgetCategory {
  const activity = segment.activity.toLowerCase();

  for (const kw of TRANSPORTATION_KEYWORDS) {
    if (activity.includes(kw)) return 'transportation';
  }
  for (const kw of ACCOMMODATION_KEYWORDS) {
    if (activity.includes(kw)) return 'accommodation';
  }
  for (const kw of FOOD_KEYWORDS) {
    if (activity.includes(kw)) return 'food';
  }

  // Default: sightseeing / attraction
  return 'attractions';
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Compute a BudgetBreakdown from a final Itinerary.
 *
 * Sums costs per day across accommodation, food, attractions, and
 * transportation segments, then computes grand_total and by_category totals
 * (Requirements 8.1–8.4).
 */
export function computeBudgetBreakdown(itinerary: Itinerary): BudgetBreakdown {
  const per_day: DayBudget[] = [];

  const by_category = {
    accommodation: 0,
    food: 0,
    attractions: 0,
    transportation: 0,
  };

  for (const day of itinerary.days) {
    const segments = [day.morning, day.afternoon, day.evening];

    const dayTotals: Record<BudgetCategory, number> = {
      accommodation: 0,
      food: 0,
      attractions: 0,
      transportation: 0,
    };

    // 3.1: If day.hotel is present, use price_per_night directly for
    // accommodation. Do NOT also keyword-classify segments as accommodation
    // (prevents double-counting).
    if (day.hotel) {
      dayTotals.accommodation = day.hotel.price_per_night;
    }

    for (const segment of segments) {
      const category = classifySegment(segment);

      // 3.1 / 3.3: Skip accommodation keyword classification when day.hotel
      // is present — the structured field already covers it. Continue
      // classifying food, attractions, and transportation segments normally.
      if (category === 'accommodation' && day.hotel) {
        // Reclassify as attractions (catch-all for non-meal, non-transport
        // segments that happen to contain accommodation keywords but are not
        // the actual hotel cost).
        dayTotals.attractions += segment.cost_usd;
      } else {
        dayTotals[category] += segment.cost_usd;
      }
    }

    // 3.2: If day.transport_to_next_city is present, add its cost to the
    // transportation total in addition to any transport-classified segments.
    if (day.transport_to_next_city) {
      dayTotals.transportation += day.transport_to_next_city.cost_usd;
    }

    const dayTotal =
      dayTotals.accommodation +
      dayTotals.food +
      dayTotals.attractions +
      dayTotals.transportation;

    per_day.push({
      day_number: day.day_number,
      accommodation: dayTotals.accommodation,
      food: dayTotals.food,
      attractions: dayTotals.attractions,
      transportation: dayTotals.transportation,
      total: dayTotal,
    });

    by_category.accommodation += dayTotals.accommodation;
    by_category.food += dayTotals.food;
    by_category.attractions += dayTotals.attractions;
    by_category.transportation += dayTotals.transportation;
  }

  const grand_total =
    by_category.accommodation +
    by_category.food +
    by_category.attractions +
    by_category.transportation;

  return { per_day, grand_total, by_category };
}
