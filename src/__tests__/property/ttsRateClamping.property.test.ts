// Feature: dyslexia-comprehension-tool, Property 12: TTS rate clamping

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { clampRate } from '../../services/ttsController';

// **Validates: Requirements 8.4**
describe('Property 12: TTS rate clamping', () => {
  it('any numeric rate is clamped to [0.5, 2.0]', () => {
    fc.assert(
      fc.property(fc.double({ noNaN: true, noDefaultInfinity: true }), (rate) => {
        const result = clampRate(rate);
        expect(result).toBeGreaterThanOrEqual(0.5);
        expect(result).toBeLessThanOrEqual(2.0);
      }),
      { numRuns: 100 },
    );
  });

  it('values below 0.5 clamp to exactly 0.5', () => {
    fc.assert(
      fc.property(
        fc.double({ noNaN: true, noDefaultInfinity: true, max: 0.49999 }),
        (rate) => {
          expect(clampRate(rate)).toBe(0.5);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('values above 2.0 clamp to exactly 2.0', () => {
    fc.assert(
      fc.property(
        fc.double({ noNaN: true, noDefaultInfinity: true, min: 2.00001 }),
        (rate) => {
          expect(clampRate(rate)).toBe(2.0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('values within [0.5, 2.0] are returned unchanged', () => {
    fc.assert(
      fc.property(
        fc.double({ noNaN: true, noDefaultInfinity: true, min: 0.5, max: 2.0 }),
        (rate) => {
          expect(clampRate(rate)).toBe(rate);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('non-finite values (NaN, Infinity, -Infinity) return default 0.85', () => {
    expect(clampRate(NaN)).toBe(0.85);
    expect(clampRate(Infinity)).toBe(0.85);
    expect(clampRate(-Infinity)).toBe(0.85);
  });
});
