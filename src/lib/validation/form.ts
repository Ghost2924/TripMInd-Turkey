import type { FormData } from '@/types/pipeline';

/**
 * Validates the trip planning form data.
 *
 * Returns an array of human-readable error messages. An empty array means
 * the form is valid and the pipeline can be invoked.
 *
 * Rules (Requirements 1.5 – 1.8):
 *  - At least one city must be selected
 *  - Duration must be between 1 and 30 (inclusive)
 *  - budget_usd must be >= 1
 *  - travelers must be >= 1
 */
export function validateForm(data: FormData): string[] {
  const errors: string[] = [];

  // Requirement 1.5 — at least one city selected
  if (!data.cities || data.cities.length === 0) {
    errors.push('Please select at least one city.');
  }

  // Requirement 1.6 — duration between 1 and 30
  if (!Number.isFinite(data.duration) || data.duration < 1 || data.duration > 30) {
    errors.push('Trip duration must be between 1 and 30 days.');
  }

  // Requirement 1.7 — budget_usd >= 1
  if (!Number.isFinite(data.budget_usd) || data.budget_usd < 1) {
    errors.push('Total budget must be at least $1.');
  }

  // Requirement 1.8 — travelers >= 1
  if (!Number.isInteger(data.travelers) || data.travelers < 1) {
    errors.push('Number of travelers must be at least 1.');
  }

  return errors;
}
