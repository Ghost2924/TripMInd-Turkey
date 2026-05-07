'use client';

import { useState } from 'react';
import type { PipelineStepTrace } from '@/types/pipeline';
import TraceStep from './TraceStep';
import EmptyState from './ui/EmptyState';

interface PipelineTracePanelProps {
  traces: PipelineStepTrace[];
}

export default function PipelineTracePanel({ traces }: PipelineTracePanelProps) {
  const [open, setOpen] = useState(false);

  const totalMs = traces.reduce((sum, t) => sum + t.durationMs, 0);

  return (
    <section aria-label="AI Pipeline Trace" className="rounded-3xl bg-white border border-border shadow-card overflow-hidden">
      {/* Panel header — always visible */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-4 px-6 py-5 text-left hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600 transition-colors"
        aria-expanded={open}
        aria-controls="trace-panel-body"
      >
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center" aria-hidden="true">
          <svg className="w-5 h-5 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
          </svg>
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-charcoal">AI Pipeline Trace</h2>
          <p className="text-xs text-slate mt-0.5">
            Review prompts, raw JSON responses, and timing for each planning step.
          </p>
        </div>

        {/* Meta badges */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-sand text-slate border border-border">
            {traces.length} step{traces.length !== 1 ? 's' : ''}
          </span>
          {totalMs > 0 && (
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-100">
              {(totalMs / 1000).toFixed(1)}s total
            </span>
          )}
          <svg
            className={`h-4 w-4 text-slate transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </button>

      {/* Transparency note */}
      {!open && (
        <div className="px-6 pb-4">
          <p className="text-xs text-slate italic">
            This app is not a black box — expand to inspect how the AI planned your trip.
          </p>
        </div>
      )}

      {/* Steps */}
      {open && (
        <div id="trace-panel-body" className="border-t border-border px-6 py-5 space-y-3">
          {traces.length === 0 ? (
            <EmptyState
              icon="🔍"
              title="No trace steps recorded"
              description="The pipeline did not return any trace data."
            />
          ) : (
            traces.map((trace, idx) => (
              <TraceStep key={`${trace.stepName}-${idx}`} trace={trace} index={idx} />
            ))
          )}
        </div>
      )}
    </section>
  );
}
