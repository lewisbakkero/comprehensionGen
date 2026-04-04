// Feature: dyslexia-comprehension-tool, Property 3: Question generation structure
// **Validates: Requirements 3.1, 3.2, 3.4**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateQuestions } from '../../services/questionGenerator';
import type { ComprehensionQuestion, QuestionType } from '../../types';

const ALL_QUESTION_TYPES: QuestionType[] = [
  'retrieval',
  'inference',
  'vocabulary',
  'authors-purpose',
  'summarisation',
];

/**
 * Arbitrary for a non-empty trimmed string (used for hints, relevantSection, etc.)
 */
const WORD_POOL = [
  'the', 'cat', 'sat', 'on', 'a', 'mat', 'dog', 'ran', 'in', 'park',
  'bird', 'flew', 'over', 'tree', 'sun', 'was', 'warm', 'sky', 'blue',
  'happy', 'kind', 'tall', 'cold', 'dark', 'soft', 'green', 'lake',
];

const nonEmptyStringArb = fc
  .array(fc.constantFrom(...WORD_POOL), { minLength: 2, maxLength: 8 })
  .map((words) => words.join(' '));

/**
 * Arbitrary for a single ComprehensionQuestion with a given type.
 */
function questionArb(typeArb: fc.Arbitrary<QuestionType>): fc.Arbitrary<ComprehensionQuestion> {
  return fc.record({
    id: fc.uuid(),
    text: nonEmptyStringArb,
    type: typeArb,
    modelAnswer: nonEmptyStringArb,
    hints: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 3 }),
    relevantSection: nonEmptyStringArb,
  });
}

/**
 * Arbitrary that generates a valid set of ComprehensionQuestion objects:
 * - Count in [4, 8]
 * - At least 2 distinct question types
 * - Every question has non-empty hints and relevantSection
 */
const validQuestionSetArb: fc.Arbitrary<ComprehensionQuestion[]> = fc
  .record({
    count: fc.integer({ min: 4, max: 8 }),
    type1: fc.constantFrom(...ALL_QUESTION_TYPES),
    type2: fc.constantFrom(...ALL_QUESTION_TYPES),
  })
  .filter(({ type1, type2 }) => type1 !== type2)
  .chain(({ count, type1, type2 }) => {
    // Ensure at least one question of each of the two distinct types
    const restCount = count - 2;
    const restTypeArb = fc.constantFrom(...ALL_QUESTION_TYPES);

    return fc
      .tuple(
        questionArb(fc.constant(type1)),
        questionArb(fc.constant(type2)),
        fc.array(questionArb(restTypeArb), {
          minLength: restCount,
          maxLength: restCount,
        }),
      )
      .map(([q1, q2, rest]) => [q1, q2, ...rest]);
  });

/**
 * Arbitrary that generates a question set with fewer than 4 questions.
 */
const tooFewQuestionsArb: fc.Arbitrary<ComprehensionQuestion[]> = fc
  .integer({ min: 0, max: 3 })
  .chain((count) => {
    if (count === 0) return fc.constant([]);
    return fc.array(questionArb(fc.constantFrom(...ALL_QUESTION_TYPES)), {
      minLength: count,
      maxLength: count,
    });
  });

/**
 * Arbitrary that generates a question set with more than 8 questions.
 */
const tooManyQuestionsArb: fc.Arbitrary<ComprehensionQuestion[]> = fc
  .integer({ min: 9, max: 15 })
  .chain((count) =>
    fc.array(questionArb(fc.constantFrom(...ALL_QUESTION_TYPES)), {
      minLength: count,
      maxLength: count,
    }),
  );

/**
 * Arbitrary that generates a question set where all questions have the same type
 * (only 1 distinct type), with a valid count in [4, 8].
 */
const sameTypeQuestionsArb: fc.Arbitrary<ComprehensionQuestion[]> = fc
  .record({
    count: fc.integer({ min: 4, max: 8 }),
    singleType: fc.constantFrom(...ALL_QUESTION_TYPES),
  })
  .chain(({ count, singleType }) =>
    fc.array(questionArb(fc.constant(singleType)), {
      minLength: count,
      maxLength: count,
    }),
  );

/**
 * Arbitrary that generates a question set with valid count and ≥2 types,
 * but at least one question has empty hints.
 */
const emptyHintsQuestionsArb: fc.Arbitrary<ComprehensionQuestion[]> = validQuestionSetArb.map(
  (questions) => {
    const copy = questions.map((q) => ({ ...q }));
    // Make the first question have empty hints
    copy[0] = { ...copy[0], hints: [] };
    return copy;
  },
);

/**
 * Arbitrary that generates a question set with valid count and ≥2 types,
 * but at least one question has empty relevantSection.
 */
const emptyRelevantSectionArb: fc.Arbitrary<ComprehensionQuestion[]> = validQuestionSetArb.map(
  (questions) => {
    const copy = questions.map((q) => ({ ...q }));
    // Make the first question have empty relevantSection
    copy[0] = { ...copy[0], relevantSection: '' };
    return copy;
  },
);

/**
 * Arbitrary that generates a question set with valid count and ≥2 types,
 * but at least one hint is whitespace-only.
 */
const whitespaceHintArb: fc.Arbitrary<ComprehensionQuestion[]> = validQuestionSetArb.map(
  (questions) => {
    const copy = questions.map((q) => ({ ...q }));
    copy[0] = { ...copy[0], hints: ['   ', '  '] };
    return copy;
  },
);

describe('Property 3: Question generation structure', () => {
  it('valid question sets pass validation — count ∈ [4, 8], ≥2 distinct types, non-empty hints and relevantSection', () => {
    fc.assert(
      fc.property(validQuestionSetArb, (questions) => {
        // Verify structural invariants hold
        expect(questions.length).toBeGreaterThanOrEqual(4);
        expect(questions.length).toBeLessThanOrEqual(8);

        const types = new Set(questions.map((q) => q.type));
        expect(types.size).toBeGreaterThanOrEqual(2);

        for (const q of questions) {
          expect(q.hints.length).toBeGreaterThan(0);
          expect(q.hints.every((h) => h.trim().length > 0)).toBe(true);
          expect(q.relevantSection.trim().length).toBeGreaterThan(0);
        }

        // validateQuestions must agree
        expect(validateQuestions(questions)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('question sets with fewer than 4 questions fail validation', () => {
    fc.assert(
      fc.property(tooFewQuestionsArb, (questions) => {
        expect(questions.length).toBeLessThan(4);
        expect(validateQuestions(questions)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('question sets with more than 8 questions fail validation', () => {
    fc.assert(
      fc.property(tooManyQuestionsArb, (questions) => {
        expect(questions.length).toBeGreaterThan(8);
        expect(validateQuestions(questions)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('question sets with only 1 distinct type fail validation', () => {
    fc.assert(
      fc.property(sameTypeQuestionsArb, (questions) => {
        const types = new Set(questions.map((q) => q.type));
        expect(types.size).toBe(1);
        expect(validateQuestions(questions)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('question sets with empty hints fail validation', () => {
    fc.assert(
      fc.property(emptyHintsQuestionsArb, (questions) => {
        expect(validateQuestions(questions)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('question sets with empty relevantSection fail validation', () => {
    fc.assert(
      fc.property(emptyRelevantSectionArb, (questions) => {
        expect(validateQuestions(questions)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('question sets with whitespace-only hints fail validation', () => {
    fc.assert(
      fc.property(whitespaceHintArb, (questions) => {
        expect(validateQuestions(questions)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
