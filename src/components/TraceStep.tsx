'use client';

import { useState } from 'react';
import type { PipelineStepTrace } from '@/types/pipeline';

interface TraceStepProps {
  trace: PipelineStepTrace;
  index: number;
}

const STEP_ICONS: Record<string, string> = {
  'Profile Extraction': '👤',
  'Query Generation': '🔍',
  'RAG Retrieval': '📚',
  'Itinerary Generation': '🗺️',
  'Validation': '🔎',
  'Revision': '✏️',
};

function getStepIcon(name: string): string {
  for (const [key, icon] of Object.entries(STEP_ICONS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return '⚙️';
}

function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

type TabType = 'prompt' | 'response';

export default function TraceStep({ trace, index }: TraceStepProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('prompt');

  let parsedResponse: unknown = null;
  let parseError = false;
  try {
    parsedResponse = JSON.parse(trace.rawResponse);
  } catch {
    parseError = true;
  }

  const responseText = parseError
    ? trace.rawResponse
    : JSON.stringify(parsedResponse, null, 2);

  return (
    <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-card transition-shadow hover:shadow-warm">
      {/* Header row */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600 transition-colors"
        aria-expanded={open}
        aria-controls={`trace-step-${index}`}
      >
        {/* Step number + icon */}
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-base" aria-hidden="true">
          {getStepIcon(trace.stepName)}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-charcoal">{trace.stepName}</span>
        </div>

        {/* Duration badge */}
        <span className="flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-sand text-slate border border-border">
          {formatDuration(trace.durationMs)}
        </span>

        {/* Chevron */}
        <svg
          className={`flex-shrink-0 h-4 w-4 text-slate transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
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
      </button>

      {/* Expanded content */}
      {open && (
        <div id={`trace-step-${index}`} className="border-t border-border">
          {/* Tabs */}
          <div className="flex border-b border-border bg-cream">
            {(['prompt', 'response'] as TabType[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600 ${
                  activeTab === tab
                    ? 'text-teal-700 border-b-2 border-teal-600 bg-white'
                    : 'text-slate hover:text-charcoal'
                }`}
              >
                {tab === 'prompt' ? 'Prompt' : 'Raw Response'}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-4">
            <pre className="whitespace-pre-wrap break-words rounded-xl bg-charcoal text-green-300 p-4 text-xs font-mono overflow-auto max-h-72 scrollbar-thin leading-relaxed">
              {activeTab === 'prompt' ? trace.prompt : responseText}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
