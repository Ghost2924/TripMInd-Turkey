import type { Itinerary } from '@/types/pipeline';

// ─── computeTotalCost ─────────────────────────────────────────────────────────

/**
 * Sum all segment costs across every day in the itinerary.
 * Used by Step 4 prompt construction and server-side budget checks
 * (Requirements 6.2).
 */
export function computeTotalCost(itinerary: Itinerary): number {
  let total = 0;
  for (const day of itinerary.days) {
    total += day.morning.cost_usd;
    total += day.afternoon.cost_usd;
    total += day.evening.cost_usd;
  }
  return total;
}

// ─── hasInterestCoverage ──────────────────────────────────────────────────────

/**
 * Return true when at least one activity in the itinerary matches each
 * interest in the provided list.
 *
 * Matching is case-insensitive substring search against the activity name and
 * optional notes field of every DaySegment (Requirements 6.3).
 *
 * Interest → keyword mapping:
 *   history    → "history", "museum", "ruins", "castle", "palace", "ancient"
 *   halal food → "halal", "restaurant", "dinner", "lunch", "breakfast", "cafe"
 *   shopping   → "shopping", "bazaar", "market", "grand bazaar", "spice"
 *   nature     → "nature", "park", "valley", "lake", "beach", "mountain", "hot spring"
 *   culture    → "culture", "mosque", "church", "whirling", "hammam", "festival"
 */
const INTEREST_KEYWORDS: Record<string, string[]> = {
  history: ['history', 'museum', 'ruins', 'castle', 'palace', 'ancient', 'archaeological'],
  'halal food': ['halal', 'restaurant', 'dinner', 'lunch', 'breakfast', 'cafe', 'café', 'kebab', 'meze'],
  shopping: ['shopping', 'bazaar', 'market', 'grand bazaar', 'spice'],
  nature: ['nature', 'park', 'valley', 'lake', 'beach', 'mountain', 'hot spring', 'pamukkale', 'cappadocia'],
  culture: ['culture', 'mosque', 'church', 'whirling', 'hammam', 'festival', 'dervish'],
};

export function hasInterestCoverage(
  itinerary: Itinerary,
  interests: string[],
): boolean {
  for (const interest of interests) {
    const keywords = INTEREST_KEYWORDS[interest.toLowerCase()] ?? [interest.toLowerCase()];
    const covered = itinerary.days.some((day) =>
      [day.morning, day.afternoon, day.evening].some((seg) => {
        const haystack = `${seg.activity} ${seg.notes ?? ''}`.toLowerCase();
        return keywords.some((kw) => haystack.includes(kw));
      }),
    );
    if (!covered) return false;
  }
  return true;
}

// ─── allDaysHaveAllSegments ───────────────────────────────────────────────────

/**
 * Return true when every day entry in the itinerary has non-empty morning,
 * afternoon, and evening segments (Requirements 6.4).
 *
 * A segment is considered present when its activity string is non-empty.
 */
export function allDaysHaveAllSegments(itinerary: Itinerary): boolean {
  return itinerary.days.every(
    (day) =>
      typeof day.morning?.activity === 'string' && day.morning.activity.trim() !== '' &&
      typeof day.afternoon?.activity === 'string' && day.afternoon.activity.trim() !== '' &&
      typeof day.evening?.activity === 'string' && day.evening.activity.trim() !== '',
  );
}
