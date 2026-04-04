// Feature: dyslexia-comprehension-tool, Property 4: Answer evaluation returns valid category
// **Validates: Requirements 3.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseEvaluationResult } from '../../services/questionGenerator';

const VALID_CATEGORIES = ['correct', 'partial', 'incorrect'] as const;

describe('Property 4: Answer evaluation returns valid category', () => {
  it('parseEvaluationResult always returns exactly one of correct, partial, or incorrect for any string input', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = parseEvaluationResult(input);
        expect(VALID_CATEGORIES).toContain(result);
      }),
      { numRuns: 100 },
    );
  });

  it('parseEvaluationResult returns a valid category for arbitrary length and content strings', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { minLength: 0, maxLength: 5 }).map((parts) => parts.join('\n')),
        (input) => {
          const result = parseEvaluationResult(input);
          expect(VALID_CATEGORIES).toContain(result);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('parseEvaluationResult returns a valid category for strings containing partial keyword matches', () => {
    const mixedArb = fc.array(
      fc.constantFrom(
        ' ', '\t', '\n', 'correct', 'partial', 'incorrect',
        'CORRECT', 'Partial', 'INCORRECT', 'maybe', 'yes', 'no',
        'the answer is', '42', '!!!', '',
      ),
      { minLength: 0, maxLength: 5 },
    ).map((parts) => parts.join(' '));

    fc.assert(
      fc.property(mixedArb, (input) => {
        const result = parseEvaluationResult(input);
        expect(VALID_CATEGORIES).toContain(result);
      }),
      { numRuns: 100 },
    );
  });
});
