// Feature: dyslexia-comprehension-tool, Property 5: Motor memory exercise state machine
// **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createExerciseSession } from '../../services/motorMemoryExercise';
import type { TaggedWord } from '../../types';

/**
 * Arbitrary that generates random TaggedWord objects with non-empty
 * word strings, definitions, and passage contexts.
 */
const taggedWordArb: fc.Arbitrary<TaggedWord> = fc
  .record({
    word: fc.stringMatching(/^[a-zA-Z]{2,15}$/),
    definition: fc.stringMatching(/^[a-zA-Z ]{5,50}$/),
    passageContext: fc.stringMatching(/^[a-zA-Z ]{10,80}$/),
    isCurriculumWord: fc.boolean(),
  })
  .filter(
    (w) =>
      w.word.trim().length >= 2 &&
      w.definition.trim().length >= 5 &&
      w.passageContext.trim().length >= 10,
  );

describe('Property 5: Motor memory exercise state machine', () => {
  it('3 correct typings → use-in-sentence → valid sentence → type-from-memory → correct recall → complete with definition available', () => {
    fc.assert(
      fc.property(taggedWordArb, (word) => {
        const session = createExerciseSession(word);

        // --- Step 1: type-three-times (Req 4.1) ---
        expect(session.step).toBe('type-three-times');
        expect(session.correctTypings).toBe(0);

        // Submit 3 correct typings
        const r1 = session.submitTyping(word.word);
        expect(r1.correct).toBe(true);
        expect(session.correctTypings).toBe(1);

        const r2 = session.submitTyping(word.word);
        expect(r2.correct).toBe(true);
        expect(session.correctTypings).toBe(2);

        const r3 = session.submitTyping(word.word);
        expect(r3.correct).toBe(true);
        expect(r3.nextStep).toBe('use-in-sentence');
        expect(session.step).toBe('use-in-sentence');

        // --- Step 2: use-in-sentence (Req 4.2) ---
        const sentence = `I wrote a sentence with ${word.word} in it.`;
        const r4 = session.submitSentence(sentence);
        expect(r4.correct).toBe(true);
        expect(r4.nextStep).toBe('type-from-memory');
        expect(session.step).toBe('type-from-memory');

        // --- Step 3: type-from-memory (Req 4.3) ---
        const r5 = session.submitMemoryRecall(word.word);
        expect(r5.correct).toBe(true);
        expect(r5.nextStep).toBe('complete');
        expect(session.step).toBe('complete');

        // --- Completion: definition available (Req 4.4) ---
        expect(r5.feedback).toContain(word.word);
        expect(r5.feedback).toContain(word.definition);
        expect(r5.feedback).toContain(word.passageContext);
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: dyslexia-comprehension-tool, Property 6: Incorrect typing does not advance exercise
// **Validates: Requirements 4.5**

/**
 * Arbitrary that generates a string guaranteed NOT to match a given word
 * (case-insensitive). Produces non-empty alphabetic strings.
 */
function incorrectInputArb(word: string): fc.Arbitrary<string> {
  return fc
    .stringMatching(/^[a-zA-Z]{1,20}$/)
    .filter((s) => s.trim().length > 0 && s.trim().toLowerCase() !== word.toLowerCase());
}

/**
 * Arbitrary that generates a sentence guaranteed NOT to contain a given word
 * (case-insensitive) — not even as a substring within other words.
 */
function sentenceWithoutWordArb(word: string): fc.Arbitrary<string> {
  const lowerWord = word.toLowerCase();
  return fc
    .array(
      fc.stringMatching(/^[a-zA-Z]{2,10}$/).filter(
        (w) => !w.toLowerCase().includes(lowerWord) && !lowerWord.includes(w.toLowerCase()),
      ),
      { minLength: 3, maxLength: 8 },
    )
    .filter((words) => {
      // Also verify the joined sentence doesn't accidentally contain the word
      const joined = words.join(' ').toLowerCase();
      return !joined.includes(lowerWord);
    })
    .map((words) => words.join(' ') + '.');
}

describe('Property 6: Incorrect typing does not advance exercise', () => {
  it('incorrect input at type-three-times step keeps same step and progress count', () => {
    fc.assert(
      fc.property(taggedWordArb, (word) => {
        const session = createExerciseSession(word);

        expect(session.step).toBe('type-three-times');
        expect(session.correctTypings).toBe(0);

        // Submit incorrect typing — step and correctTypings must not change
        const wrongInput = word.word + 'zzz'; // guaranteed different
        const result = session.submitTyping(wrongInput);

        expect(result.correct).toBe(false);
        expect(result.nextStep).toBe('type-three-times');
        expect(session.step).toBe('type-three-times');
        expect(session.correctTypings).toBe(0);
        expect(result.feedback.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('incorrect input at type-three-times step with random wrong strings never advances', () => {
    fc.assert(
      fc.property(
        taggedWordArb.chain((word) =>
          fc.tuple(fc.constant(word), incorrectInputArb(word.word)),
        ),
        ([word, wrongInput]) => {
          const session = createExerciseSession(word);

          expect(session.step).toBe('type-three-times');
          const stepBefore = session.step;
          const typingsBefore = session.correctTypings;

          const result = session.submitTyping(wrongInput);

          expect(result.correct).toBe(false);
          expect(result.nextStep).toBe(stepBefore);
          expect(session.step).toBe(stepBefore);
          expect(session.correctTypings).toBe(typingsBefore);
          expect(result.feedback.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('incorrect input at use-in-sentence step keeps same step', () => {
    fc.assert(
      fc.property(
        taggedWordArb.chain((word) =>
          fc.tuple(fc.constant(word), sentenceWithoutWordArb(word.word)),
        ),
        ([word, wrongSentence]) => {
          const session = createExerciseSession(word);

          // Advance to use-in-sentence by submitting 3 correct typings
          session.submitTyping(word.word);
          session.submitTyping(word.word);
          session.submitTyping(word.word);
          expect(session.step).toBe('use-in-sentence');

          const result = session.submitSentence(wrongSentence);

          expect(result.correct).toBe(false);
          expect(result.nextStep).toBe('use-in-sentence');
          expect(session.step).toBe('use-in-sentence');
          expect(result.feedback.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('incorrect input at type-from-memory step keeps same step', () => {
    fc.assert(
      fc.property(
        taggedWordArb.chain((word) =>
          fc.tuple(fc.constant(word), incorrectInputArb(word.word)),
        ),
        ([word, wrongInput]) => {
          const session = createExerciseSession(word);

          // Advance to type-from-memory
          session.submitTyping(word.word);
          session.submitTyping(word.word);
          session.submitTyping(word.word);
          session.submitSentence(`I used ${word.word} in a sentence.`);
          expect(session.step).toBe('type-from-memory');

          const result = session.submitMemoryRecall(wrongInput);

          expect(result.correct).toBe(false);
          expect(result.nextStep).toBe('type-from-memory');
          expect(session.step).toBe('type-from-memory');
          expect(result.feedback.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
