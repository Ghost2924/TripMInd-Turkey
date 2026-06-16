# TECHNICAL_IMPLEMENTATION_GUIDE.md

## 1. Technical Stack Configuration
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (Strict Mode)
- **Styling:** Tailwind CSS (Responsive Utility Classes)
- **Orchestration Core:** OpenAI SDK with Structured Outputs (`response_format: { type: "json_object" }`), target model `gpt-4o-mini`.

## 2. Step-by-Step Backend Architecture & Code Layout

### Step 2.1: API Entry Point (`src/app/api/plan/route.ts`)
- Implement an async `POST` handler.
- Run a hardcoded schema check. If fields are invalid, return an early HTTP 400 response.
- Instantiate the pipeline engine inside a try/catch loop to isolate runtime failures.

### Step 2.2: The Context Retrieval Filter (`src/lib/rag/retrieval.ts`)
- Read data records synchronously from `src/data/`.
- Maintain a explicit keyword matching map `INTEREST_TO_CATEGORIES`. Ensure `"shopping"` explicitly maps to its corresponding category array to prevent asset exclusion.
- Return isolated arrays of `filteredHotels`, `filteredRestaurants`, and `filteredAttractions`.

### Step 2.3: Generative Structure Component (`src/lib/pipeline/step3-itinerary.ts`)
- Construct an OpenAI chat completion payload.
- **Critical Configuration:** Set `maxTokens: 4000` to prevent truncation on longer multi-city requests (e.g., 10-day trip profiles).
- Enforce a rigid JSON output format representing an array of days containing structured activity segments.

### Step 2.4: Safe Enrichment Execution Layer (`src/lib/pipeline/step3b-enrichment.ts`)
- Process the generated text array via standard code iterations.
- To prevent double-annotation bugs during recursive pipeline cycles, do not mutate state inline. Use the spread operator to cleanly copy data structures:
```typescript
  return { ...segment, notes: `${emoji_prefix} ${venueName}` };