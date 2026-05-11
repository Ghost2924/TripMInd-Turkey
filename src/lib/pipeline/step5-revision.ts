import type {
  Itinerary,
  TripProfile,
  FilteredRAGSubset,
  ValidationFailure,
  PipelineStepResult,
} from '@/types/pipeline';
import { callLLM, LLMError } from '@/lib/openai';

// JSON Schema for Itinerary structured output (same as Step 3)
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

const SYSTEM_PROMPT = `You are a Turkey travel itinerary reviser. Your task is to fix a previously generated itinerary based on a list of specific validation failures.

You will receive:
1. The original itinerary that failed validation
2. The traveler's trip profile
3. The available travel data (hotels, restaurants, attractions, transportation)
4. A list of validation failures that must be resolved

Your job is to produce a corrected itinerary that:
- Fixes every issue listed in the validation failures
- Stays within the traveler's budget (budget_usd)
- Covers all interests listed in the profile
- Ensures every day has non-empty morning, afternoon, and evening sections
- Only uses hotels, restaurants, and attractions from the provided FilteredRAGSubset
- Respects the traveler's pace preference

Pace constraints — strictly follow these activity limits per day:
- relaxed: at most 2 activities per day (light schedule, plenty of rest time)
- moderate: exactly 3 activities per day (balanced schedule)
- packed: at least 4 activities per day (full schedule, maximise sightseeing)

Each day must have exactly three segments: morning, afternoon, and evening. For relaxed pace, one segment may be a rest/free time entry. For packed pace, segments may include multiple activities described together.

Output format — return a JSON object with a single "days" array. Each element must have:
- day_number: integer (1-indexed)
- city: string (the city visited that day)
- morning: { activity, cost_usd, duration_hours, notes? }
- afternoon: { activity, cost_usd, duration_hours, notes? }
- evening: { activity, cost_usd, duration_hours, notes? }

IMPORTANT: Only use hotels, restaurants, and attractions from the provided FilteredRAGSubset. Do not invent venues not present in the data.

Return only the JSON object with no additional text.`;

/**
 * Pipeline Step 5 — Conditional Revision
 *
 * Accepts an Itinerary, TripProfile, FilteredRAGSubset, and a list of
 * ValidationFailures from Step 4, then uses a single LLM call to produce a
 * revised itinerary that resolves all reported failures (Requirements 7.1,
 * 7.3, 7.4, 7.5, 7.6, 11.4).
 *
 * Throws LLMError on API failure or unparseable JSON (Requirement 7.6).
 */
export async function runRevisionStep(
  itinerary: Itinerary,
  profile: TripProfile,
  ragSubset: FilteredRAGSubset,
  failures: ValidationFailure[],
): Promise<PipelineStepResult<Itinerary>> {
  const failuresList = failures
    .map((f, i) => `${i + 1}. [${f.type}] ${f.description}`)
    .join('\n');

  const userPrompt = `Revise the following itinerary to fix all validation failures listed below.

## Validation Failures to Fix
${failuresList}

## Trip Profile
${JSON.stringify(profile, null, 2)}

## Original Itinerary (needs revision)
${JSON.stringify(itinerary, null, 2)}

## Available Travel Data (use ONLY these options)
${JSON.stringify(ragSubset, null, 2)}

Please produce a corrected itinerary that resolves all the failures above while respecting the traveler's profile, budget, and pace preference (${profile.pace}).`;

  const startTime = Date.now();

  const rawResponse = await callLLM({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 4000,
    schema: ITINERARY_SCHEMA,
  });

  const durationMs = Date.now() - startTime;

  let revisedItinerary: Itinerary;
  try {
    revisedItinerary = JSON.parse(rawResponse) as Itinerary;
  } catch (err) {
    throw new LLMError(
      `Revision Step returned unparseable JSON: ${rawResponse.slice(0, 200)}`,
      err,
    );
  }

  return {
    output: revisedItinerary,
    trace: {
      stepName: 'Step 5: Revision',
      prompt: userPrompt,
      rawResponse,
      durationMs,
    },
  };
}
