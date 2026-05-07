'use client';

import { useState } from 'react';
import type { FormData, Interest, TravelPace, PlanResponse, PlanErrorResponse } from '@/types/pipeline';
import { AVAILABLE_CITIES } from '@/types/pipeline';
import { validateForm } from '@/lib/validation/form';
import LoadingIndicator from './LoadingIndicator';

const INTERESTS: Interest[] = ['history', 'halal food', 'shopping', 'nature', 'culture'];

const INTEREST_ICONS: Record<Interest, string> = {
  history: '🏛️',
  'halal food': '🥙',
  shopping: '🛍️',
  nature: '🌿',
  culture: '🎨',
};

const CITY_ICONS: Record<string, string> = {
  Istanbul: '🕌',
  Cappadocia: '🎈',
  Antalya: '🏖️',
  Ephesus: '🏛️',
  Pamukkale: '💧',
  Bodrum: '⛵',
};

const PACE_OPTIONS: { value: TravelPace; label: string; description: string; icon: string }[] = [
  { value: 'relaxed', label: 'Relaxed', description: 'Easy days, slower mornings', icon: '🌅' },
  { value: 'moderate', label: 'Moderate', description: 'Balanced sightseeing', icon: '⚖️' },
  { value: 'packed', label: 'Packed', description: 'See as much as possible', icon: '⚡' },
];

const VALIDATION_MESSAGES: Record<string, string> = {
  duration: 'Please enter a duration between 1 and 30 days.',
  budget_usd: 'Please enter a budget greater than 0.',
  travelers: 'Please enter at least 1 traveler.',
  cities: 'Choose at least one city.',
  interests: 'Choose at least one interest.',
};

interface PlannerFormProps {
  onSuccess: (result: PlanResponse) => void;
  onError: (error: PlanErrorResponse) => void;
  isLoading: boolean;
  onLoadingChange: (loading: boolean) => void;
  onFormSubmit?: (request: FormData) => void;
}

const DEFAULT_FORM: FormData = {
  duration: 7,
  budget_usd: 2000,
  travelers: 2,
  cities: [],
  interests: [],
  pace: 'moderate',
};

function NumberInput({
  id,
  label,
  helper,
  value,
  min,
  max,
  prefix,
  suffix,
  onChange,
  error,
}: {
  id: string;
  label: string;
  helper?: string;
  value: number;
  min?: number;
  max?: number;
  prefix?: string;
  suffix?: string;
  onChange: (v: number) => void;
  error?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-charcoal">
        {label}
      </label>
      {helper && <p className="text-xs text-slate">{helper}</p>}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-sm font-medium text-slate pointer-events-none select-none">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-describedby={helper ? `${id}-helper` : undefined}
          aria-invalid={error ? 'true' : undefined}
          className={`w-full rounded-xl border bg-white px-4 py-3 text-sm font-medium text-charcoal shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 ${
            prefix ? 'pl-8' : ''
          } ${suffix ? 'pr-14' : ''} ${
            error ? 'border-terracotta-600 ring-1 ring-terracotta-600' : 'border-border hover:border-teal-200'
          }`}
        />
        {suffix && (
          <span className="absolute right-3 text-sm font-medium text-slate pointer-events-none select-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export default function PlannerForm({ onSuccess, onError, isLoading, onLoadingChange, onFormSubmit }: PlannerFormProps) {
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);

  function toggleCity(city: string) {
    setForm((prev) => ({
      ...prev,
      cities: prev.cities.includes(city)
        ? prev.cities.filter((c) => c !== city)
        : [...prev.cities, city],
    }));
  }

  function toggleInterest(interest: Interest) {
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateForm(form);
    if (errors.length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors([]);
    onLoadingChange(true);
    onFormSubmit?.(form);
    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess(data as PlanResponse);
      } else {
        onError(data as PlanErrorResponse);
      }
    } catch {
      onError({
        success: false,
        error: 'Network error — please check your connection and try again.',
        trace: [],
      });
    } finally {
      onLoadingChange(false);
    }
  }

  if (isLoading) {
    return <LoadingIndicator />;
  }

  const hasError = (field: string) =>
    fieldErrors.some((e) => e === VALIDATION_MESSAGES[field]);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      {/* Form header */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-charcoal">
          Tell us about your Turkey trip
        </h2>
        <p className="text-slate text-sm">
          We&apos;ll use your preferences to build a personalized itinerary and budget.
        </p>
      </div>

      {/* Validation errors */}
      {fieldErrors.length > 0 && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-2xl border border-terracotta-100 bg-terracotta-50 p-4 space-y-1.5"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-terracotta-700 mb-2">
            Please fix the following:
          </p>
          {fieldErrors.map((err) => (
            <p key={err} className="text-sm text-terracotta-700 flex items-start gap-2">
              <span aria-hidden="true" className="mt-0.5">•</span>
              {err}
            </p>
          ))}
        </div>
      )}

      {/* Numeric fields */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <NumberInput
          id="duration"
          label="Trip duration"
          helper="How many days will you be traveling?"
          value={form.duration}
          min={1}
          max={30}
          suffix="days"
          onChange={(v) => setForm((prev) => ({ ...prev, duration: v }))}
          error={hasError('duration')}
        />
        <NumberInput
          id="budget"
          label="Total budget"
          helper="Your full trip budget in USD."
          value={form.budget_usd}
          min={1}
          prefix="$"
          suffix="USD"
          onChange={(v) => setForm((prev) => ({ ...prev, budget_usd: v }))}
          error={hasError('budget_usd')}
        />
        <NumberInput
          id="travelers"
          label="Travelers"
          helper="Adults and children included."
          value={form.travelers}
          min={1}
          suffix="people"
          onChange={(v) => setForm((prev) => ({ ...prev, travelers: v }))}
          error={hasError('travelers')}
        />
      </div>

      {/* Cities */}
      <fieldset className="space-y-3">
        <div>
          <legend className="text-sm font-semibold text-charcoal">
            Choose your Turkey stops
          </legend>
          <p className="text-xs text-slate mt-0.5">Select one or more destinations.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="City selection">
          {AVAILABLE_CITIES.map((city) => {
            const selected = form.cities.includes(city);
            return (
              <button
                key={city}
                type="button"
                onClick={() => toggleCity(city)}
                aria-pressed={selected}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 ${
                  selected
                    ? 'bg-teal-gradient text-white border-teal-700 shadow-warm'
                    : 'bg-white text-charcoal border-border hover:border-teal-200 hover:bg-teal-50'
                }`}
              >
                <span aria-hidden="true">{CITY_ICONS[city] ?? '📍'}</span>
                {city}
                {selected && (
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
        {hasError('cities') && (
          <p className="text-xs text-terracotta-700 font-medium" role="alert">
            {VALIDATION_MESSAGES.cities}
          </p>
        )}
      </fieldset>

      {/* Interests */}
      <fieldset className="space-y-3">
        <div>
          <legend className="text-sm font-semibold text-charcoal">
            What should the trip focus on?
          </legend>
          <p className="text-xs text-slate mt-0.5">Select your interests.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Interest selection">
          {INTERESTS.map((interest) => {
            const selected = form.interests.includes(interest);
            return (
              <button
                key={interest}
                type="button"
                onClick={() => toggleInterest(interest)}
                aria-pressed={selected}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium capitalize transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 ${
                  selected
                    ? 'bg-terracotta-600 text-white border-terracotta-700 shadow-warm'
                    : 'bg-white text-charcoal border-border hover:border-terracotta-200 hover:bg-terracotta-50'
                }`}
              >
                <span aria-hidden="true">{INTEREST_ICONS[interest]}</span>
                {interest}
                {selected && (
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
        {hasError('interests') && (
          <p className="text-xs text-terracotta-700 font-medium" role="alert">
            {VALIDATION_MESSAGES.interests}
          </p>
        )}
      </fieldset>

      {/* Pace */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-charcoal">Travel pace</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" role="group" aria-label="Travel pace selection">
          {PACE_OPTIONS.map(({ value, label, description, icon }) => {
            const selected = form.pace === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, pace: value }))}
                aria-pressed={selected}
                className={`relative flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 ${
                  selected
                    ? 'border-teal-600 bg-teal-50 shadow-warm'
                    : 'border-border bg-white hover:border-teal-200 hover:bg-cream'
                }`}
              >
                {/* Check mark */}
                {selected && (
                  <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center" aria-hidden="true">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
                <span className="text-2xl" aria-hidden="true">{icon}</span>
                <span className={`text-sm font-bold ${selected ? 'text-teal-700' : 'text-charcoal'}`}>
                  {label}
                </span>
                <span className="text-xs text-slate">{description}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-2xl bg-teal-gradient text-white font-bold py-4 px-6 text-base shadow-warm hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
      >
        Generate my Turkey itinerary ✈️
      </button>
    </form>
  );
}
