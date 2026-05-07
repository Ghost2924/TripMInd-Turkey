# Implementation Plan: TripMind Turkey

## Overview

Implement TripMind Turkey as a Next.js 14 (App Router) single-page application with a five-step AI pipeline. Tasks are ordered to build the foundation first (types, data, utilities), then the pipeline steps, then the API route, and finally the UI components — ensuring each step integrates cleanly into the previous one.

## Tasks

- [x] 1. Initialize project structure and shared TypeScript types
  - Scaffold a Next.js 14 App Router project with TypeScript and Tailwind CSS
  - Create `src/types/pipeline.ts` defining all shared interfaces: `FormData`, `TripProfile`, `RetrievalQueries`, `HotelRecord`, `RestaurantRecord`, `AttractionRecord`, `TransportationRecord`, `FilteredRAGSubset`, `DaySegment`, `DayEntry`, `Itinerary`, `ValidationResult`, `ValidationFailure`, `DayBudget`, `BudgetBreakdown`, `PipelineStepTrace`, `PipelineStepResult<T>`, `PipelineResult`, `PlanRequest`, `PlanResponse`, `PlanErrorResponse`, `LLMCallOptions`
  - Define `Interest`, `TravelPace`, and `AVAILABLE_CITIES` constants
  - Create the full directory tree under `src/` as specified in the design
  - _Requirements: 1.1, 2.2, 3.2, 4.1, 5.2, 6.5, 7.4, 8.1_

- [x] 2. Create RAG data files
  - All four data files are static, hand-seeded JSON — no runtime API calls are made to populate them. OpenAI is the only external API used in this project. Data is researched once from public sources (Wikivoyage, Wikipedia, travel guides) and committed as static files.
  - [x] 2.1 Create `src/data/hotels.json` with at least 10 records covering Istanbul, Cappadocia, Antalya, Ephesus, Pamukkale, and Bodrum; each record must include `name`, `city`, `price_per_night`, `rating`, and `family_friendly`
    - Include at least 2 records per city; mix of budget and mid-range options
    - Use real hotel names sourced from Wikivoyage or travel guides (no API call required)
    - Ensure a mix of `family_friendly: true` and `family_friendly: false` records
    - `price_per_night` in USD, `rating` on a 1–5 scale
    - _Requirements: 4.1, 4.2_
  - [x] 2.2 Create `src/data/restaurants.json` with at least 10 records across the same cities; each record must include `name`, `city`, `cuisine`, `halal`, and `price_range`
    - Include at least 1 halal-certified restaurant per city (`halal: true`)
    - Use real or well-known restaurant names sourced from Wikivoyage "Eat" sections (no API call required)
    - `cuisine` should reflect authentic Turkish regional variety (e.g. "Ottoman", "Aegean", "Anatolian", "Seafood")
    - `price_range` is USD per person (e.g. 5–15 for budget, 15–40 for mid-range)
    - _Requirements: 4.1, 4.3_
  - [x] 2.3 Create `src/data/attractions.json` with at least 12 records across the same cities; each record must include `name`, `city`, `category`, `duration_hours`, and `cost_usd`
    - Include at least 2 records per city
    - Use real attraction names sourced from Wikipedia or Wikivoyage city pages (no API call required)
    - `category` must be one of: `"history"`, `"nature"`, `"culture"`, `"shopping"`, `"religion"`
    - `duration_hours` is a realistic visit duration (e.g. 1.5 for a mosque, 3 for a museum)
    - `cost_usd` is the real or approximate entrance fee in USD (use 0 for free attractions)
    - _Requirements: 4.1, 4.4_
  - [x] 2.4 Create `src/data/transportation.json` with records for all common city-pair routes between the 6 cities; each record must include `origin_city`, `destination_city`, `cost_usd`, `duration_hours`, and `method`
    - Cover all meaningful city pairs (at minimum: Istanbul↔Cappadocia, Istanbul↔Antalya, Istanbul↔Bodrum, Antalya↔Pamukkale, Pamukkale↔Ephesus, Ephesus↔Bodrum, and their reverses)
    - Data sourced from Wikivoyage "Get in / Get around" sections and public timetable knowledge (no API call required)
    - `method` must be one of: `"flight"`, `"bus"`, `"train"`, `"ferry"`
    - Where multiple methods exist for the same pair (e.g. flight and bus Istanbul→Antalya), include a separate record for each method
    - `cost_usd` and `duration_hours` should reflect realistic averages
    - _Requirements: 4.1, 4.5_

- [x] 3. Implement the OpenAI client wrapper
  - [x] 3.1 Create `src/lib/openai.ts` implementing `callLLM(options: LLMCallOptions): Promise<string>`
    - Enforce `response_format: { type: "json_object" }` and `max_tokens: 1500` on every call
    - Throw a typed `LLMError` on API errors, rate-limit responses (HTTP 429), or unparseable JSON
    - Include the `OPENAI_API_KEY` environment variable lookup; throw a clear error if missing
    - _Requirements: 2.3, 3.3, 5.3, 6.6, 7.5, 11.1, 11.2, 11.5_
  - [ ]* 3.2 Write unit tests for `callLLM`
    - Mock the OpenAI HTTP client; test successful JSON response, API error path, rate-limit path, and missing API key path
    - _Requirements: 12.1, 12.4_

- [x] 4. Implement client-side form validation
  - [x] 4.1 Create `src/lib/validation/form.ts` with a `validateForm(data: FormData): string[]` function that returns an array of error messages
    - Validate: at least one city selected, duration 1–30, budget_usd ≥ 1, travelers ≥ 1
    - _Requirements: 1.5, 1.6, 1.7, 1.8_
  - [ ]* 4.2 Write unit tests for `validateForm`
    - Test each validation rule independently; test a fully valid form returns an empty array
    - _Requirements: 1.5, 1.6, 1.7, 1.8_

- [x] 5. Implement RAG retrieval logic
  - [x] 5.1 Create `src/lib/rag/types.ts` re-exporting the RAG record types from `pipeline.ts` (or define them here if preferred)
    - _Requirements: 4.1–4.5_
  - [x] 5.2 Create `src/lib/rag/retrieval.ts` implementing `filterRAGData(queries: RetrievalQueries, profile: TripProfile): FilteredRAGSubset`
    - Filter hotels by cities in the profile; prioritize `family_friendly: true` records
    - Filter restaurants by cities; when `halal food` is in `profile.interests`, include only `halal: true` records
    - Filter attractions by cities and relevant categories derived from the queries
    - Filter transportation records to routes between the selected cities
    - _Requirements: 4.6, 4.7, 4.8_
  - [ ]* 5.3 Write unit tests for `filterRAGData`
    - Test halal-only filtering when interest is `halal food`
    - Test family-friendly hotel prioritization
    - Test city-scoped filtering excludes records from unselected cities
    - _Requirements: 4.6, 4.7, 4.8_

- [x] 6. Implement Pipeline Step 1 — Profile Extraction
  - [x] 6.1 Create `src/lib/pipeline/step1-profile.ts` implementing the profile extraction step
    - Accept raw `FormData`; build a system + user prompt containing only the raw form field values (no RAG data, no prior step outputs)
    - Call `callLLM` with `maxTokens: 1500` and a JSON schema for `TripProfile`
    - Parse and return `PipelineStepResult<TripProfile>` including the full trace
    - Throw/propagate `LLMError` on failure
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 11.4_
  - [ ]* 6.2 Write unit tests for Step 1
    - Mock `callLLM`; test successful profile extraction and malformed JSON error propagation
    - _Requirements: 2.4_

- [x] 7. Implement Pipeline Step 2 — Query Generation
  - [x] 7.1 Create `src/lib/pipeline/step2-queries.ts` implementing the query generation step
    - Accept `TripProfile`; build a prompt containing only the Trip Profile JSON (no RAG data)
    - Call `callLLM` with `maxTokens: 1500` and a JSON schema for `RetrievalQueries`
    - Parse and return `PipelineStepResult<RetrievalQueries>` including the full trace
    - Throw/propagate `LLMError` on failure
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 11.4_
  - [ ]* 7.2 Write unit tests for Step 2
    - Mock `callLLM`; test successful query generation and malformed JSON error propagation
    - _Requirements: 3.5_

- [x] 8. Implement Pipeline Step 3 — Itinerary Generation
  - [x] 8.1 Create `src/lib/pipeline/step3-itinerary.ts` implementing the itinerary generation step
    - Accept `TripProfile` and `FilteredRAGSubset`; build a prompt including both (not the full unfiltered files)
    - Encode pace constraints in the prompt: relaxed ≤ 2 activities/day, moderate = 3, packed ≥ 4
    - Call `callLLM` with `maxTokens: 1500` and a JSON schema for `Itinerary`
    - Parse and return `PipelineStepResult<Itinerary>` including the full trace
    - Throw/propagate `LLMError` on failure
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 11.4_
  - [ ]* 8.2 Write unit tests for Step 3
    - Mock `callLLM`; test successful itinerary parsing and malformed JSON error propagation
    - _Requirements: 5.7_

- [x] 9. Implement Pipeline Step 4 — Validation
  - [x] 9.1 Create `src/lib/pipeline/step4-validation.ts` implementing the validation step
    - Accept `Itinerary` and `TripProfile`; build a prompt instructing the LLM to check: total cost ≤ budget, at least one activity per selected interest, and every day has morning/afternoon/evening sections
    - Call `callLLM` with `maxTokens: 1500` and a JSON schema for `ValidationResult`
    - Parse and return `PipelineStepResult<ValidationResult>` including the full trace
    - Throw/propagate `LLMError` on failure
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 11.4_
  - [ ]* 9.2 Write unit tests for Step 4
    - Mock `callLLM`; test `passed: true` path, `passed: false` with failures array, and malformed JSON error propagation
    - _Requirements: 6.7_

- [x] 10. Implement Pipeline Step 5 — Conditional Revision
  - [x] 10.1 Create `src/lib/pipeline/step5-revision.ts` implementing the revision step
    - Accept `Itinerary`, `TripProfile`, `FilteredRAGSubset`, and `ValidationFailure[]`; build a prompt including all four inputs
    - Call `callLLM` with `maxTokens: 1500` and a JSON schema for `Itinerary`
    - Parse and return `PipelineStepResult<Itinerary>` including the full trace
    - Throw/propagate `LLMError` on failure
    - _Requirements: 7.1, 7.3, 7.4, 7.5, 7.6, 11.4_
  - [ ]* 10.2 Write unit tests for Step 5
    - Mock `callLLM`; test successful revision output and malformed JSON error propagation
    - _Requirements: 7.6_

- [x] 11. Implement budget computation utility
  - [x] 11.1 Create `src/lib/budget.ts` implementing `computeBudgetBreakdown(itinerary: Itinerary): BudgetBreakdown`
    - Sum costs per day across accommodation, food, attractions, and transportation segments
    - Compute `grand_total` and `by_category` totals
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [ ]* 11.2 Write unit tests for `computeBudgetBreakdown`
    - Test per-day totals, grand total, and by-category sums with a known fixture itinerary
    - _Requirements: 8.2, 8.3, 8.4_

- [x] 12. Implement itinerary structural validation helpers
  - Create `src/lib/validation/itinerary.ts` with helper functions used by Step 4 prompt construction and any server-side checks:
    - `computeTotalCost(itinerary: Itinerary): number`
    - `hasInterestCoverage(itinerary: Itinerary, interests: string[]): boolean`
    - `allDaysHaveAllSegments(itinerary: Itinerary): boolean`
  - _Requirements: 6.2, 6.3, 6.4_

- [x] 13. Implement the pipeline orchestrator
  - [x] 13.1 Create `src/lib/pipeline/index.ts` implementing `runPipeline(formData: FormData): Promise<PipelineResult>`
    - Execute steps sequentially: Step 1 → Step 2 → RAG retrieval → Step 3 → Step 4 → (Step 5 if validation failed)
    - Invoke Step 5 at most once per execution
    - Accumulate `PipelineStepTrace` entries from every executed step into the result
    - On any `LLMError`, set `success: false`, populate `error` and `failedStep`, and return the partial trace
    - On success, call `computeBudgetBreakdown` and return the full `PipelineResult`
    - _Requirements: 2.1, 3.1, 4.6, 5.1, 6.1, 7.1, 7.2, 7.7, 8.1, 11.6, 12.1, 12.2, 12.5_
  - [ ]* 13.2 Write unit tests for the pipeline orchestrator
    - Mock all five step modules and `filterRAGData`; test the happy path (validation passes, Step 5 skipped), the revision path (validation fails, Step 5 runs once), and the error-abort path (Step 2 throws, partial trace returned)
    - _Requirements: 7.2, 7.7, 12.1_

- [x] 14. Checkpoint — Ensure all tests pass
  - Run `npx vitest --run` and confirm all unit tests pass before proceeding to the API route and UI layers. Ask the user if any questions arise.

- [x] 15. Implement the Next.js API route
  - Create `src/app/api/plan/route.ts` as a `POST` handler
  - Parse and validate the request body against `PlanRequest` shape; return HTTP 400 with a descriptive error if invalid
  - Call `runPipeline(formData)` and return the `PipelineResult` as JSON
  - Map `success: false` results to HTTP 500 responses; map `success: true` to HTTP 200
  - Log each pipeline step's input, output, and any errors to the server console
  - _Requirements: 1.9, 12.1, 12.2, 12.3, 12.5_

- [x] 16. Implement UI components
  - [x] 16.1 Create `src/components/LoadingIndicator.tsx` — a spinner/loading state component shown while the pipeline runs
    - _Requirements: 1.9_
  - [x] 16.2 Create `src/components/ErrorMessage.tsx` — displays a human-readable error message and re-enables the form
    - _Requirements: 12.1, 12.2, 12.3, 12.4_
  - [x] 16.3 Create `src/components/PlannerForm.tsx` — the structured trip planning form
    - Render all six fields: duration, budget_usd, travelers, cities (multi-select with all six cities), interests (multi-select), pace (single-select with exactly three options)
    - Wire client-side validation from `validateForm`; display errors inline without invoking the pipeline
    - On valid submit: disable the submit button, show `LoadingIndicator`, POST to `/api/plan`, then transition to results or error state
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_
  - [x] 16.4 Create `src/components/TraceStep.tsx` — a single collapsible pipeline step section
    - Display step name, prompt (input), and raw JSON response (output) in a formatted, readable style
    - Collapsed by default
    - _Requirements: 10.2, 10.3, 10.4, 10.5_
  - [x] 16.5 Create `src/components/PipelineTracePanel.tsx` — the collapsible trace panel containing one `TraceStep` per executed step
    - Collapsed by default; renders even when the pipeline returned an error
    - _Requirements: 10.1, 10.2, 10.4_
  - [x] 16.6 Create `src/components/ItineraryDisplay.tsx` — renders the day-by-day itinerary
    - Each day is a distinct section labeled with day number and city
    - Each day section has three labeled sub-sections: Morning, Afternoon, Evening
    - Each activity shows name, estimated cost, and duration
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [x] 16.7 Create `src/components/BudgetBreakdown.tsx` — renders the budget summary
    - Show per-day totals, grand total, and by-category breakdown
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.5_
  - [x] 16.8 Create `src/components/ResultsView.tsx` — container that composes `ItineraryDisplay`, `BudgetBreakdown`, and `PipelineTracePanel`
    - _Requirements: 9.1, 9.5, 10.1_

- [x] 17. Wire the root page
  - Update `src/app/page.tsx` to manage application state: idle (show `PlannerForm`), loading (show `LoadingIndicator`), success (show `ResultsView`), and error (show `ErrorMessage` with the form re-enabled)
  - Log each pipeline step's input, output, and errors to the browser console on the client side
  - _Requirements: 1.9, 12.3, 12.5_

- [x] 18. Final checkpoint — Ensure all tests pass and the app builds
  - Run `npx vitest --run` to confirm all tests pass
  - Run `npx next build` to confirm the project compiles without TypeScript errors
  - Ask the user if any questions arise before considering the feature complete.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- The pipeline is intentionally synchronous and sequential — no streaming, no parallelism
- The OpenAI API key must be set in `.env.local` as `OPENAI_API_KEY`
- All LLM calls are server-side only; the browser never contacts OpenAI directly
- The design has no Correctness Properties defined, so property-based tests are not included; unit tests cover the critical paths instead
