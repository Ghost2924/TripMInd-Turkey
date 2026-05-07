import type { FormData, PipelineResult, PipelineStepTrace } from '@/types/pipeline';
import { LLMError } from '@/lib/openai';
import { computeBudgetBreakdown } from '@/lib/budget';
import { extractProfile } from './step1-profile';
import { generateQueries } from './step2-queries';
import { filterRAGData } from '@/lib/rag/retrieval';
import { runStep3Itinerary } from './step3-itinerary';
import { runStep4Validation } from './step4-validation';
import { runRevisionStep } from './step5-revision';
import { enrichItinerary } from './step3b-enrichment';

/**
 * Pipeline Orchestrator
 *
 * Executes the five-step AI pipeline sequentially:
 *   Step 1 → Step 2 → RAG retrieval → Step 3 → Step 4 → (Step 5 if needed)
 *
 * Rules (per design + requirements):
 *  - Step 5 runs at most once per execution (Req 7.7).
 *  - On any LLMError, execution stops immediately; the partial trace and
 *    error details are returned with success: false (Req 12.1, 12.2).
 *  - On full success, computeBudgetBreakdown is called on the final itinerary
 *    and the complete PipelineResult is returned (Req 8.1).
 *  - Every executed step's PipelineStepTrace is accumulated in order (Req 10.1).
 */
export async function runPipeline(formData: FormData): Promise<PipelineResult> {
  const trace: PipelineStepTrace[] = [];

  // ── Step 1: Profile Extraction ─────────────────────────────────────────────
  let profileResult;
  try {
    profileResult = await extractProfile(formData);
  } catch (err) {
    return buildError(err, 'Profile Extraction', trace);
  }
  trace.push(profileResult.trace);
  const profile = profileResult.output;

  // ── Step 2: Query Generation ───────────────────────────────────────────────
  let queriesResult;
  try {
    queriesResult = await generateQueries(profile);
  } catch (err) {
    return buildError(err, 'Query Generation', trace);
  }
  trace.push(queriesResult.trace);
  const queries = queriesResult.output;

  // ── RAG Retrieval (no LLM call — pure local filtering) ────────────────────
  const ragSubset = filterRAGData(queries, profile);

  // ── Step 3: Itinerary Generation ───────────────────────────────────────────
  let itineraryResult;
  try {
    itineraryResult = await runStep3Itinerary(profile, ragSubset);
  } catch (err) {
    return buildError(err, 'Itinerary Generation', trace);
  }
  trace.push(itineraryResult.trace);
  let itinerary = enrichItinerary(itineraryResult.output, ragSubset, profile);

  // ── Step 4: Validation ─────────────────────────────────────────────────────
  let validationResult;
  try {
    validationResult = await runStep4Validation(itinerary, profile);
  } catch (err) {
    return buildError(err, 'Itinerary Validation', trace);
  }
  trace.push(validationResult.trace);
  const validation = validationResult.output;

  // ── Step 5: Conditional Revision (at most once) ────────────────────────────
  if (!validation.passed && validation.failures.length > 0) {
    let revisionResult;
    try {
      revisionResult = await runRevisionStep(itinerary, profile, ragSubset, validation.failures);
    } catch (err) {
      return buildError(err, 'Itinerary Revision', trace);
    }
    trace.push(revisionResult.trace);
    itinerary = enrichItinerary(revisionResult.output, ragSubset, profile);
  }

  // ── Success: compute budget and return ─────────────────────────────────────
  const budgetBreakdown = computeBudgetBreakdown(itinerary);

  return {
    success: true,
    itinerary,
    budgetBreakdown,
    trace,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a failed PipelineResult from a caught error.
 * Preserves the partial trace accumulated before the failure.
 */
function buildError(
  err: unknown,
  failedStep: string,
  trace: PipelineStepTrace[],
): PipelineResult {
  const message =
    err instanceof LLMError
      ? err.message
      : err instanceof Error
        ? err.message
        : String(err);

  return {
    success: false,
    error: message,
    failedStep,
    trace,
  };
}
