import { NextRequest, NextResponse } from 'next/server';
import type {
  FormData,
  PlanRequest,
  PlanResponse,
  PlanErrorResponse,
} from '@/types/pipeline';
import { AVAILABLE_CITIES } from '@/types/pipeline';
import { runPipeline } from '@/lib/pipeline';

// ─── Validation ───────────────────────────────────────────────────────────────

function validatePlanRequest(body: unknown): { valid: true; data: FormData } | { valid: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Request body must be a JSON object.' };
  }

  const b = body as Record<string, unknown>;

  // duration
  if (typeof b.duration !== 'number' || !Number.isInteger(b.duration) || b.duration < 1 || b.duration > 30) {
    return { valid: false, error: 'duration must be an integer between 1 and 30.' };
  }

  // budget_usd
  if (typeof b.budget_usd !== 'number' || b.budget_usd < 1) {
    return { valid: false, error: 'budget_usd must be a number ≥ 1.' };
  }

  // travelers
  if (typeof b.travelers !== 'number' || !Number.isInteger(b.travelers) || b.travelers < 1) {
    return { valid: false, error: 'travelers must be an integer ≥ 1.' };
  }

  // cities
  if (!Array.isArray(b.cities) || b.cities.length === 0) {
    return { valid: false, error: 'cities must be a non-empty array.' };
  }
  const validCities = AVAILABLE_CITIES as readonly string[];
  for (const city of b.cities) {
    if (typeof city !== 'string' || !validCities.includes(city)) {
      return { valid: false, error: `Invalid city: "${city}". Must be one of: ${AVAILABLE_CITIES.join(', ')}.` };
    }
  }

  // interests
  if (!Array.isArray(b.interests)) {
    return { valid: false, error: 'interests must be an array.' };
  }
  const validInterests = ['history', 'halal food', 'shopping', 'nature', 'culture'];
  for (const interest of b.interests) {
    if (typeof interest !== 'string' || !validInterests.includes(interest)) {
      return { valid: false, error: `Invalid interest: "${interest}". Must be one of: ${validInterests.join(', ')}.` };
    }
  }

  // pace
  const validPaces = ['relaxed', 'moderate', 'packed'];
  if (typeof b.pace !== 'string' || !validPaces.includes(b.pace)) {
    return { valid: false, error: `pace must be one of: ${validPaces.join(', ')}.` };
  }

  const data: FormData = {
    duration: b.duration as number,
    budget_usd: b.budget_usd as number,
    travelers: b.travelers as number,
    cities: b.cities as string[],
    interests: b.interests as FormData['interests'],
    pace: b.pace as FormData['pace'],
  };

  return { valid: true, data };
}

// ─── POST /api/plan ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse<PlanResponse | PlanErrorResponse>> {
  // Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON in request body.', trace: [] } satisfies PlanErrorResponse,
      { status: 400 },
    );
  }

  // Validate shape
  const validation = validatePlanRequest(body);
  if (!validation.valid) {
    console.error('[API /plan] Validation error:', validation.error);
    return NextResponse.json(
      { success: false, error: validation.error, trace: [] } satisfies PlanErrorResponse,
      { status: 400 },
    );
  }

  const formData = validation.data;
  console.log('[API /plan] Request received:', JSON.stringify(formData, null, 2));

  // Run pipeline
  const result = await runPipeline(formData);

  // Log each step trace
  for (const step of result.trace) {
    console.log(`[API /plan] Step: ${step.stepName} (${step.durationMs}ms)`);
    console.log(`[API /plan]   Prompt: ${step.prompt.slice(0, 200)}...`);
    console.log(`[API /plan]   Response: ${step.rawResponse.slice(0, 200)}...`);
  }

  if (!result.success) {
    console.error(`[API /plan] Pipeline failed at step "${result.failedStep}": ${result.error}`);
    return NextResponse.json(
      {
        success: false,
        error: result.error ?? 'Pipeline failed.',
        failedStep: result.failedStep,
        trace: result.trace,
      } satisfies PlanErrorResponse,
      { status: 500 },
    );
  }

  console.log('[API /plan] Pipeline succeeded. Grand total:', result.budgetBreakdown?.grand_total);

  return NextResponse.json(
    {
      success: true,
      itinerary: result.itinerary!,
      budgetBreakdown: result.budgetBreakdown!,
      trace: result.trace,
    } satisfies PlanResponse,
    { status: 200 },
  );
}
