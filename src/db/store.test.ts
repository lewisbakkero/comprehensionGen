import 'fake-indexeddb/auto';
import { deleteDB } from 'idb';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDB,
  resetDBConnection,
  addPassage,
  getPassage,
  getAllPassages,
  updatePassage,
  deletePassage,
  getPassagesByGenre,
  getPassagesByDifficulty,
  addWordBankEntry,
  getWordBankEntry,
  getAllWordBankEntries,
  updateWordBankEntry,
  deleteWordBankEntry,
  getDueWordBankEntries,
  getMasteredWordCount,
  addProgressRecord,
  getProgressRecord,
  getAllProgressRecords,
  getProgressByDate,
  getProgressByPassageId,
  deleteProgressRecord,
  getPreference,
  setPreference,
  deletePreference,
  getAllPreferences,
} from './store';
import type { PassageRecord, WordBankEntry, ProgressRecord } from '../types';

function makePassage(overrides: Partial<PassageRecord> = {}): PassageRecord {
  return {
    id: crypto.randomUUID(),
    text: 'A test passage.',
    genre: 'fiction',
    difficulty: 1,
    theme: 'adventure',
    paragraphs: ['A test passage.'],
    taggedWords: [],
    questions: [],
    createdAt: new Date(),
    completed: false,
    questionsAnswered: 0,
    questionsCorrect: 0,
    ...overrides,
  };
}

function makeWordBankEntry(overrides: Partial<WordBankEntry> = {}): WordBankEntry {
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

function makeProgressRecord(overrides: Partial<ProgressRecord> = {}): ProgressRecord {
  return {
    id: crypto.randomUUID(),
    passageId: 'p-1',
    date: new Date().toISOString().slice(0, 10),
    difficulty: 1,
    questionsTotal: 5,
    questionsCorrect: 3,
    questionsPartial: 1,
    completedAt: new Date(),
    ...overrides,
  };
}

beforeEach(async () => {
  await resetDBConnection();
  await deleteDB('dyslexia-comprehension-tool');
});

describe('Database initialisation', () => {
  it('should open the database and create all object stores', async () => {
    const db = await getDB();
    expect(db.objectStoreNames.contains('passages')).toBe(true);
    expect(db.objectStoreNames.contains('wordBank')).toBe(true);
    expect(db.objectStoreNames.contains('progress')).toBe(true);
    expect(db.objectStoreNames.contains('preferences')).toBe(true);
  });
});

describe('Passages CRUD', () => {
  it('should add and retrieve a passage', async () => {
    const passage = makePassage();
    await addPassage(passage);
    const retrieved = await getPassage(passage.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.text).toBe(passage.text);
    expect(retrieved!.genre).toBe('fiction');
  });

  it('should return all passages', async () => {
    await addPassage(makePassage({ id: 'a' }));
    await addPassage(makePassage({ id: 'b', genre: 'poetry' }));
    const all = await getAllPassages();
    expect(all).toHaveLength(2);
  });

  it('should update a passage', async () => {
    const passage = makePassage();
    await addPassage(passage);
    await updatePassage({ ...passage, completed: true });
    const updated = await getPassage(passage.id);
    expect(updated!.completed).toBe(true);
  });

  it('should delete a passage', async () => {
    const passage = makePassage();
    await addPassage(passage);
    await deletePassage(passage.id);
    const result = await getPassage(passage.id);
    expect(result).toBeUndefined();
  });

  it('should query passages by genre', async () => {
    await addPassage(makePassage({ id: '1', genre: 'fiction' }));
    await addPassage(makePassage({ id: '2', genre: 'poetry' }));
    await addPassage(makePassage({ id: '3', genre: 'fiction' }));
    const fiction = await getPassagesByGenre('fiction');
    expect(fiction).toHaveLength(2);
  });

  it('should query passages by difficulty', async () => {
    await addPassage(makePassage({ id: '1', difficulty: 1 }));
    await addPassage(makePassage({ id: '2', difficulty: 2 }));
    const level1 = await getPassagesByDifficulty(1);
    expect(level1).toHaveLength(1);
  });
});

describe('WordBank CRUD', () => {
  it('should add and retrieve a word bank entry', async () => {
    const entry = makeWordBankEntry();
    await addWordBankEntry(entry);
    const retrieved = await getWordBankEntry(entry.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.word).toBe('ancient');
  });

  it('should return all entries sorted by nextReviewDate', async () => {
    const past = new Date('2024-01-01');
    const future = new Date('2099-01-01');
    await addWordBankEntry(makeWordBankEntry({ id: 'w1', nextReviewDate: future }));
    await addWordBankEntry(makeWordBankEntry({ id: 'w2', nextReviewDate: past }));
    const all = await getAllWordBankEntries();
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe('w2'); // past date first
  });

  it('should update a word bank entry', async () => {
    const entry = makeWordBankEntry();
    await addWordBankEntry(entry);
    await updateWordBankEntry({ ...entry, mastered: true });
    const updated = await getWordBankEntry(entry.id);
    expect(updated!.mastered).toBe(true);
  });

  it('should delete a word bank entry', async () => {
    const entry = makeWordBankEntry();
    await addWordBankEntry(entry);
    await deleteWordBankEntry(entry.id);
    const result = await getWordBankEntry(entry.id);
    expect(result).toBeUndefined();
  });

  it('should return due entries (nextReviewDate <= now)', async () => {
    const past = new Date('2020-01-01');
    const future = new Date('2099-01-01');
    await addWordBankEntry(makeWordBankEntry({ id: 'w1', nextReviewDate: past }));
    await addWordBankEntry(makeWordBankEntry({ id: 'w2', nextReviewDate: future }));
    const due = await getDueWordBankEntries();
    expect(due).toHaveLength(1);
    expect(due[0].id).toBe('w1');
  });

  it('should count mastered words', async () => {
    await addWordBankEntry(makeWordBankEntry({ id: 'w1', mastered: true }));
    await addWordBankEntry(makeWordBankEntry({ id: 'w2', mastered: false }));
    await addWordBankEntry(makeWordBankEntry({ id: 'w3', mastered: true }));
    const count = await getMasteredWordCount();
    expect(count).toBe(2);
  });
});

describe('Progress CRUD', () => {
  it('should add and retrieve a progress record', async () => {
    const record = makeProgressRecord();
    await addProgressRecord(record);
    const retrieved = await getProgressRecord(record.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.passageId).toBe('p-1');
  });

  it('should return all progress records', async () => {
    await addProgressRecord(makeProgressRecord({ id: 'r1' }));
    await addProgressRecord(makeProgressRecord({ id: 'r2' }));
    const all = await getAllProgressRecords();
    expect(all).toHaveLength(2);
  });

  it('should query by date', async () => {
    await addProgressRecord(makeProgressRecord({ id: 'r1', date: '2024-06-01' }));
    await addProgressRecord(makeProgressRecord({ id: 'r2', date: '2024-06-02' }));
    const results = await getProgressByDate('2024-06-01');
    expect(results).toHaveLength(1);
  });

  it('should query by passageId', async () => {
    await addProgressRecord(makeProgressRecord({ id: 'r1', passageId: 'p-1' }));
    await addProgressRecord(makeProgressRecord({ id: 'r2', passageId: 'p-2' }));
    const results = await getProgressByPassageId('p-1');
    expect(results).toHaveLength(1);
  });

  it('should delete a progress record', async () => {
    const record = makeProgressRecord();
    await addProgressRecord(record);
    await deleteProgressRecord(record.id);
    const result = await getProgressRecord(record.id);
    expect(result).toBeUndefined();
  });
});

describe('Preferences CRUD', () => {
  it('should set and get a preference', async () => {
    await setPreference('fontSize', 22);
    const value = await getPreference<number>('fontSize');
    expect(value).toBe(22);
  });

  it('should overwrite an existing preference', async () => {
    await setPreference('fontSize', 18);
    await setPreference('fontSize', 24);
    const value = await getPreference<number>('fontSize');
    expect(value).toBe(24);
  });

  it('should return undefined for missing preference', async () => {
    const value = await getPreference<string>('nonexistent');
    expect(value).toBeUndefined();
  });

  it('should delete a preference', async () => {
    await setPreference('bg', '#FFF8E7');
    await deletePreference('bg');
    const value = await getPreference<string>('bg');
    expect(value).toBeUndefined();
  });

  it('should return all preferences as a record', async () => {
    await setPreference('fontSize', 18);
    await setPreference('bg', '#FFF8E7');
    const all = await getAllPreferences();
    expect(all).toEqual({ fontSize: 18, bg: '#FFF8E7' });
  });
});
