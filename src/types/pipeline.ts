// Shared TypeScript types for TripMind Turkey pipeline

export type Interest = 'history' | 'halal food' | 'shopping' | 'nature' | 'culture';
export type TravelPace = 'relaxed' | 'moderate' | 'packed';

export const AVAILABLE_CITIES = [
  'Istanbul',
  'Cappadocia',
  'Antalya',
  'Ephesus',
  'Pamukkale',
  'Bodrum',
] as const;

// ─── Form Input ───────────────────────────────────────────────────────────────

export interface FormData {
  duration: number;
  budget_usd: number;
  travelers: number;
  cities: string[];
  interests: Interest[];
  pace: TravelPace;
}

// ─── Pipeline Step 1 Output ───────────────────────────────────────────────────

export interface TripProfile {
  duration: number;
  budget_usd: number;
  travelers: number;
  cities: string[];
  interests: string[];
  pace: TravelPace;
}

// ─── Pipeline Step 2 Output ───────────────────────────────────────────────────

export interface RetrievalQueries {
  hotel_queries: string[];
  restaurant_queries: string[];
  attraction_queries: string[];
  transportation_queries: string[];
}

// ─── RAG Data Records ─────────────────────────────────────────────────────────

export interface HotelRecord {
  name: string;
  city: string;
  price_per_night: number;
  rating: number;
  family_friendly: boolean;
}

export interface RestaurantRecord {
  name: string;
  city: string;
  cuisine: string;
  halal: boolean;
  price_range: number;
}

export interface AttractionRecord {
  name: string;
  city: string;
  category: string;
  duration_hours: number;
  cost_usd: number;
}

export interface TransportationRecord {
  origin_city: string;
  destination_city: string;
  cost_usd: number;
  duration_hours: number;
  method: string;
}

export interface FilteredRAGSubset {
  hotels: HotelRecord[];
  restaurants: RestaurantRecord[];
  attractions: AttractionRecord[];
  transportation: TransportationRecord[];
}

// ─── Itinerary (Step 3 / Step 5 Output) ──────────────────────────────────────

export interface DaySegment {
  activity: string;
  cost_usd: number;
  duration_hours: number;
  notes?: string;
}

/** Structured hotel assignment attached to a DayEntry after enrichment. */
export interface HotelAssignment {
  name: string;
  city: string;
  price_per_night: number;
  rating: number;
}

/** Structured transport leg attached to a DayEntry when the next day is in a different city. */
export interface TransportLeg {
  origin_city: string;
  destination_city: string;
  method: string;       // "flight" | "bus" | "train"
  cost_usd: number;
  duration_hours: number;
}

export interface DayEntry {
  day_number: number;
  city: string;
  morning: DaySegment;
  afternoon: DaySegment;
  evening: DaySegment;
  hotel?: HotelAssignment;                  // added by enrichItinerary
  transport_to_next_city?: TransportLeg;    // added by enrichItinerary
}

export interface Itinerary {
  days: DayEntry[];
}

// ─── Validation (Step 4 Output) ───────────────────────────────────────────────

export interface ValidationFailure {
  type: 'budget_exceeded' | 'missing_interest' | 'missing_section';
  description: string;
}

export interface ValidationResult {
  passed: boolean;
  failures: ValidationFailure[];
}

// ─── Budget Breakdown ─────────────────────────────────────────────────────────

export interface DayBudget {
  day_number: number;
  accommodation: number;
  food: number;
  attractions: number;
  transportation: number;
  total: number;
}

export interface BudgetBreakdown {
  per_day: DayBudget[];
  grand_total: number;
  by_category: {
    accommodation: number;
    food: number;
    attractions: number;
    transportation: number;
  };
}

// ─── Pipeline Trace ───────────────────────────────────────────────────────────

export interface PipelineStepTrace {
  stepName: string;
  prompt: string;
  rawResponse: string;
  durationMs: number;
}

export interface PipelineStepResult<T> {
  output: T;
  trace: PipelineStepTrace;
}

// ─── Pipeline Result ──────────────────────────────────────────────────────────

export interface PipelineResult {
  success: boolean;
  itinerary?: Itinerary;
  budgetBreakdown?: BudgetBreakdown;
  trace: PipelineStepTrace[];
  error?: string;
  failedStep?: string;
}

// ─── API Request / Response ───────────────────────────────────────────────────

export interface PlanRequest {
  duration: number;
  budget_usd: number;
  travelers: number;
  cities: string[];
  interests: string[];
  pace: 'relaxed' | 'moderate' | 'packed';
}

export interface PlanResponse {
  success: true;
  itinerary: Itinerary;
  budgetBreakdown: BudgetBreakdown;
  trace: PipelineStepTrace[];
}

export interface PlanErrorResponse {
  success: false;
  error: string;
  failedStep?: string;
  trace: PipelineStepTrace[];
}

// ─── LLM Client ───────────────────────────────────────────────────────────────

export interface LLMCallOptions {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  schema: Record<string, unknown>;
}
