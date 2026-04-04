// Feature: dyslexia-comprehension-tool, Property 15: Previous passages always retrievable

import 'fake-indexeddb/auto';
import { deleteDB } from 'idb';
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { resetDBConnection } from '../../db/store';
import {
  savePassage,
  getAllPassages,
  getPassageById,
} from '../../services/passageHistory';
import type { PassageRecord, Genre, DifficultyLevel } from '../../types';

/**
 * Arbitrary that generates a valid PassageRecord with random but
 * realistic field values.
 */
function passageRecordArb(): fc.Arbitrary<PassageRecord> {
  const genreArb: fc.Arbitrary<Genre> = fc.constantFrom('fiction', 'non-fiction', 'poetry', 'persuasive');
  const difficultyArb: fc.Arbitrary<DifficultyLevel> = fc.constantFrom(1, 2, 3);

  return fc
    .record({
      id: fc.uuid(),
      text: fc.stringMatching(/^[a-zA-Z ]{20,100}$/),
      genre: genreArb,
      difficulty: difficultyArb,
      theme: fc.stringMatching(/^[a-zA-Z ]{3,20}$/),
      paragraphs: fc.array(fc.stringMatching(/^[a-zA-Z ]{10,50}$/), { minLength: 1, maxLength: 5 }),
      taggedWords: fc.constant([]),
      questions: fc.constant([]),
      createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
      completed: fc.boolean(),
      questionsAnswered: fc.integer({ min: 0, max: 8 }),
      questionsCorrect: fc.integer({ min: 0, max: 8 }),
    })
    .filter(
      (p) =>
        p.text.trim().length >= 20 &&
        p.theme.trim().length >= 3 &&
        p.paragraphs.every((para) => para.trim().length >= 10),
    );
}

beforeEach(async () => {
  await resetDBConnection();
  await deleteDB('dyslexia-comprehension-tool');
});

// **Validates: Requirements 10.5**
describe('Property 15: Previous passages always retrievable', () => {
  it('any stored passage remains retrievable after further operations', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(passageRecordArb(), { minLength: 1, maxLength: 5 }).filter((passages) => {
          const ids = new Set(passages.map((p) => p.id));
          return ids.size === passages.length;
        }),
        fc.array(passageRecordArb(), { minLength: 1, maxLength: 5 }).filter((passages) => {
          const ids = new Set(passages.map((p) => p.id));
          return ids.size === passages.length;
        }),
        async (initialPassages, additionalPassages) => {
          // Ensure no id collisions between the two batches
          const initialIds = new Set(initialPassages.map((p) => p.id));
          const filteredAdditional = additionalPassages.filter((p) => !initialIds.has(p.id));
          if (filteredAdditional.length === 0) return;

          // Store initial passages
          for (const passage of initialPassages) {
            await savePassage(passage);
          }

          // Perform additional operations: store more passages
          for (const passage of filteredAdditional) {
            await savePassage(passage);
          }

          // Verify ALL initial passages are still retrievable by id
          for (const original of initialPassages) {
            const retrieved = await getPassageById(original.id);
            expect(retrieved).toBeDefined();
            expect(retrieved!.id).toBe(original.id);
            expect(retrieved!.text).toBe(original.text);
            expect(retrieved!.genre).toBe(original.genre);
            expect(retrieved!.difficulty).toBe(original.difficulty);
            expect(retrieved!.theme).toBe(original.theme);
          }

          // Verify all passages appear in getAllPassages
          const all = await getAllPassages();
          const totalExpected = initialPassages.length + filteredAdditional.length;
          expect(all).toHaveLength(totalExpected);

          const allIds = new Set(all.map((p) => p.id));
          for (const original of initialPassages) {
            expect(allIds.has(original.id)).toBe(true);
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
