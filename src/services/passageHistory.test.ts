import 'fake-indexeddb/auto';
import { deleteDB } from 'idb';
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDBConnection } from '../db/store';
import type { PassageRecord } from '../types';
import { savePassage, getAllPassages, getPassageById } from './passageHistory';

function makePassage(overrides: Partial<PassageRecord> = {}): PassageRecord {
  return {
    id: crypto.randomUUID(),
    text: 'The ancient castle stood on the hill.',
    genre: 'fiction',
    difficulty: 1,
    theme: 'adventure',
    paragraphs: ['The ancient castle stood on the hill.'],
    taggedWords: [],
    questions: [],
    createdAt: new Date(),
    completed: false,
    questionsAnswered: 0,
    questionsCorrect: 0,
    ...overrides,
  };
}

beforeEach(async () => {
  await resetDBConnection();
  await deleteDB('dyslexia-comprehension-tool');
});

describe('passageHistory', () => {
  describe('savePassage', () => {
    it('should store a passage that is then retrievable', async () => {
      const passage = makePassage({ id: 'p1' });
      await savePassage(passage);
      const retrieved = await getPassageById('p1');
      expect(retrieved).toBeDefined();
      expect(retrieved!.text).toBe(passage.text);
    });
  });

  describe('getAllPassages', () => {
    it('should return all stored passages', async () => {
      await savePassage(makePassage({ id: 'p1' }));
      await savePassage(makePassage({ id: 'p2', genre: 'poetry' }));
      await savePassage(makePassage({ id: 'p3', genre: 'non-fiction' }));
      const all = await getAllPassages();
      expect(all).toHaveLength(3);
    });

    it('should return empty array when no passages exist', async () => {
      const all = await getAllPassages();
      expect(all).toEqual([]);
    });
  });

  describe('getPassageById', () => {
    it('should return the correct passage by id', async () => {
      await savePassage(makePassage({ id: 'p1', theme: 'space' }));
      await savePassage(makePassage({ id: 'p2', theme: 'mystery' }));
      const result = await getPassageById('p2');
      expect(result).toBeDefined();
      expect(result!.theme).toBe('mystery');
    });

    it('should return undefined for a non-existent id', async () => {
      const result = await getPassageById('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('passage history persistence', () => {
    it('should retain passages after storing additional ones', async () => {
      await savePassage(makePassage({ id: 'p1' }));
      await savePassage(makePassage({ id: 'p2' }));

      // Store more passages
      await savePassage(makePassage({ id: 'p3' }));
      await savePassage(makePassage({ id: 'p4' }));

      // Original passages still retrievable
      const p1 = await getPassageById('p1');
      const p2 = await getPassageById('p2');
      expect(p1).toBeDefined();
      expect(p2).toBeDefined();

      const all = await getAllPassages();
      expect(all).toHaveLength(4);
    });

    it('should preserve all passage fields through save and retrieve', async () => {
      const passage = makePassage({
        id: 'full-test',
        text: 'A detailed passage about space.',
        genre: 'non-fiction',
        difficulty: 2,
        theme: 'space',
        paragraphs: ['A detailed passage about space.'],
        taggedWords: [
          { word: 'ancient', definition: 'very old', passageContext: 'The ancient ruins.', isCurriculumWord: true },
        ],
        completed: true,
        questionsAnswered: 5,
        questionsCorrect: 3,
      });

      await savePassage(passage);
      const retrieved = await getPassageById('full-test');

      expect(retrieved).toBeDefined();
      expect(retrieved!.genre).toBe('non-fiction');
      expect(retrieved!.difficulty).toBe(2);
      expect(retrieved!.theme).toBe('space');
      expect(retrieved!.taggedWords).toHaveLength(1);
      expect(retrieved!.taggedWords[0].word).toBe('ancient');
      expect(retrieved!.completed).toBe(true);
      expect(retrieved!.questionsAnswered).toBe(5);
      expect(retrieved!.questionsCorrect).toBe(3);
    });
  });
});
