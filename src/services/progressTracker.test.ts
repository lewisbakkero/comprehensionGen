import 'fake-indexeddb/auto';
import { deleteDB } from 'idb';
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDBConnection, addProgressRecord } from '../db/store';
import type { ProgressRecord } from '../types';
import {
  recordPassageCompletion,
  getCompletedCount,
  getCurrentStreak,
  getCompletionsAtDifficulty,
  shouldSuggestLevelUp,
} from './progressTracker';

beforeEach(async () => {
  await resetDBConnection();
  await deleteDB('dyslexia-comprehension-tool');
});

function makeRecord(overrides: Partial<ProgressRecord> = {}): ProgressRecord {
  return {
    id: crypto.randomUUID(),
    passageId: 'p1',
    date: '2024-06-15',
    difficulty: 1,
    questionsTotal: 5,
    questionsCorrect: 3,
    questionsPartial: 1,
    completedAt: new Date('2024-06-15T12:00:00Z'),
    ...overrides,
  };
}

describe('ProgressTracker', () => {
  describe('recordPassageCompletion', () => {
    it('should record a completion and increment count', async () => {
      await recordPassageCompletion('p1', 1, 5, 3, 1);
      const count = await getCompletedCount();
      expect(count).toBe(1);
    });

    it('should record multiple completions', async () => {
      await recordPassageCompletion('p1', 1, 5, 3, 1);
      await recordPassageCompletion('p2', 2, 4, 2, 1);
      await recordPassageCompletion('p3', 1, 6, 4, 0);
      const count = await getCompletedCount();
      expect(count).toBe(3);
    });
  });

  describe('getCompletedCount', () => {
    it('should return 0 when no completions exist', async () => {
      const count = await getCompletedCount();
      expect(count).toBe(0);
    });
  });

  describe('getCurrentStreak', () => {
    it('should return 0 when no completions exist', async () => {
      const streak = await getCurrentStreak('2024-06-15');
      expect(streak).toBe(0);
    });

    it('should return 0 if no completion today', async () => {
      await addProgressRecord(makeRecord({ date: '2024-06-14' }));
      const streak = await getCurrentStreak('2024-06-16');
      expect(streak).toBe(0);
    });

    it('should return 1 if only today has a completion', async () => {
      await addProgressRecord(makeRecord({ date: '2024-06-15' }));
      const streak = await getCurrentStreak('2024-06-15');
      expect(streak).toBe(1);
    });

    it('should count consecutive days ending at today', async () => {
      await addProgressRecord(makeRecord({ id: 'r1', date: '2024-06-13' }));
      await addProgressRecord(makeRecord({ id: 'r2', date: '2024-06-14' }));
      await addProgressRecord(makeRecord({ id: 'r3', date: '2024-06-15' }));
      const streak = await getCurrentStreak('2024-06-15');
      expect(streak).toBe(3);
    });

    it('should break streak on a gap day', async () => {
      await addProgressRecord(makeRecord({ id: 'r1', date: '2024-06-12' }));
      // Skip June 13
      await addProgressRecord(makeRecord({ id: 'r2', date: '2024-06-14' }));
      await addProgressRecord(makeRecord({ id: 'r3', date: '2024-06-15' }));
      const streak = await getCurrentStreak('2024-06-15');
      expect(streak).toBe(2);
    });

    it('should count multiple completions on same day as one day', async () => {
      await addProgressRecord(makeRecord({ id: 'r1', date: '2024-06-15' }));
      await addProgressRecord(makeRecord({ id: 'r2', date: '2024-06-15' }));
      const streak = await getCurrentStreak('2024-06-15');
      expect(streak).toBe(1);
    });
  });

  describe('getCompletionsAtDifficulty', () => {
    it('should return 0 when no completions exist', async () => {
      const count = await getCompletionsAtDifficulty(1);
      expect(count).toBe(0);
    });

    it('should count only completions at the specified difficulty', async () => {
      await addProgressRecord(makeRecord({ id: 'r1', difficulty: 1 }));
      await addProgressRecord(makeRecord({ id: 'r2', difficulty: 2 }));
      await addProgressRecord(makeRecord({ id: 'r3', difficulty: 1 }));
      await addProgressRecord(makeRecord({ id: 'r4', difficulty: 3 }));

      expect(await getCompletionsAtDifficulty(1)).toBe(2);
      expect(await getCompletionsAtDifficulty(2)).toBe(1);
      expect(await getCompletionsAtDifficulty(3)).toBe(1);
    });
  });

  describe('shouldSuggestLevelUp', () => {
    it('should return false with fewer than 5 completions at level', async () => {
      for (let i = 0; i < 4; i++) {
        await addProgressRecord(
          makeRecord({ id: `r${i}`, difficulty: 1, questionsTotal: 5, questionsCorrect: 4, questionsPartial: 1 }),
        );
      }
      expect(await shouldSuggestLevelUp(1)).toBe(false);
    });

    it('should return true with 5 completions and >=60% correct/partial', async () => {
      for (let i = 0; i < 5; i++) {
        await addProgressRecord(
          makeRecord({ id: `r${i}`, difficulty: 1, questionsTotal: 5, questionsCorrect: 2, questionsPartial: 1 }),
        );
      }
      expect(await shouldSuggestLevelUp(1)).toBe(true);
    });

    it('should return false with 5 completions but <60% correct/partial', async () => {
      for (let i = 0; i < 5; i++) {
        await addProgressRecord(
          makeRecord({ id: `r${i}`, difficulty: 1, questionsTotal: 5, questionsCorrect: 1, questionsPartial: 1 }),
        );
      }
      expect(await shouldSuggestLevelUp(1)).toBe(false);
    });

    it('should only consider completions at the specified level', async () => {
      for (let i = 0; i < 5; i++) {
        await addProgressRecord(
          makeRecord({ id: `a${i}`, difficulty: 2, questionsTotal: 5, questionsCorrect: 4, questionsPartial: 1 }),
        );
      }
      for (let i = 0; i < 3; i++) {
        await addProgressRecord(
          makeRecord({ id: `b${i}`, difficulty: 1, questionsTotal: 5, questionsCorrect: 4, questionsPartial: 1 }),
        );
      }
      expect(await shouldSuggestLevelUp(2)).toBe(true);
      expect(await shouldSuggestLevelUp(1)).toBe(false);
    });

    it('should return true at exactly 60% threshold', async () => {
      for (let i = 0; i < 5; i++) {
        await addProgressRecord(
          makeRecord({ id: `r${i}`, difficulty: 1, questionsTotal: 5, questionsCorrect: 3, questionsPartial: 0 }),
        );
      }
      expect(await shouldSuggestLevelUp(1)).toBe(true);
    });

    it('should return false when all questions have 0 total', async () => {
      for (let i = 0; i < 5; i++) {
        await addProgressRecord(
          makeRecord({ id: `r${i}`, difficulty: 1, questionsTotal: 0, questionsCorrect: 0, questionsPartial: 0 }),
        );
      }
      expect(await shouldSuggestLevelUp(1)).toBe(false);
    });
  });
});
