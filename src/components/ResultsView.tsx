'use client';

import type { PlanResponse, PlanRequest } from '@/types/pipeline';
import ItineraryDisplay from './ItineraryDisplay';
import BudgetBreakdown from './BudgetBreakdown';
import PipelineTracePanel from './PipelineTracePanel';
import StatCard from './ui/StatCard';

interface ResultsViewProps {
  result: PlanResponse;
  originalRequest?: PlanRequest | null;
}

const PACE_LABELS: Record<string, string> = {
  relaxed: 'Relaxed',
  moderate: 'Moderate',
  packed: 'Packed',
};

export default function ResultsView({ result, originalRequest }: ResultsViewProps) {
  const { itinerary, budgetBreakdown, trace } = result;
  const days = itinerary?.days?.length ?? 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Results header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-100 text-teal-700 text-xs font-semibold mb-2">
          <span aria-hidden="true">✨</span>
          Itinerary ready
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-charcoal">
          Your personalized Turkey itinerary
        </h1>
        <p className="text-slate text-sm max-w-xl mx-auto">
          Built from your trip preferences and validated through the AI planning pipeline.
        </p>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          label="Duration"
          value={`${days} day${days !== 1 ? 's' : ''}`}
        />
        <StatCard
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          label="Travelers"
          value={`${originalRequest?.travelers ?? '—'}`}
        />
        <StatCard
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          label="Budget used"
          value={budgetBreakdown?.grand_total != null ? `$${Math.round(budgetBreakdown.grand_total).toLocaleString()}` : '—'}
          sub={originalRequest?.budget_usd != null ? `of $${originalRequest.budget_usd.toLocaleString()}` : undefined}
        />
        <StatCard
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
          label="Pace"
          value={PACE_LABELS[originalRequest?.pace ?? ''] ?? '—'}
        />
      </div>

      {/* Main layout: itinerary + budget side by side on desktop */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Itinerary — 2/3 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-charcoal">Day-by-day itinerary</h2>
            <p className="text-sm text-slate">Morning, afternoon, and evening activities for each day.</p>
          </div>
          <ItineraryDisplay itinerary={itinerary} pace={originalRequest?.pace} />
        </div>

        {/* Budget — 1/3, sticky on desktop */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-charcoal">Budget snapshot</h2>
              <p className="text-sm text-slate">How your budget is distributed.</p>
            </div>
            <BudgetBreakdown
              breakdown={budgetBreakdown}
              originalBudget={originalRequest?.budget_usd}
            />
          </div>
        </div>
      </div>

      {/* Pipeline trace — full width */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-charcoal">AI Pipeline Trace</h2>
          <p className="text-sm text-slate">
            Review the prompts, raw JSON responses, and timing for each planning step.
          </p>
        </div>
        <PipelineTracePanel traces={trace ?? []} />
      </div>
    </div>
  );
}
