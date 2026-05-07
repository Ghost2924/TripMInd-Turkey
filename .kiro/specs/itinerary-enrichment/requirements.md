# Requirements Document

## Introduction

The itinerary enrichment feature extends the Turkey trip planner's day-by-day itinerary with structured data sourced from the locally stored JSON datasets (hotels, restaurants, attractions, transportation). Currently each `DayEntry` only carries three activity segments (morning, afternoon, evening) with no explicit hotel assignment or inter-city transport leg. This feature adds:

1. **Hotel per night** — each day is assigned a hotel from `hotels.json` matching the day's city, surfacing name, price per night, and rating.
2. **Transportation legs** — when the city changes between consecutive days, a structured transport leg (method, cost, duration) is derived from `transportation.json` and attached to the transition day.
3. **Restaurant suggestions** — meal-time segments are explicitly linked to named restaurants from `restaurants.json`, respecting halal preferences.
4. **Attraction highlights** — activity segments reference named attractions from `attractions.json` that match the day's city and the traveler's interests.

All enrichments are sourced exclusively from the local data files already loaded by the RAG retrieval layer; no new external data sources are introduced.

---

## Glossary

- **Itinerary_Enricher**: The post-processing module that attaches hotel, transport, restaurant, and attraction data to a generated `Itinerary`.
- **DayEntry**: A single day in the itinerary containing `day_number`, `city`, `morning`, `afternoon`, `evening`, and (after enrichment) `hotel` and optionally `transport_to_next_city`.
- **DaySegment**: A time-of-day activity block with `activity`, `cost_usd`, `duration_hours`, and optional `notes`.
- **HotelAssignment**: A structured object containing `name`, `city`, `price_per_night`, and `rating` derived from a `HotelRecord`.
- **TransportLeg**: A structured object containing `origin_city`, `destination_city`, `method`, `cost_usd`, and `duration_hours` derived from a `TransportationRecord`.
- **FilteredRAGSubset**: The city- and interest-scoped subset of all four data files produced by the RAG retrieval step and passed into the LLM pipeline.
- **Budget_Calculator**: The `computeBudgetBreakdown` function in `budget.ts` that sums costs per day across all budget categories.
- **Itinerary_Display**: The `ItineraryDisplay` React component that renders the day-by-day itinerary to the user.
- **Pipeline_Orchestrator**: The `runPipeline` function in `pipeline/index.ts` that coordinates all pipeline steps.

---

## Requirements

### Requirement 1: Hotel Assignment per Day

**User Story:** As a traveler, I want to see which hotel I will stay at each night, so that I can understand my accommodation plan and costs at a glance.

#### Acceptance Criteria

1. THE `DayEntry` type SHALL include a `hotel` field of type `HotelAssignment` containing `name`, `city`, `price_per_night`, and `rating`.
2. WHEN the Itinerary_Enricher processes a `DayEntry`, THE Itinerary_Enricher SHALL assign a `HotelAssignment` whose `city` matches the `DayEntry`'s `city`.
3. WHEN multiple hotels exist for a city in the `FilteredRAGSubset`, THE Itinerary_Enricher SHALL select the hotel with the highest `rating`.
4. IF no hotel exists in the `FilteredRAGSubset` for a day's city, THEN THE Itinerary_Enricher SHALL leave the `hotel` field undefined and record a warning in the pipeline trace.
5. WHERE the traveler profile specifies `travelers > 1`, THE Itinerary_Enricher SHALL prefer `family_friendly: true` hotels over non-family-friendly hotels of equal or lower rating.
6. THE Budget_Calculator SHALL include `hotel.price_per_night` in the `accommodation` category for each day that has a `HotelAssignment`.

---

### Requirement 2: Inter-City Transportation Legs

**User Story:** As a traveler, I want to see how I travel between cities on transition days, so that I can plan my journey and understand transport costs.

#### Acceptance Criteria

1. THE `DayEntry` type SHALL include an optional `transport_to_next_city` field of type `TransportLeg` containing `origin_city`, `destination_city`, `method`, `cost_usd`, and `duration_hours`.
2. WHEN the city of a `DayEntry` differs from the city of the following `DayEntry`, THE Itinerary_Enricher SHALL populate `transport_to_next_city` on the earlier day using a matching `TransportationRecord` from the `FilteredRAGSubset`.
3. WHEN multiple `TransportationRecord` entries exist for the same origin–destination pair, THE Itinerary_Enricher SHALL select the record with the lowest `cost_usd`.
4. IF no `TransportationRecord` exists in the `FilteredRAGSubset` for a required city transition, THEN THE Itinerary_Enricher SHALL leave `transport_to_next_city` undefined and record a warning in the pipeline trace.
5. THE Budget_Calculator SHALL include `transport_to_next_city.cost_usd` in the `transportation` category for the day on which the leg departs.
6. THE `Itinerary_Display` SHALL render the `TransportLeg` between the day card of the departure day and the day card of the arrival day, showing method, cost, and duration.

---

### Requirement 3: Explicit Restaurant Suggestions in Meal Segments

**User Story:** As a traveler, I want meal-time segments to reference named restaurants from the local dataset, so that I have concrete dining recommendations that match my dietary preferences.

#### Acceptance Criteria

1. WHEN the LLM generates a morning, afternoon, or evening segment whose activity describes a meal, THE Itinerary_Enricher SHALL annotate the segment's `notes` field with the name of a matching `RestaurantRecord` from the `FilteredRAGSubset` for the day's city.
2. WHILE the traveler profile includes the interest `"halal food"`, THE Itinerary_Enricher SHALL only suggest restaurants where `halal: true`.
3. WHEN multiple restaurants are available for a city, THE Itinerary_Enricher SHALL vary suggestions across the days of the itinerary rather than repeating the same restaurant.
4. IF no restaurant exists in the `FilteredRAGSubset` for a day's city, THEN THE Itinerary_Enricher SHALL leave the segment's `notes` unchanged.
5. THE `Itinerary_Display` SHALL render the restaurant name annotation visually distinct from other segment notes (e.g., with a 🍽️ prefix).

---

### Requirement 4: Attraction Highlights in Activity Segments

**User Story:** As a traveler, I want activity segments to reference named attractions from the local dataset, so that I know exactly which sites I am visiting and their costs.

#### Acceptance Criteria

1. WHEN the LLM generates a morning or afternoon segment whose activity describes sightseeing or a cultural visit, THE Itinerary_Enricher SHALL annotate the segment's `notes` field with the name and category of a matching `AttractionRecord` from the `FilteredRAGSubset` for the day's city.
2. WHEN the traveler profile specifies interests, THE Itinerary_Enricher SHALL prefer `AttractionRecord` entries whose `category` matches one of the traveler's interests.
3. WHEN multiple attractions are available for a city, THE Itinerary_Enricher SHALL vary suggestions across segments and days rather than repeating the same attraction.
4. IF no attraction exists in the `FilteredRAGSubset` for a day's city that matches the traveler's interests, THEN THE Itinerary_Enricher SHALL fall back to any available attraction for that city.
5. IF no attraction exists in the `FilteredRAGSubset` for a day's city at all, THEN THE Itinerary_Enricher SHALL leave the segment's `notes` unchanged.

---

### Requirement 5: Budget Breakdown Accuracy with Enrichments

**User Story:** As a traveler, I want the budget breakdown to accurately reflect hotel and transport costs added by enrichment, so that the total matches what I will actually spend.

#### Acceptance Criteria

1. THE Budget_Calculator SHALL compute the `accommodation` category total as the sum of `hotel.price_per_night` across all days that have a `HotelAssignment`, replacing the previous keyword-based accommodation classification for those days.
2. THE Budget_Calculator SHALL compute the `transportation` category total as the sum of `transport_to_next_city.cost_usd` across all days that have a `TransportLeg`, in addition to any transportation-classified segment costs.
3. WHEN a `DayEntry` has both a `HotelAssignment` and activity segments, THE Budget_Calculator SHALL include both in the per-day total without double-counting.
4. THE Budget_Calculator SHALL produce a `grand_total` equal to the sum of all per-day totals across accommodation, food, attractions, and transportation.
5. WHEN the enriched itinerary is returned by the Pipeline_Orchestrator, THE Pipeline_Orchestrator SHALL call the Budget_Calculator on the enriched itinerary (not the pre-enrichment itinerary).

---

### Requirement 6: Itinerary Display of Enrichments

**User Story:** As a traveler, I want the itinerary UI to clearly show my hotel, transport legs, restaurant suggestions, and attraction highlights, so that I can read my full trip plan at a glance.

#### Acceptance Criteria

1. THE `Itinerary_Display` SHALL render a hotel card within each day card showing the hotel name, rating (as stars or numeric), and price per night.
2. THE `Itinerary_Display` SHALL render a transport leg indicator between consecutive day cards when `transport_to_next_city` is present, showing the transport method icon (✈️ flight, 🚌 bus, 🚆 train), cost, and duration.
3. WHEN a segment's `notes` contains a restaurant annotation, THE `Itinerary_Display` SHALL render the annotation with a 🍽️ prefix.
4. WHEN a segment's `notes` contains an attraction annotation, THE `Itinerary_Display` SHALL render the annotation with a 🏛️ prefix.
5. IF a day has no `HotelAssignment`, THE `Itinerary_Display` SHALL render a "No hotel data" placeholder within the day card rather than omitting the hotel section entirely.

---

### Requirement 7: Enrichment Pipeline Integration

**User Story:** As a developer, I want the enrichment step to integrate cleanly into the existing pipeline, so that existing pipeline steps are not broken and the enriched itinerary flows through validation and budget calculation correctly.

#### Acceptance Criteria

1. THE Pipeline_Orchestrator SHALL invoke the Itinerary_Enricher after Step 3 (Itinerary Generation) and before Step 4 (Validation), passing the `FilteredRAGSubset` and `TripProfile` to the enricher.
2. WHEN Step 5 (Revision) produces a revised itinerary, THE Pipeline_Orchestrator SHALL invoke the Itinerary_Enricher again on the revised itinerary before computing the budget breakdown.
3. THE Itinerary_Enricher SHALL be a pure function: given the same `Itinerary`, `FilteredRAGSubset`, and `TripProfile`, it SHALL always return the same enriched `Itinerary`.
4. IF the Itinerary_Enricher encounters an error for a single day (e.g., missing hotel data), THEN THE Itinerary_Enricher SHALL continue processing remaining days rather than aborting the entire enrichment.
5. THE Itinerary_Enricher SHALL complete enrichment of a 14-day itinerary within 100ms (pure in-memory computation, no LLM calls).
