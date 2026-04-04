// Feature: dyslexia-comprehension-tool, Property 7: Word bank addition round trip
// Feature: dyslexia-comprehension-tool, Property 9: Word bank sorted by review date
// Feature: dyslexia-comprehension-tool, Property 10: Word bank query correctness

import 'fake-indexeddb/auto';
import { deleteDB } from 'idb';
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { resetDBConnection } from '../../db/store';
import {
  addWord,
  getAll,
  getDueForReview,
  getMasteredCount,
} from '../../services/wordBankStore';
import type { WordBankEntry } from '../../types';

/**
 * Arbitrary that generates a valid WordBankEntry with random but
 * realistic field values.
 */
function wordBankEntryArb(overrides?: Partial<WordBankEntry>): fc.Arbitrary<WordBankEntry> {
  return fc
    .record({
      id: fc.uuid(),
      word: fc.stringMatching(/^[a-zA-Z]{2,15}$/),
      definition: fc.stringMatching(/^[a-zA-Z ]{5,60}$/),
      passageContext: fc.stringMatching(/^[a-zA-Z ]{10,80}$/),
      addedDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
      nextReviewDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
      interval: fc.integer({ min: 1, max: 365 }),
      easeFactor: fc.double({ min: 1.3, max: 3.0, noNaN: true }),
      repetitions: fc.integer({ min: 0, max: 50 }),
      mastered: fc.boolean(),
    })
    .filter(
      (e) =>
        e.word.trim().length >= 2 &&
        e.definition.trim().length >= 5 &&
        e.passageContext.trim().length >= 10,
    )
    .map((e) => ({ ...e, ...overrides }));
}

beforeEach(async () => {
  await resetDBConnection();
  await deleteDB('dyslexia-comprehension-tool');
});

// **Validates: Requirements 5.1**
describe('Property 7: Word bank addition round trip', () => {
  it('adding a word and retrieving all entries includes that word with matching definition and context', () => {
    fc.assert(
      fc.asyncProperty(wordBankEntryArb(), async (entry) => {
        await addWord(entry);
        const all = await getAll();

        const found = all.find((e) => e.id === entry.id);
        expect(found).toBeDefined();
        expect(found!.word).toBe(entry.word);
        expect(found!.definition).toBe(entry.definition);
        expect(found!.passageContext).toBe(entry.passageContext);

        // Clean up for next iteration
        await resetDBConnection();
        await deleteDB('dyslexia-comprehension-tool');
      }),
      { numRuns: 100 },
    );
  });
});

// **Validates: Requirements 5.3**
describe('Property 9: Word bank sorted by review date', () => {
  it('getAll() returns entries sorted by nextReviewDate ascending, due entries before future entries', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(wordBankEntryArb(), { minLength: 2, maxLength: 10 }).filter(
          (entries) => {
            const ids = new Set(entries.map((e) => e.id));
            return ids.size === entries.length;
          },
        ),
        async (entries) => {
          for (const entry of entries) {
            await addWord(entry);
          }

          const all = await getAll();
          expect(all).toHaveLength(entries.length);

          // Verify ascending sort by nextReviewDate
          for (let i = 1; i < all.length; i++) {
            expect(all[i - 1].nextReviewDate.getTime()).toBeLessThanOrEqual(
              all[i].nextReviewDate.getTime(),
            );
          }

          // Verify due entries (nextReviewDate <= now) appear before future entries
          const now = new Date();
          let seenFuture = false;
          for (const entry of all) {
            if (entry.nextReviewDate > now) {
              seenFuture = true;
            }
            if (seenFuture) {
              expect(entry.nextReviewDate.getTime()).toBeGreaterThan(now.getTime());
            }
          }

          // Clean up for next iteration
          await resetDBConnection();
          await deleteDB('dyslexia-comprehension-tool');
        },
      ),
      { numRuns: 100 },
    );
  });
});

// **Validates: Requirements 5.4, 5.5**
describe('Property 10: Word bank query correctness', () => {
  it('getDueForReview() returns exactly entries with nextReviewDate ≤ now; getMasteredCount() equals count of mastered entries', () => {
    const now = new Date();
    const pastDateArb = fc.date({ min: new Date('2020-01-01'), max: new Date(now.getTime() - 1000) });
    const futureDateArb = fc.date({ min: new Date(now.getTime() + 86400000), max: new Date('2030-01-01') });

    // Generate entries with an explicit mix of past and future review dates
    const entryWithDateArb = fc.oneof(
      wordBankEntryArb().chain((entry) =>
        pastDateArb.map((d) => ({ ...entry, nextReviewDate: d })),
      ),
      wordBankEntryArb().chain((entry) =>
        futureDateArb.map((d) => ({ ...entry, nextReviewDate: d })),
      ),
    );

    fc.assert(
      fc.asyncProperty(
        fc.array(entryWithDateArb, { minLength: 1, maxLength: 10 }).filter(
          (entries) => {
            const ids = new Set(entries.map((e) => e.id));
            return ids.size === entries.length;
          },
        ),
        async (entries) => {
          for (const entry of entries) {
            await addWord(entry);
          }

          // Verify getDueForReview returns exactly entries with nextReviewDate <= now
          const due = await getDueForReview();
          const expectedDue = entries.filter((e) => e.nextReviewDate <= now);
          expect(due).toHaveLength(expectedDue.length);

          const dueIds = new Set(due.map((e) => e.id));
          for (const expected of expectedDue) {
            expect(dueIds.has(expected.id)).toBe(true);
          }

          // Verify no future entries snuck in
          for (const d of due) {
            expect(d.nextReviewDate.getTime()).toBeLessThanOrEqual(now.getTime());
          }

          // Verify getMasteredCount equals count of mastered entries
          const masteredCount = await getMasteredCount();
          const expectedMastered = entries.filter((e) => e.mastered).length;
          expect(masteredCount).toBe(expectedMastered);

          // Clean up for next iteration
          await resetDBConnection();
          await deleteDB('dyslexia-comprehension-tool');
        },
      ),
      { numRuns: 100 },
    );
  });
});
