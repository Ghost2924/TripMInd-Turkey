import type { Itinerary, TripProfile, ValidationResult, PipelineStepResult } from '@/types/pipeline';
import { callLLM, LLMError } from '@/lib/openai';

// JSON Schema for ValidationResult structured output
const VALIDATION_RESULT_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    passed: {
      type: 'boolean',
      description: 'True if all validation checks passed, false if any failed',
    },
    failures: {
      type: 'array',
      description: 'List of validation failures (empty array if passed is true)',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['budget_exceeded', 'missing_interest', 'missing_section'],
            description: 'The category of validation failure',
          },
          description: {
            type: 'string',
            description: 'Human-readable description of the specific failure',
          },
        },
        required: ['type', 'description'],
        additionalProperties: false,
      },
    },
  },
  required: ['passed', 'failures'],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are a travel itinerary validator. Your task is to check a generated itinerary against a traveler's profile and report any validation failures.

You must check three things:

1. BUDGET CHECK (type: "budget_exceeded")
   Sum the cost_usd of every DaySegment (morning, afternoon, evening) across all days.
   If the total exceeds the profile's budget_usd, add a failure with type "budget_exceeded".

2. INTEREST COVERAGE CHECK (type: "missing_interest")
   For each interest listed in the profile's interests array, check whether at least one
   activity description anywhere in the itinerary (morning/afternoon/evening activity fields)
   references or relates to that interest.
   If an interest has no matching activity, add a failure with type "missing_interest".

3. SECTION COMPLETENESS CHECK (type: "missing_section")
   Every day entry must have non-empty morning, afternoon, and evening sections — each with
   a non-empty activity string. If any day is missing a section or has an empty activity,
   add a failure with type "missing_section".

Set "passed" to true only if the failures array is empty.
Return only a JSON object with no additional text.`;

/**
 * Pipeline Step 4 — Itinerary Validation
 *
 * Accepts an Itinerary and TripProfile and uses a single LLM call to validate:
 *   - Total cost of all DaySegments does not exceed profile.budget_usd (Req 6.1, 6.2)
 *   - At least one activity per interest in profile.interests (Req 6.3, 6.4)
 *   - Every day entry has non-empty morning, afternoon, and evening sections (Req 6.5, 6.6)
 *
 * Returns a PipelineStepResult<ValidationResult> including the full trace (Req 11.4).
 * Throws LLMError on API failure or unparseable JSON (Req 6.7).
 */
export async function runStep4Validation(
  itinerary: Itinerary,
  profile: TripProfile,
): Promise<PipelineStepResult<ValidationResult>> {
  const userPrompt = `Validate the following itinerary against the traveler's profile.

## Trip Profile
${JSON.stringify(profile, null, 2)}

## Generated Itinerary
${JSON.stringify(itinerary, null, 2)}

Please check:
1. Total cost of all segments (morning + afternoon + evening across all days) vs budget_usd (${profile.budget_usd} USD)
2. Coverage of each interest (${profile.interests.join(', ')}) — at least one activity must relate to each
3. Every day has non-empty morning, afternoon, and evening sections with a non-empty activity

Return a ValidationResult JSON object.`;

  const startTime = Date.now();

  const rawResponse = await callLLM({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 1500,
    schema: VALIDATION_RESULT_SCHEMA,
  });

  const durationMs = Date.now() - startTime;

  let validationResult: ValidationResult;
  try {
    validationResult = JSON.parse(rawResponse) as ValidationResult;
  } catch (err) {
    throw new LLMError(
      `Validation Step returned unparseable JSON: ${rawResponse.slice(0, 200)}`,
      err,
    );
  }

  return {
    output: validationResult,
    trace: {
      stepName: 'Itinerary Validation',
      prompt: userPrompt,
      rawResponse,
      durationMs,
    },
  };
}
