import 'fake-indexeddb/auto';
import { deleteDB } from 'idb';
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDBConnection } from '../db/store';
import type { WordBankEntry } from '../types';
import {
  addWord,
  getAll,
  getDueForReview,
  updateReviewResult,
  getMasteredCount,
} from './wordBankStore';

function makeEntry(overrides: Partial<WordBankEntry> = {}): WordBankEntry {
  return {
    id: crypto.randomUUID(),
    word: 'ancient',
    definition: 'very old',
    passageContext: 'The ancient castle stood tall.',
    addedDate: new Date(),
    nextReviewDate: new Date(),
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
    mastered: false,
    ...overrides,
  };
}

beforeEach(async () => {
  await resetDBConnection();
  await deleteDB('dyslexia-comprehension-tool');
});

describe('WordBankStore', () => {
  describe('addWord', () => {
    it('should add a word and make it retrievable via getAll', async () => {
      const entry = makeEntry({ word: 'marvellous' });
      await addWord(entry);
      const all = await getAll();
      expect(all).toHaveLength(1);
      expect(all[0].word).toBe('marvellous');
      expect(all[0].definition).toBe('very old');
    });

    it('should add multiple words', async () => {
      await addWord(makeEntry({ id: 'w1', word: 'ancient' }));
      await addWord(makeEntry({ id: 'w2', word: 'marvellous' }));
      await addWord(makeEntry({ id: 'w3', word: 'sufficient' }));
      const all = await getAll();
      expect(all).toHaveLength(3);
    });
  });

  describe('getAll', () => {
    it('should return entries sorted by nextReviewDate ascending', async () => {
      const past = new Date('2024-01-01');
      const mid = new Date('2024-06-01');
      const future = new Date('2099-01-01');

      await addWord(makeEntry({ id: 'w1', nextReviewDate: future }));
      await addWord(makeEntry({ id: 'w2', nextReviewDate: past }));
      await addWord(makeEntry({ id: 'w3', nextReviewDate: mid }));

      const all = await getAll();
      expect(all).toHaveLength(3);
      expect(all[0].id).toBe('w2');
      expect(all[1].id).toBe('w3');
      expect(all[2].id).toBe('w1');
    });

    it('should return empty array when no entries exist', async () => {
      const all = await getAll();
      expect(all).toEqual([]);
    });
  });

  describe('getDueForReview', () => {
    it('should return only entries with nextReviewDate <= now', async () => {
      const past = new Date('2020-01-01');
      const future = new Date('2099-01-01');

      await addWord(makeEntry({ id: 'w1', nextReviewDate: past, word: 'due' }));
      await addWord(makeEntry({ id: 'w2', nextReviewDate: future, word: 'notdue' }));

      const due = await getDueForReview();
      expect(due).toHaveLength(1);
      expect(due[0].word).toBe('due');
    });

    it('should return empty array when nothing is due', async () => {
      await addWord(makeEntry({ id: 'w1', nextReviewDate: new Date('2099-01-01') }));
      const due = await getDueForReview();
      expect(due).toEqual([]);
    });
  });

  describe('updateReviewResult', () => {
    it('should double the interval on successful recall', async () => {
      const entry = makeEntry({ id: 'w1', interval: 2, repetitions: 1 });
      await addWord(entry);

      await updateReviewResult('w1', true);

      const all = await getAll();
      const updated = all.find((e) => e.id === 'w1')!;
      expect(updated.interval).toBe(4);
      expect(updated.repetitions).toBe(2);
    });

    it('should reset interval to 1 on failed recall', async () => {
      const entry = makeEntry({ id: 'w1', interval: 8, repetitions: 3 });
      await addWord(entry);

      await updateReviewResult('w1', false);

      const all = await getAll();
      const updated = all.find((e) => e.id === 'w1')!;
      expect(updated.interval).toBe(1);
      expect(updated.repetitions).toBe(0);
    });

    it('should set mastered to true when interval >= 21', async () => {
      const entry = makeEntry({ id: 'w1', interval: 11, repetitions: 4 });
      await addWord(entry);

      await updateReviewResult('w1', true);

      const all = await getAll();
      const updated = all.find((e) => e.id === 'w1')!;
      expect(updated.interval).toBe(22);
      expect(updated.mastered).toBe(true);
    });

    it('should not set mastered when interval < 21', async () => {
      const entry = makeEntry({ id: 'w1', interval: 5, repetitions: 2 });
      await addWord(entry);

      await updateReviewResult('w1', true);

      const all = await getAll();
      const updated = all.find((e) => e.id === 'w1')!;
      expect(updated.interval).toBe(10);
      expect(updated.mastered).toBe(false);
    });

    it('should update nextReviewDate to now + interval days', async () => {
      const entry = makeEntry({ id: 'w1', interval: 3 });
      await addWord(entry);

      const before = Date.now();
      await updateReviewResult('w1', true);
      const after = Date.now();

      const all = await getAll();
      const updated = all.find((e) => e.id === 'w1')!;
      const expectedMin = before + 6 * 24 * 60 * 60 * 1000; // interval doubled to 6
      const expectedMax = after + 6 * 24 * 60 * 60 * 1000;
      expect(updated.nextReviewDate.getTime()).toBeGreaterThanOrEqual(expectedMin);
      expect(updated.nextReviewDate.getTime()).toBeLessThanOrEqual(expectedMax);
    });

    it('should throw when entry does not exist', async () => {
      await expect(updateReviewResult('nonexistent', true)).rejects.toThrow(
        'Word bank entry not found: nonexistent',
      );
    });

    it('should ensure minimum interval of 1 on successful recall from interval 0', async () => {
      const entry = makeEntry({ id: 'w1', interval: 0, repetitions: 0 });
      await addWord(entry);

      await updateReviewResult('w1', true);

      const all = await getAll();
      const updated = all.find((e) => e.id === 'w1')!;
      expect(updated.interval).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getMasteredCount', () => {
    it('should return count of mastered entries', async () => {
      await addWord(makeEntry({ id: 'w1', mastered: true }));
      await addWord(makeEntry({ id: 'w2', mastered: false }));
      await addWord(makeEntry({ id: 'w3', mastered: true }));

      const count = await getMasteredCount();
      expect(count).toBe(2);
    });

    it('should return 0 when no entries are mastered', async () => {
      await addWord(makeEntry({ id: 'w1', mastered: false }));
      const count = await getMasteredCount();
      expect(count).toBe(0);
    });

    it('should return 0 when word bank is empty', async () => {
      const count = await getMasteredCount();
      expect(count).toBe(0);
    });
  });
});
