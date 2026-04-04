import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { calculateNextReview, calculateNextReviewBinary } from './spacedRepetitionScheduler';
import type { WordBankEntry } from '../types';

function makeEntry(overrides: Partial<WordBankEntry> = {}): WordBankEntry {
  return {
    id: 'w1',
    word: 'environment',
    definition: 'The surroundings in which a person lives.',
    passageContext: 'The ancient environment was marvellous.',
    addedDate: new Date('2024-01-01'),
    nextReviewDate: new Date('2024-01-02'),
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
    mastered: false,
    ...overrides,
  };
}

describe('calculateNextReview', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('successful recall (quality >= 3)', () => {
    it('sets interval to 1 day when repetitions is 0', () => {
      const entry = makeEntry({ repetitions: 0 });
      const result = calculateNextReview(entry, 4);
      expect(result.newInterval).toBe(1);
      expect(result.newRepetitions).toBe(1);
    });

    it('sets interval to 3 days when repetitions is 1', () => {
      const entry = makeEntry({ repetitions: 1, interval: 1 });
      const result = calculateNextReview(entry, 4);
      expect(result.newInterval).toBe(3);
      expect(result.newRepetitions).toBe(2);
    });

    it('uses interval * easeFactor when repetitions >= 2', () => {
      const entry = makeEntry({ repetitions: 2, interval: 3, easeFactor: 2.5 });
      const result = calculateNextReview(entry, 4);
      expect(result.newInterval).toBe(Math.round(3 * 2.5)); // 8
      expect(result.newRepetitions).toBe(3);
    });

    it('rounds the computed interval', () => {
      const entry = makeEntry({ repetitions: 3, interval: 8, easeFactor: 2.3 });
      const result = calculateNextReview(entry, 4);
      expect(result.newInterval).toBe(Math.round(8 * 2.3)); // 18
    });

    it('increments repetitions', () => {
      const entry = makeEntry({ repetitions: 5 });
      const result = calculateNextReview(entry, 3);
      expect(result.newRepetitions).toBe(6);
    });
  });

  describe('failed recall (quality < 3)', () => {
    it('resets interval to 1 day', () => {
      const entry = makeEntry({ repetitions: 5, interval: 30 });
      const result = calculateNextReview(entry, 2);
      expect(result.newInterval).toBe(1);
    });

    it('resets repetitions to 0', () => {
      const entry = makeEntry({ repetitions: 5, interval: 30 });
      const result = calculateNextReview(entry, 1);
      expect(result.newRepetitions).toBe(0);
    });

    it('resets on quality 0', () => {
      const entry = makeEntry({ repetitions: 3, interval: 10 });
      const result = calculateNextReview(entry, 0);
      expect(result.newInterval).toBe(1);
      expect(result.newRepetitions).toBe(0);
    });
  });

  describe('ease factor adjustment', () => {
    it('increases ease factor on high quality (5)', () => {
      const entry = makeEntry({ easeFactor: 2.5 });
      const result = calculateNextReview(entry, 5);
      expect(result.newEaseFactor).toBeGreaterThan(2.5);
    });

    it('decreases ease factor on low quality (0)', () => {
      const entry = makeEntry({ easeFactor: 2.5 });
      const result = calculateNextReview(entry, 0);
      expect(result.newEaseFactor).toBeLessThan(2.5);
    });

    it('clamps ease factor to minimum 1.3', () => {
      const entry = makeEntry({ easeFactor: 1.3 });
      const result = calculateNextReview(entry, 0);
      expect(result.newEaseFactor).toBe(1.3);
    });

    it('does not go below 1.3 even with repeated failures', () => {
      let entry = makeEntry({ easeFactor: 1.5 });
      for (let i = 0; i < 10; i++) {
        const result = calculateNextReview(entry, 0);
        expect(result.newEaseFactor).toBeGreaterThanOrEqual(1.3);
        entry = makeEntry({ ...entry, easeFactor: result.newEaseFactor });
      }
    });

    it('computes correct ease factor for quality 4', () => {
      const entry = makeEntry({ easeFactor: 2.5 });
      // EF' = 2.5 + (0.1 - (5-4)*(0.08 + (5-4)*0.02))
      //      = 2.5 + (0.1 - 1*(0.08 + 1*0.02))
      //      = 2.5 + (0.1 - 0.1) = 2.5
      const result = calculateNextReview(entry, 4);
      expect(result.newEaseFactor).toBeCloseTo(2.5, 5);
    });

    it('computes correct ease factor for quality 3', () => {
      const entry = makeEntry({ easeFactor: 2.5 });
      // EF' = 2.5 + (0.1 - (5-3)*(0.08 + (5-3)*0.02))
      //      = 2.5 + (0.1 - 2*(0.08 + 2*0.02))
      //      = 2.5 + (0.1 - 2*0.12) = 2.5 + (0.1 - 0.24) = 2.36
      const result = calculateNextReview(entry, 3);
      expect(result.newEaseFactor).toBeCloseTo(2.36, 5);
    });
  });

  describe('mastery', () => {
    it('marks mastered when interval >= 21', () => {
      const entry = makeEntry({ repetitions: 4, interval: 10, easeFactor: 2.5 });
      const result = calculateNextReview(entry, 5);
      // interval = round(10 * 2.6) = 26
      expect(result.newInterval).toBeGreaterThanOrEqual(21);
      expect(result.mastered).toBe(true);
    });

    it('does not mark mastered when interval < 21', () => {
      const entry = makeEntry({ repetitions: 0 });
      const result = calculateNextReview(entry, 4);
      expect(result.newInterval).toBe(1);
      expect(result.mastered).toBe(false);
    });

    it('marks mastered at exactly 21 days', () => {
      // We need interval * easeFactor to round to exactly 21
      const entry = makeEntry({ repetitions: 2, interval: 8, easeFactor: 2.625 });
      const result = calculateNextReview(entry, 4);
      expect(result.newInterval).toBe(21);
      expect(result.mastered).toBe(true);
    });
  });

  describe('nextReviewDate', () => {
    it('sets nextReviewDate to now + interval days', () => {
      const entry = makeEntry({ repetitions: 1, interval: 1 });
      const result = calculateNextReview(entry, 4);
      // interval = 3 days
      const expected = new Date('2024-06-15T12:00:00Z');
      expected.setDate(expected.getDate() + 3);
      expect(result.nextReviewDate.getTime()).toBe(expected.getTime());
    });

    it('sets nextReviewDate to tomorrow on failed recall', () => {
      const entry = makeEntry({ repetitions: 5, interval: 30 });
      const result = calculateNextReview(entry, 1);
      const expected = new Date('2024-06-15T12:00:00Z');
      expected.setDate(expected.getDate() + 1);
      expect(result.nextReviewDate.getTime()).toBe(expected.getTime());
    });
  });

  describe('quality clamping', () => {
    it('clamps quality below 0 to 0', () => {
      const entry = makeEntry();
      const result = calculateNextReview(entry, -5);
      expect(result.newInterval).toBe(1);
      expect(result.newRepetitions).toBe(0);
    });

    it('clamps quality above 5 to 5', () => {
      const entry = makeEntry();
      const result = calculateNextReview(entry, 10);
      expect(result.newRepetitions).toBe(1);
    });
  });
});

describe('calculateNextReviewBinary', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('maps recalled=true to quality 4', () => {
    const entry = makeEntry({ easeFactor: 2.5 });
    const result = calculateNextReviewBinary(entry, true);
    const direct = calculateNextReview(entry, 4);
    expect(result.newInterval).toBe(direct.newInterval);
    expect(result.newEaseFactor).toBe(direct.newEaseFactor);
    expect(result.newRepetitions).toBe(direct.newRepetitions);
    expect(result.mastered).toBe(direct.mastered);
  });

  it('maps recalled=false to quality 1', () => {
    const entry = makeEntry({ repetitions: 3, interval: 10 });
    const result = calculateNextReviewBinary(entry, false);
    const direct = calculateNextReview(entry, 1);
    expect(result.newInterval).toBe(direct.newInterval);
    expect(result.newEaseFactor).toBe(direct.newEaseFactor);
    expect(result.newRepetitions).toBe(direct.newRepetitions);
    expect(result.mastered).toBe(direct.mastered);
  });

  it('successful binary recall advances repetitions', () => {
    const entry = makeEntry({ repetitions: 0 });
    const result = calculateNextReviewBinary(entry, true);
    expect(result.newRepetitions).toBe(1);
    expect(result.newInterval).toBe(1);
  });

  it('failed binary recall resets repetitions', () => {
    const entry = makeEntry({ repetitions: 5, interval: 30 });
    const result = calculateNextReviewBinary(entry, false);
    expect(result.newRepetitions).toBe(0);
    expect(result.newInterval).toBe(1);
  });
});
