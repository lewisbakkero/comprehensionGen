// Feature: dyslexia-comprehension-tool, Property 16: Difficulty suggestion correctness

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import type { DifficultyLevel, ProgressRecord } from '../../types';
import {
  suggestLevelChange,
  setLevel,
  resetLevel,
} from '../../services/difficultyManager';

/**
 * Helper: build a ProgressRecord with the given overrides.
 */
function makeRecord(overrides: Partial<ProgressRecord> = {}): ProgressRecord {
  return {
    id: crypto.randomUUID(),
    passageId: 'p1',
    date: '2024-06-15',
    difficulty: 1,
    questionsTotal: 5,
    questionsCorrect: 3,
    questionsPartial: 1,
    completedAt: new Date('2024-06-15T12:00:00Z'),
    ...overrides,
  };
}

/**
 * Arbitrary for a DifficultyLevel (1 | 2 | 3).
 */
const difficultyArb: fc.Arbitrary<DifficultyLevel> = fc.constantFrom(
  1 as DifficultyLevel,
  2 as DifficultyLevel,
  3 as DifficultyLevel,
);

beforeEach(() => {
  resetLevel();
});

// **Validates: Requirements 11.3, 11.5**
describe('Property 16: Difficulty suggestion correctness', () => {
  it('suggestLevelChange returns "up" when ≥5 records at current level have ≥60% correct/partial and level < 3', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Level 1 or 2 (must be < 3 for level-up)
        fc.constantFrom(1 as DifficultyLevel, 2 as DifficultyLevel),
        // Number of records: 5–15
        fc.integer({ min: 5, max: 15 }),
        // Per-record: questionsTotal 1–20, satisfactory ratio ≥60%
        fc.integer({ min: 1, max: 20 }),
        async (level, count, questionsPerRecord) => {
          resetLevel();
          setLevel(level);

          // Build records where correct+partial ≥ 60% of total
          // We set correct = ceil(0.6 * total) and partial = 0 to guarantee ≥60%
          const minCorrect = Math.ceil(0.6 * questionsPerRecord);
          const records: ProgressRecord[] = Array.from({ length: count }, (_, i) =>
            makeRecord({
              id: `up-${i}`,
              difficulty: level,
              questionsTotal: questionsPerRecord,
              questionsCorrect: minCorrect,
              questionsPartial: 0,
            }),
          );

          const result = suggestLevelChange(records);
          expect(result).not.toBeNull();
          expect(result!.direction).toBe('up');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('suggestLevelChange returns "down" when last 3 records at current level (>1) have <30% correct', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Level 2 or 3 (must be > 1 for level-down)
        fc.constantFrom(2 as DifficultyLevel, 3 as DifficultyLevel),
        // questionsTotal per record: 1–20
        fc.integer({ min: 1, max: 20 }),
        // Extra older records (0–2) with similarly poor performance
        fc.integer({ min: 0, max: 2 }),
        async (level, questionsPerRecord, extraOlderCount) => {
          resetLevel();
          setLevel(level);

          // Older records also with poor performance so the overall ratio
          // stays below 60% and the level-up check (which fires first) won't trigger.
          const maxCorrect = Math.floor(0.29 * questionsPerRecord);
          const olderRecords: ProgressRecord[] = Array.from(
            { length: extraOlderCount },
            (_, i) =>
              makeRecord({
                id: `old-${i}`,
                difficulty: level,
                questionsTotal: questionsPerRecord,
                questionsCorrect: maxCorrect,
                questionsPartial: 0,
              }),
          );

          // Last 3 records with <30% correct
          const lastThree: ProgressRecord[] = Array.from({ length: 3 }, (_, i) =>
            makeRecord({
              id: `bad-${i}`,
              difficulty: level,
              questionsTotal: questionsPerRecord,
              questionsCorrect: maxCorrect,
              questionsPartial: 0,
            }),
          );

          const allRecords = [...olderRecords, ...lastThree];
          const result = suggestLevelChange(allRecords);
          expect(result).not.toBeNull();
          expect(result!.direction).toBe('down');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('suggestLevelChange returns null when neither threshold is met', async () => {
    await fc.assert(
      fc.asyncProperty(
        difficultyArb,
        // 0–4 records (not enough for level-up, and we'll keep performance moderate)
        fc.integer({ min: 0, max: 4 }),
        fc.integer({ min: 1, max: 20 }),
        async (level, count, questionsPerRecord) => {
          resetLevel();
          setLevel(level);

          // Build records with ~45% correct — above 30% (no down) but below 60% (no up)
          // Also fewer than 5 records so level-up can't trigger
          const correctPerRecord = Math.ceil(0.45 * questionsPerRecord);
          const records: ProgressRecord[] = Array.from({ length: count }, (_, i) =>
            makeRecord({
              id: `mid-${i}`,
              difficulty: level,
              questionsTotal: questionsPerRecord,
              questionsCorrect: correctPerRecord,
              questionsPartial: 0,
            }),
          );

          const result = suggestLevelChange(records);
          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});
