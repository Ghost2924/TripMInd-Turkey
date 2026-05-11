#!/usr/bin/env node
/**
 * TripMind Turkey — Eval Script
 *
 * Runs all test cases in test_cases.json against the live /api/plan endpoint.
 * Measures four metrics per successful response:
 *   1. correct_day_count   — itinerary.days.length === expected.day_count
 *   2. budget_not_exceeded — budgetBreakdown.grand_total <= input.budget_usd
 *   3. all_segments_present — every day has non-empty morning/afternoon/evening
 *   4. interests_covered   — at least one activity matches each requested interest
 *
 * For validation test cases (expected.http_status), checks HTTP status code only.
 *
 * Usage:
 *   node eval/eval.mjs [--base-url http://localhost:3000]
 *
 * Outputs a summary table and exits with code 1 if any test fails.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const baseUrlIdx = args.indexOf('--base-url');
const BASE_URL = baseUrlIdx !== -1 ? args[baseUrlIdx + 1] : 'http://localhost:3000';
const API_URL = `${BASE_URL}/api/plan`;

// ─── Interest keyword map (mirrors src/lib/validation/itinerary.ts) ───────────

const INTEREST_KEYWORDS = {
  history: ['history', 'museum', 'ruins', 'castle', 'palace', 'ancient', 'archaeological'],
  'halal food': ['halal', 'restaurant', 'dinner', 'lunch', 'breakfast', 'cafe', 'café', 'kebab', 'meze'],
  shopping: ['shopping', 'bazaar', 'market', 'grand bazaar', 'spice'],
  nature: ['nature', 'park', 'valley', 'lake', 'beach', 'mountain', 'hot spring', 'pamukkale', 'cappadocia'],
  culture: ['culture', 'mosque', 'church', 'whirling', 'hammam', 'festival', 'dervish'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function checkInterestCoverage(itinerary, interests) {
  for (const interest of interests) {
    const keywords = INTEREST_KEYWORDS[interest.toLowerCase()] ?? [interest.toLowerCase()];
    const covered = itinerary.days.some((day) =>
      [day.morning, day.afternoon, day.evening].some((seg) => {
        const haystack = `${seg.activity} ${seg.notes ?? ''}`.toLowerCase();
        return keywords.some((kw) => haystack.includes(kw));
      })
    );
    if (!covered) return { covered: false, missing: interest };
  }
  return { covered: true };
}

function checkAllSegments(itinerary) {
  return itinerary.days.every(
    (day) =>
      typeof day.morning?.activity === 'string' && day.morning.activity.trim() !== '' &&
      typeof day.afternoon?.activity === 'string' && day.afternoon.activity.trim() !== '' &&
      typeof day.evening?.activity === 'string' && day.evening.activity.trim() !== ''
  );
}

function pad(str, len) {
  return String(str).padEnd(len);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const testCases = JSON.parse(
    readFileSync(join(__dirname, 'test_cases.json'), 'utf8')
  );

  console.log(`\nTripMind Turkey Eval — ${testCases.length} test cases`);
  console.log(`Target: ${API_URL}\n`);
  console.log(
    pad('ID', 6) +
    pad('Description', 52) +
    pad('Result', 8) +
    'Details'
  );
  console.log('─'.repeat(110));

  const results = [];

  for (const tc of testCases) {
    let passed = false;
    let details = '';

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tc.input),
      });

      // Validation-only test cases
      if (tc.expected.http_status !== undefined) {
        passed = res.status === tc.expected.http_status;
        details = `HTTP ${res.status} (expected ${tc.expected.http_status})`;
        results.push({ id: tc.id, passed, details });
        console.log(pad(tc.id, 6) + pad(tc.description.slice(0, 50), 52) + pad(passed ? 'PASS' : 'FAIL', 8) + details);
        continue;
      }

      const body = await res.json();

      if (!body.success) {
        passed = false;
        details = `API error: ${body.error}`;
        results.push({ id: tc.id, passed, details });
        console.log(pad(tc.id, 6) + pad(tc.description.slice(0, 50), 52) + pad('FAIL', 8) + details);
        continue;
      }

      const { itinerary, budgetBreakdown } = body;
      const failures = [];

      // Metric 1: correct day count
      if (itinerary.days.length !== tc.expected.day_count) {
        failures.push(`day_count=${itinerary.days.length} (expected ${tc.expected.day_count})`);
      }

      // Metric 2: budget not exceeded
      if (budgetBreakdown.grand_total > tc.input.budget_usd) {
        failures.push(`budget exceeded: $${budgetBreakdown.grand_total.toFixed(0)} > $${tc.input.budget_usd}`);
      }

      // Metric 3: all segments present
      if (!checkAllSegments(itinerary)) {
        failures.push('missing segments in one or more days');
      }

      // Metric 4: interest coverage
      const coverageResult = checkInterestCoverage(itinerary, tc.expected.interests_covered);
      if (!coverageResult.covered) {
        failures.push(`interest not covered: "${coverageResult.missing}"`);
      }

      passed = failures.length === 0;
      details = passed ? `grand_total=$${budgetBreakdown.grand_total.toFixed(0)}, days=${itinerary.days.length}` : failures.join('; ');

    } catch (err) {
      passed = false;
      details = `fetch error: ${err.message}`;
    }

    results.push({ id: tc.id, passed, details });
    console.log(
      pad(tc.id, 6) +
      pad(tc.description.slice(0, 50), 52) +
      pad(passed ? 'PASS' : 'FAIL', 8) +
      details
    );
  }

  // ─── Summary ───────────────────────────────────────────────────────────────

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const score = ((passed / total) * 100).toFixed(1);

  console.log('\n' + '─'.repeat(110));
  console.log(`Score: ${passed}/${total} (${score}%)`);

  const failed = results.filter((r) => !r.passed);
  if (failed.length > 0) {
    console.log('\nFailed cases:');
    for (const f of failed) {
      console.log(`  ${f.id}: ${f.details}`);
    }
    process.exit(1);
  } else {
    console.log('All tests passed.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Eval script crashed:', err);
  process.exit(1);
});
