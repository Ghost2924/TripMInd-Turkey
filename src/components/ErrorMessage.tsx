'use client';

import type { PipelineStepTrace } from '@/types/pipeline';
import PipelineTracePanel from './PipelineTracePanel';

interface ErrorMessageProps {
  message: string;
  failedStep?: string;
  trace?: PipelineStepTrace[];
  onRetry: () => void;
}

export default function ErrorMessage({ message, failedStep, trace, onRetry }: ErrorMessageProps) {
  return (
    <div role="alert" className="space-y-6 animate-fade-in">
      <div className="rounded-3xl bg-white border border-terracotta-100 shadow-warm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-terracotta-600 to-terracotta-700 px-8 py-7">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl flex-shrink-0"
              aria-hidden="true"
            >
              ✈️
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">We couldn&apos;t generate your itinerary</h2>
              <p className="text-terracotta-100 text-sm mt-0.5">
                Something went wrong during the planning pipeline.
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-4">
          {/* Error message */}
          <div className="rounded-xl bg-terracotta-50 border border-terracotta-100 p-4">
            <p className="text-sm font-medium text-terracotta-700">{message}</p>
          </div>

          {/* Failed step */}
          {failedStep && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate">Failed at step:</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-terracotta-50 text-terracotta-700 border border-terracotta-100">
                {failedStep}
              </span>
            </div>
          )}

          {/* Retry */}
          <button
            type="button"
            onClick={onRetry}
            className="w-full rounded-xl bg-teal-gradient text-white font-semibold py-3 px-6 text-sm hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            Try again
          </button>
        </div>
      </div>

      {/* Trace if available */}
      {trace && trace.length > 0 && (
        <PipelineTracePanel traces={trace} />
      )}
    </div>
  );
}
