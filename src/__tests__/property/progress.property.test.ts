// Feature: dyslexia-comprehension-tool, Property 13: Progress recording round trip
// Feature: dyslexia-comprehension-tool, Property 14: Streak calculation correctness

import 'fake-indexeddb/auto';
import { deleteDB } from 'idb';
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { resetDBConnection, getAllProgressRecords } from '../../db/store';
import {
  recordPassageCompletion,
  getCurrentStreak,
} from '../../services/progressTracker';
import type { DifficultyLevel, ProgressRecord } from '../../types';
import { addProgressRecord } from '../../db/store';

beforeEach(async () => {
  await resetDBConnection();
  await deleteDB('dyslexia-comprehension-tool');
});

// **Validates: Requirements 9.1**
describe('Property 13: Progress recording round trip', () => {
  it('recorded completion is retrievable with correct passageId and today\'s date', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom(1, 2, 3) as fc.Arbitrary<DifficultyLevel>,
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 0, max: 20 }),
        async (passageId, difficulty, total, correct, partial) => {
          await recordPassageCompletion(passageId, difficulty, total, correct, partial);

          const all = await getAllProgressRecords();
          expect(all.length).toBeGreaterThanOrEqual(1);

          const found = all.find((r) => r.passageId === passageId);
          expect(found).toBeDefined();
          expect(found!.passageId).toBe(passageId);

          // Date should be today in YYYY-MM-DD format
          const todayStr = new Date().toISOString().slice(0, 10);
          expect(found!.date).toBe(todayStr);

          // Verify other fields round-tripped correctly
          expect(found!.difficulty).toBe(difficulty);
          expect(found!.questionsTotal).toBe(total);
          expect(found!.questionsCorrect).toBe(correct);
          expect(found!.questionsPartial).toBe(partial);

          // Clean up for next iteration
          await resetDBConnection();
          await deleteDB('dyslexia-comprehension-tool');
        },
      ),
      { numRuns: 100 },
    );
  });
});


// **Validates: Requirements 9.2**
describe('Property 14: Streak calculation correctness', () => {
  it('streak equals longest run of consecutive calendar days ending at today (0 if no completion today)', async () => {
    /**
     * Strategy: generate a random "today" date and a random set of day-offsets
     * (0 = today, 1 = yesterday, etc.). Insert progress records for those dates,
     * then verify getCurrentStreak returns the correct streak length.
     */
    const dayOffsetsArb = fc.array(
      fc.integer({ min: 0, max: 30 }),
      { minLength: 0, maxLength: 15 },
    );

    await fc.assert(
      fc.asyncProperty(dayOffsetsArb, async (offsets) => {
        // Use a fixed "today" to avoid midnight boundary issues
        const today = '2024-08-15';
        const todayMs = new Date(today + 'T12:00:00Z').getTime();

        // Collect unique dates from offsets
        const uniqueDates = new Set<string>();
        for (const offset of offsets) {
          const d = new Date(todayMs - offset * 86400000);
          uniqueDates.add(d.toISOString().slice(0, 10));
        }

        // Insert a progress record for each unique date
        let idx = 0;
        for (const dateStr of uniqueDates) {
          const record: ProgressRecord = {
            id: `streak-${idx++}`,
            passageId: `p-${idx}`,
            date: dateStr,
            difficulty: 1,
            questionsTotal: 5,
            questionsCorrect: 3,
            questionsPartial: 1,
            completedAt: new Date(dateStr + 'T12:00:00Z'),
          };
          await addProgressRecord(record);
        }

        // Calculate expected streak manually
        let expectedStreak = 0;
        if (uniqueDates.has(today)) {
          expectedStreak = 1;
          let checkDate = today;
          while (true) {
            const prev = new Date(checkDate + 'T12:00:00Z');
            prev.setUTCDate(prev.getUTCDate() - 1);
            const prevStr = prev.toISOString().slice(0, 10);
            if (uniqueDates.has(prevStr)) {
              expectedStreak++;
              checkDate = prevStr;
            } else {
              break;
            }
          }
        }

        const actualStreak = await getCurrentStreak(today);
        expect(actualStreak).toBe(expectedStreak);

        // Clean up for next iteration
        await resetDBConnection();
        await deleteDB('dyslexia-comprehension-tool');
      }),
      { numRuns: 100 },
    );
  });
});
