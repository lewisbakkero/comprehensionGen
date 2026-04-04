// Feature: dyslexia-comprehension-tool, Property 1: Passage structure validation
// **Validates: Requirements 1.4, 1.6**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validatePassage, countSentences } from '../../services/passageGenerator';

/**
 * Helper: build a sentence of exactly `wordCount` words.
 * Capitalises the first word and ends with a period.
 */
function makeSentence(wordCount: number): string {
  if (wordCount <= 0) return '';
  const words = Array.from({ length: wordCount }, (_, i) =>
    i === 0 ? 'The' : 'word',
  );
  return words.join(' ') + '.';
}

/**
 * Arbitrary that generates a valid passage text:
 * - Total word count in [150, 500]
 * - Each paragraph has 1–4 sentences
 * - 2–8 paragraphs
 */
const validPassageArb = fc
  .record({
    paragraphCount: fc.integer({ min: 2, max: 8 }),
    sentencesPerParagraph: fc.array(fc.integer({ min: 1, max: 4 }), {
      minLength: 2,
      maxLength: 8,
    }),
    targetWordCount: fc.integer({ min: 150, max: 500 }),
  })
  .map(({ paragraphCount, sentencesPerParagraph, targetWordCount }) => {
    // Ensure sentencesPerParagraph array matches paragraphCount
    const spp = Array.from(
      { length: paragraphCount },
      (_, i) => sentencesPerParagraph[i % sentencesPerParagraph.length],
    );

    const totalSentences = spp.reduce((a, b) => a + b, 0);
    const wordsPerSentence = Math.max(3, Math.floor(targetWordCount / totalSentences));

    const paragraphs: string[] = [];
    let wordsUsed = 0;

    for (let p = 0; p < paragraphCount; p++) {
      const sentences: string[] = [];
      for (let s = 0; s < spp[p]; s++) {
        const isLast = p === paragraphCount - 1 && s === spp[p] - 1;
        const wc = isLast
          ? Math.max(3, targetWordCount - wordsUsed)
          : wordsPerSentence;
        sentences.push(makeSentence(wc));
        wordsUsed += wc;
      }
      paragraphs.push(sentences.join(' '));
    }

    return paragraphs.join('\n\n');
  });

/**
 * Arbitrary that generates a passage with word count BELOW 150.
 */
const tooFewWordsArb = fc
  .integer({ min: 5, max: 149 })
  .map((wordCount) => {
    // Single paragraph, 2 sentences
    const half = Math.floor(wordCount / 2);
    const rest = wordCount - half;
    return makeSentence(half) + ' ' + makeSentence(rest);
  });

/**
 * Arbitrary that generates a passage with word count ABOVE 500.
 */
const tooManyWordsArb = fc
  .integer({ min: 501, max: 800 })
  .map((wordCount) => {
    // Spread across 4 paragraphs, 2 sentences each
    const paragraphs: string[] = [];
    let remaining = wordCount;
    for (let p = 0; p < 4; p++) {
      const isLast = p === 3;
      const wc = isLast ? remaining : Math.floor(remaining / (4 - p));
      const half = Math.floor(wc / 2);
      const rest = wc - half;
      paragraphs.push(makeSentence(half) + ' ' + makeSentence(rest));
      remaining -= wc;
    }
    return paragraphs.join('\n\n');
  });

/**
 * Arbitrary that generates a passage with at least one paragraph having >4 sentences,
 * but with a valid word count in [150, 500].
 */
const tooManySentencesArb = fc
  .record({
    sentencesInBadParagraph: fc.integer({ min: 5, max: 8 }),
    wordsPerSentence: fc.integer({ min: 5, max: 12 }),
  })
  .map(({ sentencesInBadParagraph, wordsPerSentence }) => {
    // Build one paragraph with too many sentences
    const badSentences: string[] = [];
    for (let s = 0; s < sentencesInBadParagraph; s++) {
      badSentences.push(makeSentence(wordsPerSentence));
    }
    const badParagraph = badSentences.join(' ');

    // Calculate words used so far
    const wordsInBad = sentencesInBadParagraph * wordsPerSentence;

    // Add more paragraphs (valid ones) to reach at least 150 words total
    const wordsNeeded = Math.max(0, 150 - wordsInBad);
    const goodParagraphs: string[] = [];
    let wordsAdded = 0;
    while (wordsAdded < wordsNeeded) {
      const wc = Math.min(40, wordsNeeded - wordsAdded);
      if (wc < 3) break;
      goodParagraphs.push(makeSentence(wc));
      wordsAdded += wc;
    }

    return [badParagraph, ...goodParagraphs].join('\n\n');
  });

describe('Property 1: Passage structure validation', () => {
  it('valid passages pass validation — word count ∈ [150, 500] and paragraphs ≤ 4 sentences', () => {
    fc.assert(
      fc.property(validPassageArb, (passageText) => {
        const result = validatePassage(passageText);

        // Word count must be in valid range
        expect(result.wordCount).toBeGreaterThanOrEqual(150);
        expect(result.wordCount).toBeLessThanOrEqual(500);

        // Every paragraph must have ≤ 4 sentences
        for (const paragraph of result.paragraphs) {
          expect(countSentences(paragraph)).toBeLessThanOrEqual(4);
        }

        // Overall validation must pass
        expect(result.valid).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('passages with too few words fail validation', () => {
    fc.assert(
      fc.property(tooFewWordsArb, (passageText) => {
        const result = validatePassage(passageText);
        expect(result.wordCount).toBeLessThan(150);
        expect(result.valid).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('passages with too many words fail validation', () => {
    fc.assert(
      fc.property(tooManyWordsArb, (passageText) => {
        const result = validatePassage(passageText);
        expect(result.wordCount).toBeGreaterThan(500);
        expect(result.valid).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('passages with a paragraph exceeding 4 sentences fail validation', () => {
    fc.assert(
      fc.property(tooManySentencesArb, (passageText) => {
        const result = validatePassage(passageText);

        // At least one paragraph should have > 4 sentences
        const hasOverlong = result.paragraphs.some(
          (p) => countSentences(p) > 4,
        );
        expect(hasOverlong).toBe(true);

        // Validation must fail
        expect(result.valid).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
