import type { TripProfile, RetrievalQueries, PipelineStepResult } from '@/types/pipeline';
import { callLLM, LLMError } from '@/lib/openai';

// JSON Schema for RetrievalQueries structured output
const RETRIEVAL_QUERIES_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    hotel_queries: {
      type: 'array',
      items: { type: 'string' },
      description: 'Search queries for finding suitable hotels',
    },
    restaurant_queries: {
      type: 'array',
      items: { type: 'string' },
      description: 'Search queries for finding suitable restaurants',
    },
    attraction_queries: {
      type: 'array',
      items: { type: 'string' },
      description: 'Search queries for finding suitable attractions',
    },
    transportation_queries: {
      type: 'array',
      items: { type: 'string' },
      description: 'Search queries for finding suitable transportation options',
    },
  },
  required: [
    'hotel_queries',
    'restaurant_queries',
    'attraction_queries',
    'transportation_queries',
  ],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are a travel query generator. Given a structured trip profile, generate targeted retrieval queries for finding relevant travel data.

For each category, produce concise search queries that reflect the traveler's cities, interests, budget, and pace:
- hotel_queries: queries to find suitable hotels in the specified cities
- restaurant_queries: queries to find suitable restaurants matching the traveler's interests (e.g. halal food)
- attraction_queries: queries to find attractions aligned with the traveler's interests
- transportation_queries: queries to find transportation options between the specified cities

Return only a JSON object with the four query arrays and no additional text.`;

/**
 * Pipeline Step 2 — Query Generation
 *
 * Accepts a TripProfile and uses a single LLM call to generate targeted
 * retrieval queries for hotels, restaurants, attractions, and transportation.
 * The prompt contains ONLY the Trip Profile JSON — no RAG data and no other
 * context (Requirement 3.1).
 *
 * Throws LLMError on API failure or unparseable JSON (Requirement 3.5).
 */
export async function generateQueries(
  tripProfile: TripProfile,
): Promise<PipelineStepResult<RetrievalQueries>> {
  const userPrompt = `Generate retrieval queries for the following trip profile:

${JSON.stringify(tripProfile, null, 2)}`;

  const startTime = Date.now();

  const rawResponse = await callLLM({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 1500,
    schema: RETRIEVAL_QUERIES_SCHEMA,
  });

  const durationMs = Date.now() - startTime;

  let retrievalQueries: RetrievalQueries;
  try {
    retrievalQueries = JSON.parse(rawResponse) as RetrievalQueries;
  } catch (err) {
    throw new LLMError(
      `Query Generation Step returned unparseable JSON: ${rawResponse.slice(0, 200)}`,
      err,
    );
  }

  return {
    output: retrievalQueries,
    trace: {
      stepName: 'Query Generation',
      prompt: userPrompt,
      rawResponse,
      durationMs,
    },
  };
}
