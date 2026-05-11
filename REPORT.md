# REPORT

## What & Why

TripMind Turkey is a web app that helps people plan trips to Turkey. You put in how many days you're going, your budget, how many people are coming, which cities you want to visit, what you're into (like history or halal food), and how busy you want the trip to be. Then it gives you a full day-by-day plan with morning, afternoon, and evening activities, which hotel you're staying at, how you're getting between cities, and a breakdown of what everything costs.

The hard part is making the AI actually behave. There are a few things that kept going wrong. First, the model would go over budget constantly — it just doesn't naturally think about money. Second, it would forget to include certain interests: if someone said they wanted to go shopping, the itinerary would have zero shopping activities. Third, sometimes a day would be missing a section entirely. All these problems interact with each other too, so if you fix the budget by swapping out an activity you might accidentally break the interest coverage. That's why I ended up needing a validation and revision step, and why a single-prompt approach wouldn't work — there's no clean way to enforce budget math, interest coverage, and structural completeness all at once without a feedback loop.

---

## Iterations

### V1 — First attempt

**Change:** Started with one big prompt containing everything — the trip info, all hotel data, all restaurant data — with no schema, no validation, and no structured output format. Just one call and hope for the best.

**Motivating example:** TC05 (10-day trip, all 6 cities, every interest selected) returned a mix of JSON and plain-text explanation, so the parser crashed immediately. TC07 (2-day Bodrum, $600 budget) produced a plan costing over $1,100 — the model treated the budget as a suggestion buried in a wall of text.

**Delta:** 0/10 test cases passed. 4 failed due to broken JSON, 3 of the remaining 6 went over budget.

**Conclusion:** One unstructured prompt doesn't work. Adding `response_format: json_object` with a schema fixed the parsing failures. Budget violations persisted because the model had no mechanism to check its own math. The next step was to break the problem into smaller, focused calls.

---

### V2 — Breaking it into steps

**Change:** Split everything into a 5-step pipeline: Step 1 normalizes form input into a `TripProfile`, Step 2 generates search queries, Step 3 builds the itinerary from filtered RAG data, Step 4 validates it against budget/interests/completeness, Step 5 re-prompts with the exact list of failures if validation didn't pass. Also added a RAG layer (`retrieval.ts`) that filters hotels, restaurants, and attractions down to only the user's selected cities before anything is sent to the model.

**Motivating example:** TC03 (7-day Antalya + Pamukkale, shopping interest) never included a single bazaar or market activity. The root cause was in `retrieval.ts` — the `INTEREST_TO_CATEGORIES` map at line 25 didn't include `shopping` as a mapped category, so shopping attractions were filtered out before the model ever saw them. The model wasn't ignoring shopping; it simply wasn't given any shopping venues to work with.

**Delta:** 6/10 passed. Budget violations dropped from 3 to 1. No more JSON crashes. 2 interest coverage failures remained.

**Conclusion:** Smaller focused prompts with less data produced much better outputs. The interest coverage issue turned out to be a retrieval problem, not a model problem — fixing the keyword map and adding Step 5 to re-prompt with specific failures resolved it. The remaining failures were a token limit issue, addressed in V3.

---

### V3 — Token limit and activity naming rules

**Change:** Bumped `maxTokens` from 1500 to 4000 in `step3-itinerary.ts` (line 126) and `step5-revision.ts` (line 146), and updated the hard cap in `openai.ts` (line 45) to clamp at 4000 instead of 1500. Also added explicit activity naming rules to the Step 3 system prompt requiring meal activities to include words like "breakfast", "lunch", or "dinner" so the keyword classifier in `budget.ts` (line 60) could reliably distinguish food costs from sightseeing costs.

**Motivating example:** TC05 kept failing with `"OpenAI returned unparseable JSON"`. The model was generating valid JSON but hitting the token limit mid-object and getting cut off. Separately, TC01 had dinner costs showing up under "attractions" in the budget breakdown because the model named the activity "Hamdi Restaurant" with no meal keyword — the classifier in `budget.ts` defaulted it to attractions.

**Delta:** 8/10 passed. TC05 fixed completely. Food costs categorized correctly in 9/10 cases. The 2 remaining failures are rate-limit errors from the API key under load, not logic bugs.

**Conclusion:** The token cutoff was a frustrating bug because it looked like hallucination but was actually truncation. The naming rules fix was an interesting design choice: instead of asking the AI to categorize activities, I constrained how it names them so that regular string matching in `budget.ts` works reliably. This is more robust than a second LLM call for classification. Next step would be adding retry logic for rate-limit failures.

---

## Code Walkthrough

Say a user submits: 3 days, $800, 2 travelers, Istanbul, history + halal food, moderate pace.

**Step 1 — Input validation:** The POST request hits `src/app/api/plan/route.ts:13`. `validatePlanRequest` checks that duration is 1–30, budget is positive, cities are in the allowed list, interests are valid strings, and pace is one of relaxed/moderate/packed. Bad input returns a 400 before the AI is ever called — this is intentional so the pipeline never receives malformed data.

**Step 2 — Profile extraction:** `runPipeline` at `src/lib/pipeline/index.ts:26` starts. `step1-profile.ts` sends the raw form data to the model and gets back a normalized `TripProfile` JSON object. This step exists because the form data is user-facing (loose strings) and the pipeline needs a clean typed structure.

**Step 3 — RAG filter:** `filterRAGData` at `src/lib/rag/retrieval.ts:83` cuts the four data files down to Istanbul-only records. Because halal food is selected, the restaurant filter at line 105 drops any record where `halal !== true`. The model only sees venues that are actually relevant.

**Step 4 — Itinerary generation:** `runStep3Itinerary` at `src/lib/pipeline/step3-itinerary.ts:107` sends the filtered subset to the model. The system prompt encodes the pace rule: moderate = exactly 3 activities per day. Returns a `{ days: [...] }` JSON object validated against a strict schema.

**Step 5 — Enrichment (no LLM):** `enrichItinerary` at `src/lib/pipeline/step3b-enrichment.ts:306` runs in pure code. It assigns the best hotel for each city by sorting on rating (`step3b-enrichment.ts:106`), attaches halal restaurant suggestions to meal segments, and adds transport legs between cities. The key design decision here was doing hotel assignment in code rather than letting the model pick. When the model chose hotels, it invented names not in the data. Doing it in `enrichItinerary` guarantees every hotel comes from a real record with a real price. The alternative I considered was giving the model a hotel-selection sub-prompt, but that adds latency and another failure mode.

**Step 6 — Validate + budget:** Step 4 of the pipeline checks budget, interests, and segment completeness. If it passes, `computeBudgetBreakdown` in `src/lib/budget.ts:60` classifies each activity by keyword and builds the per-day and category cost totals.

---

## AI Disclosure & Safety

I used Kiro for the main coding work. It was useful for scaffolding the Next.js project, setting up the TypeScript types in `src/types/pipeline.ts`, and drafting the initial pipeline step structure.

Three specific moments where it failed and I had to fix things manually:

1. **Double-annotation bug:** The `enrichItinerary` function Kiro wrote was mutating `segment.notes` directly on the original object. When Step 5 ran after Step 3, restaurant names got appended twice to the same segment. I fixed this by making `annotateRestaurant` and `annotateAttraction` return new segment objects with the spread operator (`{ ...segment, notes: ... }`) and adding an early-return guard that checks if the emoji prefix already exists (`step3b-enrichment.ts:240`).

2. **`require()` in an `.mjs` file:** The eval script Kiro generated used `require('fs')` and `require('path')`, which crashes in an ES module context. I rewrote the imports to use `import { readFileSync } from 'fs'` and `fileURLToPath` from `url` to reconstruct `__dirname`, which doesn't exist natively in `.mjs` files.

3. **Silent token truncation:** Kiro set `maxTokens: 1500` everywhere in the pipeline. For TC05 (10-day, all 6 cities), the model was generating valid JSON that got cut off mid-object, producing an unparseable response. The error looked like a model failure but was actually a configuration cap. I raised the limit to 4000 in the itinerary and revision steps and updated the clamp in `openai.ts:45`.

**Safety risk:** The specific risk for this app is a user planning a real trip around AI-generated venue details — prices, hours, or restaurant names — that don't match reality. Someone could book flights to Istanbul, show up at a restaurant from the itinerary, and find it closed or priced at 3× what the plan said. Generic hallucination warnings don't capture this because the harm is concrete and trip-specific.

My mitigation: hotel and restaurant assignments are done entirely in code from the local JSON data files, not by the model (`step3b-enrichment.ts`). The model only picks *activities* (sightseeing, walking tours, etc.) — the structured venue data (names, prices, halal status) comes from records I curated. The accepted limit is that activity costs are still model-generated estimates and could be wrong; I add a disclaimer in the UI that costs are approximate.
