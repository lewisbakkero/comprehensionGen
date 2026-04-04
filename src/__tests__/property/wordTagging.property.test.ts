// Feature: dyslexia-comprehension-tool, Property 2: Tagged word completeness
// **Validates: Requirements 2.2, 2.4**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { tagWords } from '../../services/wordTagger';
import { YEAR_5_6_STATUTORY_WORDS } from '../../data/statutoryWords';
import type { Passage, Genre, DifficultyLevel } from '../../types';

/** Pool of simple filler words for building passage text. */
const SIMPLE_WORDS = [
  'the', 'cat', 'sat', 'on', 'mat', 'dog', 'ran', 'park',
  'bird', 'flew', 'over', 'tree', 'sun', 'warm', 'sky', 'blue',
  'day', 'play', 'big', 'red', 'old', 'new', 'fast', 'slow',
  'happy', 'kind', 'tall', 'cold', 'dark', 'soft', 'green', 'lake',
  'hill', 'road', 'door', 'book', 'hand', 'fish', 'rain', 'wind',
];

const GENRES: Genre[] = ['fiction', 'non-fiction', 'poetry', 'persuasive'];
const DIFFICULTIES: DifficultyLevel[] = [1, 2, 3];

/**
 * Arbitrary that builds a random sentence from a mix of simple words
 * and optionally some statutory words.
 */
function sentenceArb(statutoryCount: fc.Arbitrary<number>): fc.Arbitrary<string> {
  return fc
    .record({
      simpleWords: fc.array(fc.constantFrom(...SIMPLE_WORDS), { minLength: 4, maxLength: 12 }),
      statutoryWords: statutoryCount.chain((count) =>
        fc.array(fc.constantFrom(...YEAR_5_6_STATUTORY_WORDS), {
          minLength: count,
          maxLength: count,
        }),
      ),
    })
    .map(({ simpleWords, statutoryWords }) => {
      const allWords = [...simpleWords, ...statutoryWords];
      // Shuffle words together
      for (let i = allWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
      }
      // Capitalise first word and end with a period
      const text = allWords.join(' ');
      return text.charAt(0).toUpperCase() + text.slice(1) + '.';
    });
}

/**
 * Arbitrary that generates a Passage object with random text containing
 * a mix of simple words and some Y5/6 statutory words sprinkled in.
 */
const passageArb: fc.Arbitrary<Passage> = fc
  .record({
    id: fc.uuid(),
    genre: fc.constantFrom(...GENRES),
    difficulty: fc.constantFrom(...DIFFICULTIES),
    theme: fc.constantFrom('adventure', 'space', 'animals', 'mystery'),
    paragraphCount: fc.integer({ min: 3, max: 6 }),
    sentencesPerParagraph: fc.integer({ min: 2, max: 4 }),
    statutoryPerSentence: fc.integer({ min: 0, max: 3 }),
  })
  .chain((params) => {
    const { id, genre, difficulty, theme, paragraphCount, sentencesPerParagraph, statutoryPerSentence } = params;

    const paragraphArbs = Array.from({ length: paragraphCount }, () =>
      fc
        .array(sentenceArb(fc.constant(statutoryPerSentence)), {
          minLength: sentencesPerParagraph,
          maxLength: sentencesPerParagraph,
        })
        .map((sentences) => sentences.join(' ')),
    );

    return fc.tuple(...paragraphArbs).map((paragraphs) => {
      const text = paragraphs.join('\n\n');
      return {
        id,
        text,
        genre,
        difficulty,
        theme,
        paragraphs,
        taggedWords: [],
      } satisfies Passage;
    });
  });

describe('Property 2: Tagged word completeness', () => {
  it('tagged word count ∈ [3, 10] and each has non-empty definition and context', () => {
    fc.assert(
      fc.property(passageArb, (passage) => {
        const tagged = tagWords(passage);

        // Count must be between 3 and 10 inclusive
        expect(tagged.length).toBeGreaterThanOrEqual(3);
        expect(tagged.length).toBeLessThanOrEqual(10);

        // Each tagged word must have a non-empty definition
        for (const tw of tagged) {
          expect(tw.definition).toBeTruthy();
          expect(tw.definition.length).toBeGreaterThan(0);
        }

        // Each tagged word must have a non-empty passageContext
        for (const tw of tagged) {
          expect(tw.passageContext).toBeTruthy();
          expect(tw.passageContext.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 },
    );
  });
});
