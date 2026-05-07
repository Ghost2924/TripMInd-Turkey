import type { TripProfile, FilteredRAGSubset, Itinerary, PipelineStepResult } from '@/types/pipeline';
import { callLLM, LLMError } from '@/lib/openai';

// JSON Schema for Itinerary structured output
const ITINERARY_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    days: {
      type: 'array',
      description: 'Array of day entries forming the full itinerary',
      items: {
        type: 'object',
        properties: {
          day_number: {
            type: 'integer',
            description: 'The day number (1-indexed)',
          },
          city: {
            type: 'string',
            description: 'The city visited on this day',
          },
          morning: {
            type: 'object',
            properties: {
              activity: { type: 'string', description: 'Activity name or description' },
              cost_usd: { type: 'number', description: 'Cost in USD' },
              duration_hours: { type: 'number', description: 'Duration in hours' },
              notes: { type: 'string', description: 'Optional notes' },
            },
            required: ['activity', 'cost_usd', 'duration_hours'],
            additionalProperties: false,
          },
          afternoon: {
            type: 'object',
            properties: {
              activity: { type: 'string', description: 'Activity name or description' },
              cost_usd: { type: 'number', description: 'Cost in USD' },
              duration_hours: { type: 'number', description: 'Duration in hours' },
              notes: { type: 'string', description: 'Optional notes' },
            },
            required: ['activity', 'cost_usd', 'duration_hours'],
            additionalProperties: false,
          },
          evening: {
            type: 'object',
            properties: {
              activity: { type: 'string', description: 'Activity name or description' },
              cost_usd: { type: 'number', description: 'Cost in USD' },
              duration_hours: { type: 'number', description: 'Duration in hours' },
              notes: { type: 'string', description: 'Optional notes' },
            },
            required: ['activity', 'cost_usd', 'duration_hours'],
            additionalProperties: false,
          },
        },
        required: ['day_number', 'city', 'morning', 'afternoon', 'evening'],
        additionalProperties: false,
      },
    },
  },
  required: ['days'],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are a Turkey travel itinerary planner. Your task is to generate a detailed day-by-day itinerary based on a traveler's profile and a curated subset of hotels, restaurants, attractions, and transportation options.

Pace constraints — strictly follow these activity limits per day:
- relaxed: at most 2 activities per day (light schedule, plenty of rest time)
- moderate: exactly 3 activities per day (balanced schedule)
- packed: at least 4 activities per day (full schedule, maximise sightseeing)

Each day must have exactly three segments: morning, afternoon, and evening. For relaxed pace, one segment may be a rest/free time entry. For packed pace, segments may include multiple activities described together.

Activity naming rules — STRICTLY follow these conventions so costs are categorised correctly:
- Meal activities MUST include one of these words in the activity name: breakfast, lunch, dinner, dining, restaurant, cafe, meal, eat, cuisine. Example: "Dinner at Hamdi Restaurant", "Lunch at Seten Restaurant", "Breakfast at hotel cafe".
- Sightseeing activities should use words like: visit, tour, explore, museum, palace, mosque, ruins, bazaar, castle, gallery, sightseeing.
- Transportation activities (when included as a segment) should use words like: flight, bus, train, transfer, travel to.
- Do NOT name a meal activity as just a place name without a meal keyword.

Output format — return a JSON object with a single "days" array. Each element must have:
- day_number: integer (1-indexed)
- city: string (the city visited that day)
- morning: { activity, cost_usd, duration_hours, notes? }
- afternoon: { activity, cost_usd, duration_hours, notes? }
- evening: { activity, cost_usd, duration_hours, notes? }

Cost guidance:
- Use realistic USD costs for each activity. Meals typically cost $10–$50 per person. Attractions cost $5–$30. Free activities use cost_usd: 0.
- Do NOT set cost_usd: 0 for meals unless the meal is explicitly free.

IMPORTANT: Only use hotels, restaurants, and attractions from the provided FilteredRAGSubset. Do not invent venues not present in the data. Use transportation options from the subset when moving between cities.

Return only the JSON object with no additional text.`;

/**
 * Pipeline Step 3 — Itinerary Generation
 *
 * Accepts a TripProfile and a FilteredRAGSubset (the curated RAG data, NOT
 * the full unfiltered data files) and uses a single LLM call to generate a
 * day-by-day Turkey itinerary (Requirements 5.1–5.7, 11.4).
 *
 * Pace constraints are encoded in the system prompt:
 *   relaxed ≤ 2 activities/day, moderate = 3, packed ≥ 4 (Requirement 5.3).
 *
 * Throws LLMError on API failure or unparseable JSON (Requirement 5.7).
 */
export async function runStep3Itinerary(
  profile: TripProfile,
  ragSubset: FilteredRAGSubset,
): Promise<PipelineStepResult<Itinerary>> {
  const userPrompt = `Generate a ${profile.duration}-day Turkey itinerary for the following traveler profile and available travel data.

## Trip Profile
${JSON.stringify(profile, null, 2)}

## Available Travel Data (use ONLY these options)
${JSON.stringify(ragSubset, null, 2)}

Please create a complete day-by-day itinerary using only the hotels, restaurants, attractions, and transportation options listed above. Respect the traveler's pace preference (${profile.pace}), budget, and interests.`;

  const startTime = Date.now();

  const rawResponse = await callLLM({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 1500,
    schema: ITINERARY_SCHEMA,
  });

  const durationMs = Date.now() - startTime;

  let itinerary: Itinerary;
  try {
    itinerary = JSON.parse(rawResponse) as Itinerary;
  } catch (err) {
    throw new LLMError(
      `Itinerary Generation Step returned unparseable JSON: ${rawResponse.slice(0, 200)}`,
      err,
    );
  }

  return {
    output: itinerary,
    trace: {
      stepName: 'Itinerary Generation',
      prompt: userPrompt,
      rawResponse,
      durationMs,
    },
  };
}
