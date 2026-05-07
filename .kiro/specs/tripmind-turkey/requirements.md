# Requirements Document

## Introduction

TripMind Turkey is a personalized Turkey travel planner web application targeting families with a medium budget. Users fill out a structured form describing their trip preferences, and the app runs a multi-step AI pipeline (powered by OpenAI gpt-4o-mini) to generate a day-by-day itinerary with a budget breakdown. Local JSON data files serve as the retrieval source (RAG), keeping costs low and responses grounded in real options. The MVP delivers a single-page planning experience with a professional pipeline trace panel — no maps, no PDF export, no saved trips.

---

## Glossary

- **Planner**: The TripMind Turkey web application.
- **User**: A family traveler using the Planner to generate a Turkey trip itinerary.
- **Trip Profile**: A normalized JSON object derived from the User's form inputs, representing trip duration, budget, traveler count, city preferences, interests, and travel pace.
- **Pipeline**: The ordered sequence of AI processing steps (Profile Extraction → Query Generation → Itinerary Generation → Validation → Revision) that transforms form inputs into a final itinerary.
- **Pipeline Step**: One discrete unit of the Pipeline, each corresponding to a single LLM call.
- **RAG Data**: The local JSON files (hotels.json, restaurants.json, attractions.json, transportation.json) used as the retrieval source for itinerary generation.
- **Itinerary**: The final day-by-day travel plan produced by the Pipeline, structured as Morning / Afternoon / Evening segments per day.
- **Budget Breakdown**: A per-day and total cost summary derived from selected hotels, restaurants, attractions, and transportation in the Itinerary.
- **Pipeline Trace**: A collapsible UI panel showing each Pipeline Step's input and output for transparency.
- **Validation Step**: The Pipeline Step that checks whether the generated Itinerary satisfies budget constraints, preference coverage, and required structural sections.
- **Revision Step**: The conditional Pipeline Step that fires only when the Validation Step reports failures, and corrects the specific issues identified.
- **Travel Pace**: A User-selected descriptor (relaxed / moderate / packed) that controls the density of activities per day in the Itinerary.
- **Token Budget**: The constraint that all Pipeline calls combined MUST stay within a cost envelope consistent with approximately $5 of OpenAI API credits.

---

## Requirements

### Requirement 1: Trip Planning Form

**User Story:** As a User, I want to fill out a structured form describing my trip, so that the Planner can understand my preferences before generating an itinerary.

#### Acceptance Criteria

1. THE Planner SHALL render a form containing the following fields: trip duration (number of days), total budget (USD), number of travelers, city preferences (multi-select), interests (multi-select), and travel pace (single-select).
2. THE Planner SHALL offer the following cities in the city preferences multi-select: Istanbul, Cappadocia, Antalya, Ephesus, and at least two additional Turkish destinations.
3. THE Planner SHALL offer the following options in the interests multi-select: history, halal food, shopping, nature, and culture.
4. THE Planner SHALL offer exactly three options in the travel pace selector: relaxed, moderate, and packed.
5. WHEN the User submits the form without selecting at least one city, THE Planner SHALL display a validation error and SHALL NOT invoke the Pipeline.
6. WHEN the User submits the form with a trip duration less than 1 or greater than 30, THE Planner SHALL display a validation error and SHALL NOT invoke the Pipeline.
7. WHEN the User submits the form with a total budget less than 1, THE Planner SHALL display a validation error and SHALL NOT invoke the Pipeline.
8. WHEN the User submits the form with a number of travelers less than 1, THE Planner SHALL display a validation error and SHALL NOT invoke the Pipeline.
9. WHEN the User submits a valid form, THE Planner SHALL disable the submit button and display a loading indicator until the Pipeline completes or fails.

---

### Requirement 2: Trip Profile Extraction (Pipeline Step 1)

**User Story:** As a User, I want my form inputs normalized into a clean structured profile, so that subsequent AI steps receive consistent, well-formed data.

#### Acceptance Criteria

1. WHEN a valid form is submitted, THE Planner SHALL invoke the Profile Extraction Step as the first Pipeline Step.
2. THE Profile Extraction Step SHALL produce a Trip Profile JSON object containing: duration (integer days), budget_usd (number), travelers (integer), cities (array of strings), interests (array of strings), and pace (string).
3. THE Profile Extraction Step SHALL use a single LLM call to gpt-4o-mini with JSON mode enabled.
4. IF the Profile Extraction Step returns a malformed or unparseable JSON response, THEN THE Planner SHALL abort the Pipeline and display an error message to the User.
5. THE Profile Extraction Step prompt SHALL contain only the raw form field values and SHALL NOT include RAG Data or prior Pipeline Step outputs.

---

### Requirement 3: Query Generation (Pipeline Step 2)

**User Story:** As a User, I want the Planner to identify the most relevant local data for my trip, so that my itinerary is grounded in real, applicable options.

#### Acceptance Criteria

1. WHEN the Profile Extraction Step succeeds, THE Planner SHALL invoke the Query Generation Step as the second Pipeline Step.
2. THE Query Generation Step SHALL produce a structured list of retrieval queries targeting hotels, restaurants, attractions, and transportation relevant to the Trip Profile.
3. THE Query Generation Step SHALL use a single LLM call to gpt-4o-mini with JSON mode enabled.
4. THE Query Generation Step prompt SHALL include only the Trip Profile JSON and SHALL NOT include full RAG Data files.
5. IF the Query Generation Step returns a malformed or unparseable JSON response, THEN THE Planner SHALL abort the Pipeline and display an error message to the User.

---

### Requirement 4: RAG Data Retrieval

**User Story:** As a User, I want the Planner to pull only the most relevant hotels, restaurants, attractions, and transport options for my cities and interests, so that the itinerary is specific and cost-accurate.

#### Acceptance Criteria

1. THE Planner SHALL maintain four local JSON data files: hotels.json, restaurants.json, attractions.json, and transportation.json.
2. THE hotels.json file SHALL contain records with at minimum: name, city, price_per_night (USD), rating, and family_friendly (boolean).
3. THE restaurants.json file SHALL contain records with at minimum: name, city, cuisine, halal (boolean), and price_range (USD per person).
4. THE attractions.json file SHALL contain records with at minimum: name, city, category, duration_hours, and cost_usd.
5. THE transportation.json file SHALL contain records with at minimum: origin_city, destination_city, cost_usd, duration_hours, and method.
6. WHEN the Query Generation Step completes, THE Planner SHALL filter each RAG Data file using the generated queries and SHALL pass only the matching subset of records to the Itinerary Generation Step.
7. WHERE the User has selected the halal food interest, THE Planner SHALL include only restaurants with halal set to true in the filtered restaurant subset.
8. WHERE the User has selected the family-friendly filter (implied by family traveler context), THE Planner SHALL prioritize hotels with family_friendly set to true in the filtered hotel subset.

---

### Requirement 5: Itinerary Generation (Pipeline Step 3)

**User Story:** As a User, I want a complete day-by-day itinerary tailored to my cities, interests, budget, and pace, so that I have a ready-to-use travel plan.

#### Acceptance Criteria

1. WHEN the RAG Data retrieval completes, THE Planner SHALL invoke the Itinerary Generation Step as the third Pipeline Step.
2. THE Itinerary Generation Step SHALL produce an Itinerary JSON object containing one entry per day, each with: day_number (integer), city (string), morning (object), afternoon (object), and evening (object).
3. THE Itinerary Generation Step SHALL use a single LLM call to gpt-4o-mini with JSON mode enabled.
4. THE Itinerary Generation Step prompt SHALL include the Trip Profile and the filtered RAG Data subset, and SHALL NOT include the full unfiltered RAG Data files.
5. THE Itinerary Generation Step SHALL assign activities consistent with the User's selected Travel Pace: relaxed pace SHALL produce at most 2 activities per day, moderate pace SHALL produce 3 activities per day, and packed pace SHALL produce at least 4 activities per day.
6. THE Itinerary Generation Step SHALL select hotels, restaurants, and attractions only from the filtered RAG Data subset provided.
7. IF the Itinerary Generation Step returns a malformed or unparseable JSON response, THEN THE Planner SHALL abort the Pipeline and display an error message to the User.

---

### Requirement 6: Itinerary Validation (Pipeline Step 4)

**User Story:** As a User, I want the Planner to verify that my itinerary fits my budget and covers my preferences before showing it to me, so that I receive a plan I can actually use.

#### Acceptance Criteria

1. WHEN the Itinerary Generation Step completes, THE Planner SHALL invoke the Validation Step as the fourth Pipeline Step.
2. THE Validation Step SHALL check that the total estimated cost of the Itinerary does not exceed the User's total budget.
3. THE Validation Step SHALL check that at least one activity per selected interest category is present in the Itinerary.
4. THE Validation Step SHALL check that every day entry in the Itinerary contains morning, afternoon, and evening sections.
5. THE Validation Step SHALL produce a validation result JSON object containing: passed (boolean) and, when passed is false, a failures array listing each specific issue found.
6. THE Validation Step SHALL use a single LLM call to gpt-4o-mini with JSON mode enabled.
7. IF the Validation Step returns a malformed or unparseable JSON response, THEN THE Planner SHALL abort the Pipeline and display an error message to the User.

---

### Requirement 7: Conditional Itinerary Revision (Pipeline Step 5)

**User Story:** As a User, I want the Planner to automatically fix any issues found during validation, so that I don't receive a broken or over-budget itinerary.

#### Acceptance Criteria

1. WHEN the Validation Step produces a result with passed equal to false, THE Planner SHALL invoke the Revision Step as the fifth Pipeline Step.
2. WHEN the Validation Step produces a result with passed equal to true, THE Planner SHALL skip the Revision Step entirely.
3. THE Revision Step SHALL receive the original Itinerary JSON, the Trip Profile, the filtered RAG Data subset, and the failures array from the Validation Step.
4. THE Revision Step SHALL produce a corrected Itinerary JSON that addresses each issue listed in the failures array.
5. THE Revision Step SHALL use a single LLM call to gpt-4o-mini with JSON mode enabled.
6. IF the Revision Step returns a malformed or unparseable JSON response, THEN THE Planner SHALL abort the Pipeline and display an error message to the User.
7. THE Planner SHALL NOT invoke the Revision Step more than once per Pipeline execution.

---

### Requirement 8: Budget Breakdown

**User Story:** As a User, I want to see a clear cost summary for my trip, so that I can confirm the plan fits my budget before committing.

#### Acceptance Criteria

1. WHEN the Pipeline completes successfully, THE Planner SHALL compute and display a Budget Breakdown derived from the final Itinerary.
2. THE Budget Breakdown SHALL include a per-day cost total for each day in the Itinerary.
3. THE Budget Breakdown SHALL include a grand total cost for the entire trip.
4. THE Budget Breakdown SHALL itemize costs by category: accommodation, food, attractions, and transportation.
5. THE Budget Breakdown grand total SHALL NOT exceed the User's submitted total budget.

---

### Requirement 9: Itinerary Display

**User Story:** As a User, I want to read my itinerary in a clear, structured layout, so that I can easily follow the plan day by day.

#### Acceptance Criteria

1. WHEN the Pipeline completes successfully, THE Planner SHALL display the final Itinerary to the User.
2. THE Planner SHALL render each day as a distinct section labeled with the day number and city.
3. THE Planner SHALL render each day section with three labeled sub-sections: Morning, Afternoon, and Evening.
4. THE Planner SHALL display the name, estimated cost, and duration for each activity within a sub-section.
5. THE Planner SHALL display the Budget Breakdown adjacent to or below the Itinerary.

---

### Requirement 10: Pipeline Trace Panel

**User Story:** As a User, I want to inspect what each AI step received and produced, so that I can understand how my itinerary was built and trust the output.

#### Acceptance Criteria

1. WHEN the Pipeline completes (successfully or with an error), THE Planner SHALL display a Pipeline Trace panel on the results page.
2. THE Pipeline Trace panel SHALL contain one collapsible section per executed Pipeline Step.
3. EACH collapsible section SHALL display the step name, the prompt sent to the LLM (input), and the raw JSON response received (output).
4. THE Pipeline Trace panel SHALL be collapsed by default so that it does not obscure the Itinerary.
5. WHEN the User expands a Pipeline Trace section, THE Planner SHALL render the JSON content in a readable, formatted style.

---

### Requirement 11: Token Efficiency

**User Story:** As a developer, I want all LLM calls to stay within a strict token budget, so that the total API cost for a single itinerary generation does not exceed $0.05.

#### Acceptance Criteria

1. THE Planner SHALL use gpt-4o-mini exclusively for all Pipeline LLM calls.
2. THE Planner SHALL use JSON mode (structured output) for every LLM call to eliminate prose padding in responses.
3. THE Planner SHALL pass only the filtered RAG Data subset (not full data files) to any LLM call.
4. THE Planner SHALL limit each individual LLM prompt to a maximum of 2,000 tokens.
5. THE Planner SHALL limit each individual LLM response to a maximum of 1,500 tokens by setting the max_tokens parameter.
6. THE Pipeline SHALL complete all steps using at most 5 LLM calls total per itinerary generation.

---

### Requirement 12: Error Handling and User Feedback

**User Story:** As a User, I want to be informed clearly when something goes wrong, so that I can retry or adjust my inputs without confusion.

#### Acceptance Criteria

1. IF any Pipeline Step fails due to an API error, THEN THE Planner SHALL display a human-readable error message identifying which step failed.
2. IF any Pipeline Step returns an unparseable response, THEN THE Planner SHALL display a human-readable error message and SHALL NOT display a partial or corrupted Itinerary.
3. WHEN an error occurs during the Pipeline, THE Planner SHALL re-enable the form submit button so the User can retry.
4. IF the OpenAI API returns a rate-limit or quota-exceeded error, THEN THE Planner SHALL display a message informing the User that the service is temporarily unavailable.
5. THE Planner SHALL log each Pipeline Step's input, output, and any errors to the browser console for developer debugging.
