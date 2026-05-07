'use client';

const PIPELINE_STEPS = [
  {
    name: 'Profile Extraction',
    description: 'Understanding your duration, budget, travelers, cities, interests, and pace.',
    icon: '👤',
  },
  {
    name: 'Query Generation',
    description: 'Creating targeted retrieval queries for hotels, restaurants, attractions, and transportation.',
    icon: '🔍',
  },
  {
    name: 'RAG Retrieval',
    description: 'Searching local Turkey travel data for grounded recommendations.',
    icon: '📚',
  },
  {
    name: 'Itinerary Generation',
    description: 'Building a day-by-day plan with morning, afternoon, and evening activities.',
    icon: '🗺️',
  },
  {
    name: 'Validation & Revision',
    description: 'Checking budget, interests, structure, and revising if needed.',
    icon: '✅',
  },
];

export default function LoadingIndicator() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Building your Turkey itinerary"
      className="animate-fade-in"
    >
      <div className="rounded-3xl bg-white border border-border shadow-warm-lg overflow-hidden">
        {/* Header */}
        <div className="bg-teal-gradient px-8 py-7">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-white/60 animate-pulse-soft" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-white/60 animate-pulse-soft" style={{ animationDelay: '200ms' }} />
              <span className="w-2 h-2 rounded-full bg-white/60 animate-pulse-soft" style={{ animationDelay: '400ms' }} />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white">Building your Turkey itinerary…</h2>
          <p className="text-teal-100 text-sm mt-1">
            Our AI planner is moving through a structured 5-step process.
          </p>
        </div>

        {/* Steps */}
        <div className="px-8 py-6 space-y-0">
          {PIPELINE_STEPS.map((step, idx) => (
            <div key={step.name} className="relative">
              {/* Connector line */}
              {idx < PIPELINE_STEPS.length - 1 && (
                <div className="absolute left-5 top-10 bottom-0 w-px bg-border" aria-hidden="true" />
              )}

              <div className="flex gap-4 pb-6">
                {/* Step indicator */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-10 h-10 rounded-full border-2 border-border bg-sand flex items-center justify-center text-base animate-pulse-soft"
                    style={{ animationDelay: `${idx * 300}ms` }}
                    aria-hidden="true"
                  >
                    {step.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 pt-1.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-charcoal">{step.name}</span>
                    {/* Shimmer bar */}
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-teal-100 via-teal-200 to-teal-100 bg-[length:200%_100%] animate-shimmer"
                      style={{
                        width: `${60 + idx * 8}px`,
                        animationDelay: `${idx * 200}ms`,
                      }}
                      aria-hidden="true"
                    />
                  </div>
                  <p className="text-xs text-slate leading-relaxed">{step.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="border-t border-border px-8 py-4 bg-cream">
          <p className="text-xs text-slate text-center">
            This may take 15–30 seconds. Each step uses a separate AI call.
          </p>
        </div>
      </div>
    </div>
  );
}
