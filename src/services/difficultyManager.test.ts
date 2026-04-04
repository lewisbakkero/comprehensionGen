import { describe, it, expect, beforeEach } from 'vitest';
import type { ProgressRecord } from '../types';
import {
  getCurrentLevel,
  setLevel,
  resetLevel,
  suggestLevelChange,
} from './difficultyManager';

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

beforeEach(() => {
  resetLevel();
});

describe('DifficultyManager', () => {
  describe('getCurrentLevel / setLevel / resetLevel', () => {
    it('should default to level 1', () => {
      expect(getCurrentLevel()).toBe(1);
    });

    it('should allow manual override to any valid level', () => {
      setLevel(2);
      expect(getCurrentLevel()).toBe(2);
      setLevel(3);
      expect(getCurrentLevel()).toBe(3);
    });

    it('should reset to level 1', () => {
      setLevel(3);
      resetLevel();
      expect(getCurrentLevel()).toBe(1);
    });
  });

  describe('suggestLevelChange — level-up', () => {
    it('should suggest up after 5 completions with >=60% correct/partial', () => {
      const records = Array.from({ length: 5 }, (_, i) =>
        makeRecord({ id: `r${i}`, difficulty: 1, questionsTotal: 5, questionsCorrect: 2, questionsPartial: 1 }),
      );
      const result = suggestLevelChange(records);
      expect(result).not.toBeNull();
      expect(result!.direction).toBe('up');
      expect(result!.message).toContain('challenging');
    });

    it('should not suggest up with fewer than 5 completions', () => {
      const records = Array.from({ length: 4 }, (_, i) =>
        makeRecord({ id: `r${i}`, difficulty: 1, questionsTotal: 5, questionsCorrect: 5, questionsPartial: 0 }),
      );
      expect(suggestLevelChange(records)).toBeNull();
    });

    it('should not suggest up when <60% correct/partial', () => {
      const records = Array.from({ length: 5 }, (_, i) =>
        makeRecord({ id: `r${i}`, difficulty: 1, questionsTotal: 5, questionsCorrect: 1, questionsPartial: 1 }),
      );
      expect(suggestLevelChange(records)).toBeNull();
    });

    it('should suggest up at exactly 60% threshold', () => {
      const records = Array.from({ length: 5 }, (_, i) =>
        makeRecord({ id: `r${i}`, difficulty: 1, questionsTotal: 5, questionsCorrect: 3, questionsPartial: 0 }),
      );
      const result = suggestLevelChange(records);
      expect(result).not.toBeNull();
      expect(result!.direction).toBe('up');
    });

    it('should not suggest up when already at level 3', () => {
      setLevel(3);
      const records = Array.from({ length: 5 }, (_, i) =>
        makeRecord({ id: `r${i}`, difficulty: 3, questionsTotal: 5, questionsCorrect: 5, questionsPartial: 0 }),
      );
      expect(suggestLevelChange(records)).toBeNull();
    });

    it('should only consider records at the current level', () => {
      const records = [
        ...Array.from({ length: 5 }, (_, i) =>
          makeRecord({ id: `a${i}`, difficulty: 2, questionsTotal: 5, questionsCorrect: 5, questionsPartial: 0 }),
        ),
        ...Array.from({ length: 3 }, (_, i) =>
          makeRecord({ id: `b${i}`, difficulty: 1, questionsTotal: 5, questionsCorrect: 5, questionsPartial: 0 }),
        ),
      ];
      // Current level is 1, only 3 records at level 1
      expect(suggestLevelChange(records)).toBeNull();
    });
  });

  describe('suggestLevelChange — level-down', () => {
    it('should suggest down when <30% correct over last 3 passages at level > 1', () => {
      setLevel(2);
      const records = Array.from({ length: 3 }, (_, i) =>
        makeRecord({ id: `r${i}`, difficulty: 2, questionsTotal: 5, questionsCorrect: 1, questionsPartial: 0 }),
      );
      const result = suggestLevelChange(records);
      expect(result).not.toBeNull();
      expect(result!.direction).toBe('down');
      expect(result!.message).toContain('easier level');
    });

    it('should not suggest down at level 1', () => {
      setLevel(1);
      const records = Array.from({ length: 3 }, (_, i) =>
        makeRecord({ id: `r${i}`, difficulty: 1, questionsTotal: 5, questionsCorrect: 0, questionsPartial: 0 }),
      );
      expect(suggestLevelChange(records)).toBeNull();
    });

    it('should not suggest down with fewer than 3 passages at current level', () => {
      setLevel(2);
      const records = Array.from({ length: 2 }, (_, i) =>
        makeRecord({ id: `r${i}`, difficulty: 2, questionsTotal: 5, questionsCorrect: 0, questionsPartial: 0 }),
      );
      expect(suggestLevelChange(records)).toBeNull();
    });

    it('should not suggest down when >=30% correct over last 3', () => {
      setLevel(2);
      const records = Array.from({ length: 3 }, (_, i) =>
        makeRecord({ id: `r${i}`, difficulty: 2, questionsTotal: 5, questionsCorrect: 2, questionsPartial: 0 }),
      );
      // 6/15 = 40% correct, above 30%
      expect(suggestLevelChange(records)).toBeNull();
    });

    it('should only look at last 3 passages for down suggestion', () => {
      setLevel(2);
      const records = [
        // Older records with good performance
        ...Array.from({ length: 3 }, (_, i) =>
          makeRecord({ id: `good${i}`, difficulty: 2, questionsTotal: 5, questionsCorrect: 5, questionsPartial: 0 }),
        ),
        // Last 3 with poor performance
        ...Array.from({ length: 3 }, (_, i) =>
          makeRecord({ id: `bad${i}`, difficulty: 2, questionsTotal: 5, questionsCorrect: 0, questionsPartial: 0 }),
        ),
      ];
      const result = suggestLevelChange(records);
      expect(result).not.toBeNull();
      expect(result!.direction).toBe('down');
    });

    it('should suggest down at level 3', () => {
      setLevel(3);
      const records = Array.from({ length: 3 }, (_, i) =>
        makeRecord({ id: `r${i}`, difficulty: 3, questionsTotal: 5, questionsCorrect: 1, questionsPartial: 0 }),
      );
      const result = suggestLevelChange(records);
      expect(result).not.toBeNull();
      expect(result!.direction).toBe('down');
    });
  });

  describe('suggestLevelChange — no suggestion', () => {
    it('should return null with empty records', () => {
      expect(suggestLevelChange([])).toBeNull();
    });

    it('should return null when performance is moderate', () => {
      const records = Array.from({ length: 5 }, (_, i) =>
        makeRecord({ id: `r${i}`, difficulty: 1, questionsTotal: 5, questionsCorrect: 2, questionsPartial: 0 }),
      );
      // 10/25 = 40%, below 60% for up, but not checking down at level 1
      expect(suggestLevelChange(records)).toBeNull();
    });

    it('should return null when all questionsTotal are 0', () => {
      const records = Array.from({ length: 5 }, (_, i) =>
        makeRecord({ id: `r${i}`, difficulty: 1, questionsTotal: 0, questionsCorrect: 0, questionsPartial: 0 }),
      );
      expect(suggestLevelChange(records)).toBeNull();
    });
  });

  describe('suggestLevelChange — encouraging messages', () => {
    it('should use gentle encouraging language for level-up', () => {
      const records = Array.from({ length: 5 }, (_, i) =>
        makeRecord({ id: `r${i}`, difficulty: 1, questionsTotal: 5, questionsCorrect: 4, questionsPartial: 1 }),
      );
      const result = suggestLevelChange(records);
      expect(result!.message).toBe(
        "You're doing really well! Would you like to try something a bit more challenging?",
      );
    });

    it('should use gentle encouraging language for level-down', () => {
      setLevel(2);
      const records = Array.from({ length: 3 }, (_, i) =>
        makeRecord({ id: `r${i}`, difficulty: 2, questionsTotal: 5, questionsCorrect: 0, questionsPartial: 0 }),
      );
      const result = suggestLevelChange(records);
      expect(result!.message).toBe(
        "These passages seem quite tricky. Would you like to go back to an easier level for a while?",
      );
    });
  });
});
