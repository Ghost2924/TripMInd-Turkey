'use client';

import { useRef, useState } from 'react';
import type { PlanResponse, PlanErrorResponse, PlanRequest, FormData } from '@/types/pipeline';
import PlannerForm from '@/components/PlannerForm';
import ResultsView from '@/components/ResultsView';
import ErrorMessage from '@/components/ErrorMessage';
import LoadingIndicator from '@/components/LoadingIndicator';

type AppState = 'idle' | 'loading' | 'success' | 'error';

// ─── Header ───────────────────────────────────────────────────────────────────

function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-gradient flex items-center justify-center flex-shrink-0">
              <span className="text-white text-base" aria-hidden="true">✈️</span>
            </div>
            <span className="font-bold text-charcoal text-lg tracking-tight">
              TripMind <span className="text-teal-700">Turkey</span>
            </span>
          </div>

          {/* Badges */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-sand text-slate border border-border">
              <span aria-hidden="true">🔓</span> No login
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-100">
              <span aria-hidden="true">💰</span> Budget-aware
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-terracotta-50 text-terracotta-700 border border-terracotta-100">
              <span aria-hidden="true">🔍</span> Transparent AI
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero({ onStartPlanning }: { onStartPlanning: () => void }) {
  const DESTINATIONS = ['Istanbul', 'Cappadocia', 'Antalya', 'Ephesus', 'Pamukkale', 'Bodrum'];
  const DEST_ICONS: Record<string, string> = {
    Istanbul: '🕌',
    Cappadocia: '🎈',
    Antalya: '🏖️',
    Ephesus: '🏛️',
    Pamukkale: '💧',
    Bodrum: '⛵',
  };

  return (
    <section className="relative overflow-hidden bg-hero-gradient tile-pattern">
      {/* Decorative blobs */}
      <div
        className="absolute top-0 right-0 w-96 h-96 rounded-full bg-teal-50/60 blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-terracotta-50/40 blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left: copy */}
          <div className="space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-100 text-teal-700 text-xs font-semibold">
              <span aria-hidden="true">✨</span>
              Powered by a 5-step AI planning pipeline
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-charcoal text-balance leading-tight">
              Plan your perfect{' '}
              <span className="text-teal-700">family trip</span>{' '}
              to Turkey
            </h1>

            <p className="text-slate text-lg leading-relaxed max-w-lg mx-auto lg:mx-0">
              Generate a personalized day-by-day itinerary with budget guidance, halal-friendly
              dining, family activities, and a transparent AI planning trace.
            </p>

            {/* Destination chips */}
            <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
              {DESTINATIONS.map((dest) => (
                <span
                  key={dest}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-border text-sm font-medium text-charcoal shadow-card"
                >
                  <span aria-hidden="true">{DEST_ICONS[dest]}</span>
                  {dest}
                </span>
              ))}
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <button
                type="button"
                onClick={onStartPlanning}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-gradient text-white font-bold py-4 px-8 text-base shadow-warm hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 transition-all"
              >
                Start planning
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right: preview card */}
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-sm rounded-3xl bg-white border border-border shadow-warm-lg overflow-hidden">
              {/* Card header */}
              <div className="bg-teal-gradient px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-bold">Sample Itinerary Preview</span>
                  <span className="ml-auto text-teal-100 text-xs">7 days · Istanbul</span>
                </div>
              </div>

              {/* Day 1 preview */}
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-xs font-bold text-teal-700">
                    1
                  </div>
                  <span className="text-sm font-bold text-charcoal">Day 1 · Istanbul</span>
                </div>

                {[
                  { time: '🌅 Morning', activity: 'Hagia Sophia', cost: '$25', dur: '2 hrs' },
                  { time: '☀️ Afternoon', activity: 'Grand Bazaar', cost: '$15', dur: '3 hrs' },
                  { time: '🌙 Evening', activity: 'Bosphorus Walk', cost: 'Free', dur: '1.5 hrs' },
                ].map((item) => (
                  <div key={item.time} className="rounded-xl bg-cream border border-border p-3 space-y-1">
                    <p className="text-xs text-slate font-medium">{item.time}</p>
                    <p className="text-sm font-semibold text-charcoal">{item.activity}</p>
                    <div className="flex gap-2">
                      <span className="text-xs bg-white border border-border rounded-full px-2 py-0.5 text-charcoal">
                        {item.cost}
                      </span>
                      <span className="text-xs bg-white border border-border rounded-full px-2 py-0.5 text-charcoal">
                        ⏱ {item.dur}
                      </span>
                    </div>
                  </div>
                ))}

                <div className="pt-1 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-slate">AI-generated · 5-step pipeline</span>
                  <span className="text-xs font-semibold text-teal-700">$40 / day</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [result, setResult] = useState<PlanResponse | null>(null);
  const [planError, setPlanError] = useState<PlanErrorResponse | null>(null);
  const [submittedRequest, setSubmittedRequest] = useState<PlanRequest | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleSuccess(data: PlanResponse) {
    for (const trace of data.trace) {
      console.log(`[Pipeline] ${trace.stepName}`, {
        prompt: trace.prompt,
        response: trace.rawResponse,
        durationMs: trace.durationMs,
      });
    }
    setResult(data);
    setAppState('success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleError(error: PlanErrorResponse) {
    console.error(`[Pipeline Error] ${error.failedStep ?? 'unknown'}`, {
      message: error.error,
      trace: error.trace,
    });
    setPlanError(error);
    setAppState('error');
  }

  function handleLoadingChange(loading: boolean) {
    if (loading) {
      setAppState('loading');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function handleFormSubmit(request: FormData) {
    setSubmittedRequest(request as unknown as PlanRequest);
  }

  function handleRetry() {
    setPlanError(null);
    setResult(null);
    setAppState('idle');
    setTimeout(scrollToForm, 100);
  }

  const showHero = appState === 'idle';

  return (
    <div className="min-h-screen bg-ivory">
      <Header />

      {/* Hero — only on idle */}
      {showHero && <Hero onStartPlanning={scrollToForm} />}

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Form section */}
        {appState === 'idle' && (
          <div ref={formRef} className="max-w-3xl mx-auto">
            <div className="rounded-3xl bg-white border border-border shadow-warm-lg p-8 sm:p-10">
              <PlannerForm
                onSuccess={handleSuccess}
                onError={handleError}
                isLoading={false}
                onLoadingChange={handleLoadingChange}
                onFormSubmit={handleFormSubmit}
              />
            </div>
          </div>
        )}

        {/* Loading */}
        {appState === 'loading' && (
          <div className="max-w-2xl mx-auto">
            <LoadingIndicator />
          </div>
        )}

        {/* Results */}
        {appState === 'success' && result && (
          <ResultsView result={result} originalRequest={submittedRequest} />
        )}

        {/* Error */}
        {appState === 'error' && planError && (
          <div className="max-w-2xl mx-auto">
            <ErrorMessage
              message={planError.error}
              failedStep={planError.failedStep}
              trace={planError.trace}
              onRetry={handleRetry}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-white/60 mt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-charcoal">TripMind Turkey</span>
            <span className="text-slate text-sm">· AI-powered family travel planner</span>
          </div>
          <p className="text-xs text-slate">Powered by a 5-step AI pipeline · No login required</p>
        </div>
      </footer>
    </div>
  );
}
