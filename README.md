# TripMind Turkey

AI-powered travel planner for Turkey. Enter your trip details and get a personalized day-by-day itinerary with budget breakdown and halal-friendly dining.

**Destinations:** Istanbul · Cappadocia · Antalya · Ephesus · Pamukkale · Bodrum

---

## Features

- Day-by-day itinerary based on your duration, budget, cities, interests, and pace
- Halal restaurant suggestions
- Automatic hotel and transport assignments
- Budget breakdown per day and category

---

## Tech stack

- Next.js 14, TypeScript, Tailwind CSS
- OpenAI (structured JSON output)
- Local JSON data (hotels, restaurants, attractions, transportation)

---

## Requirements

- Node.js 18 or higher
- An OpenAI API key with access to `gpt-4o-mini`

---

## Setup and run

1. Clone the repo and install dependencies:

```
npm install
```

2. Copy the example env file and add your OpenAI API key:

```
cp .env.example .env.local
```

Open `.env.local` and replace `your_openai_api_key_here` with your actual key.

3. Start the development server:

```
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

Fill in the form (duration, budget, cities, interests, pace) and click **Plan My Trip**.

---

## Running the eval

The eval script tests the live API against 12 labeled test cases. The app must be running before you run eval.

1. Start the app (if not already running):

```
npm run dev
```

2. In a separate terminal, run the eval:

```
node eval/eval.mjs
```

To target a different host (e.g., production):

```
node eval/eval.mjs --base-url https://your-deployment-url.com
```

The script prints a pass/fail table and exits with code 0 (all pass) or 1 (any fail).

---

## Project structure

```
src/
  app/
    api/plan/route.ts       # POST /api/plan — validates input, runs pipeline
    page.tsx                # Main UI page
  components/               # React UI components
  lib/
    pipeline/               # 5-step AI pipeline (profile → queries → itinerary → validation → revision)
    rag/                    # Local JSON retrieval (hotels, restaurants, attractions, transport)
    budget.ts               # Budget breakdown computation
  data/                     # Local JSON data files
  types/pipeline.ts         # Shared TypeScript types
eval/
  eval.mjs                  # Eval script
  test_cases.json           # 12 labeled test cases
```
