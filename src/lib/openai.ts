import OpenAI from 'openai';
import type { LLMCallOptions } from '@/types/pipeline';

// ─── Typed Error ──────────────────────────────────────────────────────────────

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

// ─── Client Singleton ─────────────────────────────────────────────────────────

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new LLMError(
      'Missing OPENAI_API_KEY environment variable. ' +
        'Set it in .env.local before running the application.',
    );
  }
  return new OpenAI({ apiKey });
}

// ─── callLLM ─────────────────────────────────────────────────────────────────

/**
 * Makes a single JSON-mode chat completion call to gpt-4o-mini.
 *
 * - Always enforces `response_format: { type: "json_object" }`.
 * - Always caps the response at `max_tokens: 1500` (the caller's value is
 *   accepted but silently clamped to 1500 per the token-budget requirement).
 * - Returns the raw JSON string from the model's first choice.
 * - Throws `LLMError` on API errors, HTTP 429 rate-limit responses, or when
 *   the response content is null / unparseable JSON.
 */
export async function callLLM(options: LLMCallOptions): Promise<string> {
  const { systemPrompt, userPrompt, maxTokens } = options;

  // Cap tokens — itinerary steps pass higher values for long trips
  const clampedMaxTokens = Math.min(maxTokens, 4000);

  const client = getClient();

  let rawContent: string | null;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      max_tokens: clampedMaxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    rawContent = completion.choices[0]?.message?.content ?? null;
  } catch (err) {
    // Surface rate-limit errors with a user-friendly message (Req 12.4)
    if (err instanceof OpenAI.APIError) {
      if (err.status === 429) {
        throw new LLMError(
          'OpenAI rate limit or quota exceeded. Please wait a moment and try again.',
          err,
        );
      }
      throw new LLMError(
        `OpenAI API error (HTTP ${err.status}): ${err.message}`,
        err,
      );
    }
    throw new LLMError(
      `Unexpected error calling OpenAI: ${err instanceof Error ? err.message : String(err)}`,
      err,
    );
  }

  // Guard against null / empty content
  if (rawContent === null || rawContent.trim() === '') {
    throw new LLMError('OpenAI returned an empty response.');
  }

  // Validate that the content is parseable JSON (JSON mode should guarantee
  // this, but we enforce it explicitly to satisfy Req 2.4 / 3.5 / 5.7 / 6.7 / 7.6)
  try {
    JSON.parse(rawContent);
  } catch {
    throw new LLMError(
      `OpenAI returned unparseable JSON: ${rawContent.slice(0, 200)}`,
    );
  }

  return rawContent;
}
