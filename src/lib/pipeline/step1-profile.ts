import type { FormData, TripProfile, PipelineStepResult } from '@/types/pipeline';
import { callLLM, LLMError } from '@/lib/openai';

// JSON Schema for TripProfile structured output
const TRIP_PROFILE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    duration: {
      type: 'integer',
      description: 'Trip duration in days',
    },
    budget_usd: {
      type: 'number',
      description: 'Total budget in USD',
    },
    travelers: {
      type: 'integer',
      description: 'Number of travelers',
    },
    cities: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of cities to visit',
    },
    interests: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of traveler interests',
    },
    pace: {
      type: 'string',
      enum: ['relaxed', 'moderate', 'packed'],
      description: 'Travel pace preference',
    },
  },
  required: ['duration', 'budget_usd', 'travelers', 'cities', 'interests', 'pace'],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are a travel profile extractor. Your task is to normalize raw trip planning form inputs into a structured TripProfile JSON object.

Return a JSON object with exactly these fields:
- duration: integer number of days
- budget_usd: total budget as a number
- travelers: integer number of travelers
- cities: array of city name strings
- interests: array of interest strings
- pace: one of "relaxed", "moderate", or "packed"

Return only the JSON object with no additional text.`;

/**
 * Pipeline Step 1 — Profile Extraction
 *
 * Accepts raw FormData and uses a single LLM call to normalize it into a
 * TripProfile. The prompt contains ONLY the raw form field values — no RAG
 * data and no prior step outputs (Requirement 2.5).
 *
 * Throws LLMError on API failure or unparseable JSON (Requirement 2.4).
 */
export async function extractProfile(
  formData: FormData,
): Promise<PipelineStepResult<TripProfile>> {
  const userPrompt = `Please normalize the following trip planning form inputs into a TripProfile JSON object:

Duration: ${formData.duration} days
Budget: $${formData.budget_usd} USD
Travelers: ${formData.travelers}
Cities: ${formData.cities.join(', ')}
Interests: ${formData.interests.join(', ')}
Pace: ${formData.pace}`;

  const startTime = Date.now();

  const rawResponse = await callLLM({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 1500,
    schema: TRIP_PROFILE_SCHEMA,
  });

  const durationMs = Date.now() - startTime;

  let tripProfile: TripProfile;
  try {
    tripProfile = JSON.parse(rawResponse) as TripProfile;
  } catch (err) {
    throw new LLMError(
      `Profile Extraction Step returned unparseable JSON: ${rawResponse.slice(0, 200)}`,
      err,
    );
  }

  return {
    output: tripProfile,
    trace: {
      stepName: 'Profile Extraction',
      prompt: userPrompt,
      rawResponse,
      durationMs,
    },
  };
}
