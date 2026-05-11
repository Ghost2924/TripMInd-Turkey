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

## Getting started

1. Navigate into the project folder:

```
cd TripMInd-Turkey
```

2. Install dependencies:

```
npm install
```

2. Create a `.env.local` file and add your OpenAI API key:

```
OPENAI_API_KEY=your_key_here
```

3. Run the app:

```
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
