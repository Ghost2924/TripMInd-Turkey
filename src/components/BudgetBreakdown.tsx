'use client';

import type { BudgetBreakdown as BudgetBreakdownType } from '@/types/pipeline';
import { formatUSD } from './ui/CurrencyText';
import EmptyState from './ui/EmptyState';

interface BudgetBreakdownProps {
  breakdown: BudgetBreakdownType;
  originalBudget?: number;
}

const CATEGORY_CONFIG: {
  key: keyof BudgetBreakdownType['by_category'];
  label: string;
  icon: string;
  color: string;
  bar: string;
}[] = [
  { key: 'accommodation', label: 'Accommodation', icon: '🏨', color: 'text-blue-700', bar: 'bg-blue-400' },
  { key: 'food', label: 'Food & Dining', icon: '🍽️', color: 'text-emerald-700', bar: 'bg-emerald-400' },
  { key: 'attractions', label: 'Attractions', icon: '🎭', color: 'text-purple-700', bar: 'bg-purple-400' },
  { key: 'transportation', label: 'Transportation', icon: '🚌', color: 'text-amber-700', bar: 'bg-amber-400' },
];

export default function BudgetBreakdown({ breakdown, originalBudget }: BudgetBreakdownProps) {
  if (!breakdown) {
    return (
      <EmptyState
        icon="💰"
        title="No budget data"
        description="Budget breakdown was not returned by the AI."
      />
    );
  }

  const grandTotal = breakdown.grand_total ?? 0;
  const isOverBudget = originalBudget != null && grandTotal > originalBudget;
  const isWithinBudget = originalBudget != null && grandTotal <= originalBudget;
  const remaining = originalBudget != null ? originalBudget - grandTotal : null;

  const categoryTotal = Object.values(breakdown.by_category ?? {}).reduce(
    (sum, v) => sum + (v ?? 0),
    0
  );

  return (
    <section aria-label="Budget breakdown" className="space-y-4">
      {/* Grand total card */}
      <div
        className={`rounded-3xl border shadow-card overflow-hidden ${
          isOverBudget
            ? 'border-terracotta-100 bg-terracotta-50'
            : isWithinBudget
            ? 'border-emerald-100 bg-emerald-50'
            : 'border-border bg-white'
        }`}
      >
        <div className="px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate">Grand Total</p>
            <p className="text-3xl font-bold text-charcoal mt-0.5">{formatUSD(grandTotal)}</p>
            {originalBudget != null && (
              <p className="text-sm text-slate mt-1">
                Budget: <span className="font-semibold text-charcoal">{formatUSD(originalBudget)}</span>
              </p>
            )}
          </div>

          {/* Status badge */}
          {isOverBudget && (
            <div className="flex-shrink-0 text-right">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-terracotta-600 text-white">
                <span aria-hidden="true">⚠️</span>
                Over budget
              </span>
              {remaining != null && (
                <p className="text-xs text-terracotta-700 mt-1 font-medium">
                  {formatUSD(Math.abs(remaining))} over
                </p>
              )}
            </div>
          )}
          {isWithinBudget && (
            <div className="flex-shrink-0 text-right">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-emerald-600 text-white">
                <span aria-hidden="true">✅</span>
                Within budget
              </span>
              {remaining != null && (
                <p className="text-xs text-emerald-700 mt-1 font-medium">
                  {formatUSD(remaining)} remaining
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Category breakdown */}
      <div className="rounded-3xl bg-white border border-border shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-bold text-charcoal">By Category</h3>
        </div>
        <div className="px-6 py-4 space-y-4">
          {CATEGORY_CONFIG.map(({ key, label, icon, color, bar }) => {
            const amount = breakdown.by_category?.[key] ?? 0;
            const pct = categoryTotal > 0 ? Math.round((amount / categoryTotal) * 100) : 0;

            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base" aria-hidden="true">{icon}</span>
                    <span className={`text-sm font-medium ${color}`}>{label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate">{pct}%</span>
                    <span className="text-sm font-semibold text-charcoal">{formatUSD(amount)}</span>
                  </div>
                </div>
                {/* Bar */}
                <div className="h-2 rounded-full bg-sand overflow-hidden" role="presentation">
                  <div
                    className={`h-full rounded-full ${bar} transition-all duration-700`}
                    style={{ width: `${pct}%` }}
                    aria-label={`${pct}% of total`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-day breakdown */}
      {breakdown.per_day?.length > 0 && (
        <div className="rounded-3xl bg-white border border-border shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-bold text-charcoal">Per Day</h3>
          </div>
          <div className="divide-y divide-border">
            {breakdown.per_day.map((day) => (
              <div key={day.day_number} className="px-6 py-3 flex items-center justify-between hover:bg-cream transition-colors">
                <span className="text-sm font-medium text-charcoal">Day {day.day_number}</span>
                <div className="flex items-center gap-4 text-xs text-slate">
                  <span title="Accommodation">🏨 {formatUSD(day.accommodation ?? 0)}</span>
                  <span title="Food">🍽️ {formatUSD(day.food ?? 0)}</span>
                  <span title="Attractions">🎭 {formatUSD(day.attractions ?? 0)}</span>
                  <span title="Transport">🚌 {formatUSD(day.transportation ?? 0)}</span>
                  <span className="font-bold text-charcoal text-sm">{formatUSD(day.total ?? 0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
