// Feature: dyslexia-comprehension-tool, Property 8: Spaced repetition interval monotonicity

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateNextReview } from '../../services/spacedRepetitionScheduler';
import type { WordBankEntry } from '../../types';

/**
 * Creates a WordBankEntry with the given overrides, suitable for
 * starting a fresh spaced-repetition sequence.
 */
function makeEntry(overrides: Partial<WordBankEntry> = {}): WordBankEntry {
  return {
    id: 'test-word',
    word: 'environment',
    definition: 'The surroundings in which a person lives.',
    passageContext: 'The ancient environment was marvellous.',
    addedDate: new Date('2024-01-01'),
    nextReviewDate: new Date('2024-01-02'),
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
    mastered: false,
    ...overrides,
  };
}

// **Validates: Requirements 5.2**
describe('Property 8: Spaced repetition interval monotonicity', () => {
  it('consecutive successful recalls with quality 4 produce non-decreasing intervals', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1.3, max: 3.0, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 3, max: 15 }),
        (initialEaseFactor, recallCount) => {
          let entry = makeEntry({
            easeFactor: initialEaseFactor,
            repetitions: 0,
            interval: 1,
          });

          const intervals: number[] = [];

          for (let i = 0; i < recallCount; i++) {
            const result = calculateNextReview(entry, 4);
            intervals.push(result.newInterval);

            // Update entry for next iteration
            entry = makeEntry({
              easeFactor: result.newEaseFactor,
              repetitions: result.newRepetitions,
              interval: result.newInterval,
            });
          }

          // Assert non-decreasing intervals
          for (let i = 1; i < intervals.length; i++) {
            expect(intervals[i]).toBeGreaterThanOrEqual(intervals[i - 1]);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('consecutive successful recalls with quality 5 (perfect) produce non-decreasing intervals', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1.3, max: 3.0, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 3, max: 15 }),
        (initialEaseFactor, recallCount) => {
          let entry = makeEntry({
            easeFactor: initialEaseFactor,
            repetitions: 0,
            interval: 1,
          });

          const intervals: number[] = [];

          for (let i = 0; i < recallCount; i++) {
            const result = calculateNextReview(entry, 5);
            intervals.push(result.newInterval);

            entry = makeEntry({
              easeFactor: result.newEaseFactor,
              repetitions: result.newRepetitions,
              interval: result.newInterval,
            });
          }

          for (let i = 1; i < intervals.length; i++) {
            expect(intervals[i]).toBeGreaterThanOrEqual(intervals[i - 1]);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('consecutive successful recalls with quality 3 (barely successful) produce non-decreasing intervals', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1.3, max: 3.0, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 3, max: 15 }),
        (initialEaseFactor, recallCount) => {
          let entry = makeEntry({
            easeFactor: initialEaseFactor,
            repetitions: 0,
            interval: 1,
          });

          const intervals: number[] = [];

          for (let i = 0; i < recallCount; i++) {
            const result = calculateNextReview(entry, 3);
            intervals.push(result.newInterval);

            entry = makeEntry({
              easeFactor: result.newEaseFactor,
              repetitions: result.newRepetitions,
              interval: result.newInterval,
            });
          }

          for (let i = 1; i < intervals.length; i++) {
            expect(intervals[i]).toBeGreaterThanOrEqual(intervals[i - 1]);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
