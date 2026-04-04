import type { WordBankEntry, ReviewUpdate } from '../types';

/**
 * SM-2 Spaced Repetition Scheduler.
 *
 * Calculates the next review date, interval, ease factor, and repetition count
 * for a word bank entry based on recall quality (0–5 scale).
 *
 * - quality >= 3: successful recall → interval grows
 * - quality < 3: failed recall → reset to 1 day
 * - Ease factor is clamped to a minimum of 1.3
 * - Word is mastered when interval reaches 21+ days
 */
export function calculateNextReview(
  entry: WordBankEntry,
  recallQuality: number,
): ReviewUpdate {
  const quality = Math.max(0, Math.min(5, Math.round(recallQuality)));

  let newInterval: number;
  let newRepetitions: number;

  if (quality >= 3) {
    // Successful recall
    if (entry.repetitions === 0) {
      newInterval = 1;
    } else if (entry.repetitions === 1) {
      newInterval = 3;
    } else {
      newInterval = Math.round(entry.interval * entry.easeFactor);
    }
    newRepetitions = entry.repetitions + 1;
  } else {
    // Failed recall — reset
    newInterval = 1;
    newRepetitions = 0;
  }

  // SM-2 ease factor adjustment
  const newEaseFactor = Math.max(
    1.3,
    entry.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  const mastered = newInterval >= 21;

  const now = new Date();
  const nextReviewDate = new Date(
    now.getTime() + newInterval * 24 * 60 * 60 * 1000,
  );

  return {
    nextReviewDate,
    newInterval,
    newEaseFactor,
    newRepetitions,
    mastered,
  };
}

/**
 * Convenience wrapper that maps a binary recalled/not-recalled input
 * to SM-2 quality values suitable for child UX:
 *   recalled = true  → quality 4
 *   recalled = false → quality 1
 */
export function calculateNextReviewBinary(
  entry: WordBankEntry,
  recalled: boolean,
): ReviewUpdate {
  return calculateNextReview(entry, recalled ? 4 : 1);
}
