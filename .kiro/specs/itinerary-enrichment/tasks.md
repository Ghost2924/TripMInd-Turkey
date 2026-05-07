# Tasks: Itinerary Enrichment

## Task List

- [x] 1. Add new types to pipeline.ts
  - [x] 1.1 Add `HotelAssignment` interface with `name`, `city`, `price_per_night`, `rating` fields
  - [x] 1.2 Add `TransportLeg` interface with `origin_city`, `destination_city`, `method`, `cost_usd`, `duration_hours` fields
  - [x] 1.3 Extend `DayEntry` with optional `hotel?: HotelAssignment` and `transport_to_next_city?: TransportLeg` fields

- [x] 2. Implement `src/lib/pipeline/step3b-enrichment.ts`
  - [x] 2.1 Implement `selectHotel(city, hotels, travelers)` — filter by city, apply family-friendly preference when travelers > 1, return highest-rated hotel or undefined
  - [x] 2.2 Implement `selectTransportLeg(origin, dest, transport)` — filter by origin/destination pair, return lowest-cost record or undefined
  - [x] 2.3 Implement `isMealSegment(segment)` — keyword-based detection using meal keyword list from design
  - [x] 2.4 Implement `isSightseeingSegment(segment)` — keyword-based detection using sightseeing keyword list from design
  - [x] 2.5 Implement `annotateRestaurant(segment, restaurants, city, wantsHalal, usedNames)` — append `🍽️ [RestaurantName]` to notes, respect halal filter, rotate through restaurants using usedNames set
  - [x] 2.6 Implement `annotateAttraction(segment, attractions, city, interests, usedNames)` — append `🏛️ [AttractionName] ([category])` to notes, prefer interest-matching attractions, rotate using usedNames set
  - [x] 2.7 Implement pace-aware annotation caps — derive `maxMealAnnotations` and `maxAttractionAnnotations` per-day from `profile.pace` (relaxed: 1 meal/0 attractions, moderate: 2 meals/1 attraction, packed: 3 meals/2 attractions); process segments morning→afternoon→evening, stop once cap reached
  - [x] 2.8 Implement `enrichItinerary(itinerary, ragSubset, profile)` — orchestrate per-day enrichment (hotel, transport leg, restaurant annotations, attraction annotations), catch per-day errors and continue, return new Itinerary (do not mutate input)

- [x] 3. Update `src/lib/budget.ts`
  - [x] 3.1 When `day.hotel` present, add `day.hotel.price_per_night` to accommodation total instead of keyword classification
  - [x] 3.2 When `day.transport_to_next_city` present, add `transport_to_next_city.cost_usd` to transportation total
  - [x] 3.3 Keep keyword classification running for food, attractions, and LLM-generated transport segments

- [x] 4. Update `src/lib/pipeline/index.ts`
  - [x] 4.1 Import `enrichItinerary` from `./step3b-enrichment`
  - [x] 4.2 Call `enrichItinerary(itinerary, ragSubset, profile)` after Step 3, assign result back to `itinerary`
  - [x] 4.3 Call `enrichItinerary(itinerary, ragSubset, profile)` after Step 5 revision, assign result back to `itinerary`

- [x] 5. Update `src/components/ItineraryDisplay.tsx`
  - [x] 5.1 Add `HotelCard` sub-component accepting `hotel` and `pace` props — relaxed: name+price only; moderate: name+rating+price; packed: name+rating+price+family badge; renders "No hotel data" placeholder when hotel undefined
  - [x] 5.2 Add `TransportConnector` sub-component accepting `leg` and `pace` props — relaxed: icon+duration; moderate: icon+cost+duration; packed: icon+method label+cost+duration
  - [x] 5.3 Render `HotelCard` inside each day card (below segments grid), passing `day.hotel` and `pace`
  - [x] 5.4 Render `TransportConnector` between consecutive day cards when `day.transport_to_next_city` is present, passing `pace`
