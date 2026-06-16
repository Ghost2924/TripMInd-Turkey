# LOGICAL_STRUCTURE.md

## 1. System Topology & Data Flow
TripMind-Turkey operates as a decoupled client-server architecture built on Next.js 14. System workflows progress linearly through an input-sanitization guard, a semantic extraction phase, a local context retrieval layer, an LLM orchestration loop, and a deterministic code-enrichment block.

[User Input Form]
│
▼
[src/app/api/plan/route.ts] ──(Fails)──► [HTTP 400 Bad Request]
│ (Passes Native Code Validation)
▼
[src/lib/pipeline/step1-profile.ts] ──► (Returns Normalized TripProfile JSON)
│
▼
[src/lib/rag/retrieval.ts] ──► (Filters Local JSON Data by City & Halal Filters)
│
▼
[src/lib/pipeline/step3-itinerary.ts] ──► (Generates Base Itinerary Schema via GPT-4o-mini)
│
▼
[src/lib/pipeline/step3b-enrichment.ts] ──► (Pure Code: Matches Hotels & Restitches Data)
│
▼
[src/lib/budget.ts] ──► (Keyword Classification & Final Cost Aggregation)
│
▼
[Client UI Rendering]

## 2. Ecosystem & Pipeline Phase Specifications

### Phase A: Input Validation & Sanitization (Native Code)
- Intercepts requests at `src/app/api/plan/route.ts`.
- Validates that duration is an integer between 1 and 30, budget is a positive number, and strings match accepted enum parameters (Istanbul, Cappadocia, Antalya, Ephesus, Pamukkale, Bodrum).

### Phase B: Semantic Extraction (`step1-profile.ts`)
- Calls `gpt-4o-mini` with strict JSON schema outputs to standardize loose user input into a strongly-typed `TripProfile` object.

### Phase C: Context-Aware RAG Filtering (`retrieval.ts`)
- Ingests the `TripProfile` and filters local static database files (`data/`).
- Discards any restaurant record where `halal !== true` if the user specifies halal restrictions.
- Limits all arrays to venues physically matching the requested target cities.

### Phase D: Generation Loop & Activity Constraint (`step3-itinerary.ts`)
- Prompts the LLM to output an itinerary layout based strictly on pacing parameters (e.g., `moderate` = precisely 3 activities/day).
- Enforces strict activity naming rules, requiring meal segments to include explicit text strings like "breakfast", "lunch", or "dinner".

### Phase E: Deterministic Enrichment (`step3b-enrichment.ts`)
- Implements an isolated pure-code layer that programmatically matches and injects the highest-rated local hotels and restaurants based on calculated cost-to-budget limits. No AI hallucinations can occur here because model interaction is completely disabled in this phase.