import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import type {
  PassageRecord,
  WordBankEntry,
  ProgressRecord,
} from '../types';

// --- IndexedDB Schema Definition ---

interface DyslexiaDB extends DBSchema {
  passages: {
    key: string;
    value: PassageRecord;
    indexes: {
      genre: string;
      difficulty: number;
      createdAt: Date;
    };
  };
  wordBank: {
    key: string;
    value: WordBankEntry;
    indexes: {
      word: string;
      nextReviewDate: Date;
      mastered: number;
    };
  };
  progress: {
    key: string;
    value: ProgressRecord;
    indexes: {
      date: string;
      passageId: string;
    };
  };
  preferences: {
    key: string;
    value: { key: string; value: unknown };
  };
}

const DB_NAME = 'dyslexia-comprehension-tool';
const DB_VERSION = 1;

// --- Database Initialisation ---

let dbPromise: Promise<IDBPDatabase<DyslexiaDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<DyslexiaDB>> {
  if (!dbPromise) {
    dbPromise = openDB<DyslexiaDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // passages store
        const passageStore = db.createObjectStore('passages', { keyPath: 'id', autoIncrement: true });
        passageStore.createIndex('genre', 'genre');
        passageStore.createIndex('difficulty', 'difficulty');
        passageStore.createIndex('createdAt', 'createdAt');

        // wordBank store
        const wordBankStore = db.createObjectStore('wordBank', { keyPath: 'id', autoIncrement: true });
        wordBankStore.createIndex('word', 'word');
        wordBankStore.createIndex('nextReviewDate', 'nextReviewDate');
        wordBankStore.createIndex('mastered', 'mastered');

        // progress store
        const progressStore = db.createObjectStore('progress', { keyPath: 'id', autoIncrement: true });
        progressStore.createIndex('date', 'date');
        progressStore.createIndex('passageId', 'passageId');

        // preferences store (key-value)
        db.createObjectStore('preferences', { keyPath: 'key' });
      },
    });
  }
  return dbPromise;
}

// --- Error Helpers ---

function isStorageFullError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'QuotaExceededError';
  }
  return false;
}

export class StorageFullError extends Error {
  constructor() {
    super('Storage is full. Try clearing old passages you no longer need.');
    this.name = 'StorageFullError';
  }
}

export class ReadFailureError extends Error {
  constructor(store: string) {
    super(`Could not load data from ${store}. Showing empty state.`);
    this.name = 'ReadFailureError';
  }
}

export class WriteFailureError extends Error {
  constructor(store: string) {
    super(`Could not save to ${store}. Your progress might not have been saved this time.`);
    this.name = 'WriteFailureError';
  }
}

// --- Generic write with retry-once + storage-full detection ---

async function writeWithRetry<T>(
  storeName: string,
  operation: () => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (isStorageFullError(error)) {
        throw new StorageFullError();
      }
      if (attempt === 1) {
        throw new WriteFailureError(storeName);
      }
    }
  }
  // Unreachable, but satisfies TypeScript
  throw new WriteFailureError(storeName);
}

// --- Generic read with graceful degradation ---

async function readSafely<T>(
  storeName: string,
  operation: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await operation();
  } catch {
    console.warn(`Read failure on "${storeName}", returning fallback.`);
    return fallback;
  }
}

// --- Passages CRUD ---

export async function addPassage(passage: PassageRecord): Promise<string> {
  return writeWithRetry('passages', async () => {
    const db = await getDB();
    const key = await db.add('passages', passage);
    return String(key);
  });
}

export async function getPassage(id: string): Promise<PassageRecord | undefined> {
  return readSafely('passages', async () => {
    const db = await getDB();
    return db.get('passages', id);
  }, undefined);
}

export async function getAllPassages(): Promise<PassageRecord[]> {
  return readSafely('passages', async () => {
    const db = await getDB();
    return db.getAll('passages');
  }, []);
}

export async function updatePassage(passage: PassageRecord): Promise<void> {
  return writeWithRetry('passages', async () => {
    const db = await getDB();
    await db.put('passages', passage);
  });
}

export async function deletePassage(id: string): Promise<void> {
  return writeWithRetry('passages', async () => {
    const db = await getDB();
    await db.delete('passages', id);
  });
}

export async function getPassagesByGenre(genre: string): Promise<PassageRecord[]> {
  return readSafely('passages', async () => {
    const db = await getDB();
    return db.getAllFromIndex('passages', 'genre', genre);
  }, []);
}

export async function getPassagesByDifficulty(difficulty: number): Promise<PassageRecord[]> {
  return readSafely('passages', async () => {
    const db = await getDB();
    return db.getAllFromIndex('passages', 'difficulty', difficulty);
  }, []);
}

// --- WordBank CRUD ---

export async function addWordBankEntry(entry: WordBankEntry): Promise<string> {
  return writeWithRetry('wordBank', async () => {
    const db = await getDB();
    const key = await db.add('wordBank', entry);
    return String(key);
  });
}

export async function getWordBankEntry(id: string): Promise<WordBankEntry | undefined> {
  return readSafely('wordBank', async () => {
    const db = await getDB();
    return db.get('wordBank', id);
  }, undefined);
}

export async function getAllWordBankEntries(): Promise<WordBankEntry[]> {
  return readSafely('wordBank', async () => {
    const db = await getDB();
    return db.getAllFromIndex('wordBank', 'nextReviewDate');
  }, []);
}

export async function updateWordBankEntry(entry: WordBankEntry): Promise<void> {
  return writeWithRetry('wordBank', async () => {
    const db = await getDB();
    await db.put('wordBank', entry);
  });
}

export async function deleteWordBankEntry(id: string): Promise<void> {
  return writeWithRetry('wordBank', async () => {
    const db = await getDB();
    await db.delete('wordBank', id);
  });
}

export async function getDueWordBankEntries(): Promise<WordBankEntry[]> {
  return readSafely('wordBank', async () => {
    const db = await getDB();
    const all = await db.getAllFromIndex('wordBank', 'nextReviewDate');
    const now = new Date();
    return all.filter((entry) => entry.nextReviewDate <= now);
  }, []);
}

export async function getMasteredWordCount(): Promise<number> {
  return readSafely('wordBank', async () => {
    const db = await getDB();
    const all = await db.getAll('wordBank');
    return all.filter((entry) => entry.mastered).length;
  }, 0);
}

// --- Progress CRUD ---

export async function addProgressRecord(record: ProgressRecord): Promise<string> {
  return writeWithRetry('progress', async () => {
    const db = await getDB();
    const key = await db.add('progress', record);
    return String(key);
  });
}

export async function getProgressRecord(id: string): Promise<ProgressRecord | undefined> {
  return readSafely('progress', async () => {
    const db = await getDB();
    return db.get('progress', id);
  }, undefined);
}

export async function getAllProgressRecords(): Promise<ProgressRecord[]> {
  return readSafely('progress', async () => {
    const db = await getDB();
    return db.getAll('progress');
  }, []);
}

export async function getProgressByDate(date: string): Promise<ProgressRecord[]> {
  return readSafely('progress', async () => {
    const db = await getDB();
    return db.getAllFromIndex('progress', 'date', date);
  }, []);
}

export async function getProgressByPassageId(passageId: string): Promise<ProgressRecord[]> {
  return readSafely('progress', async () => {
    const db = await getDB();
    return db.getAllFromIndex('progress', 'passageId', passageId);
  }, []);
}

export async function deleteProgressRecord(id: string): Promise<void> {
  return writeWithRetry('progress', async () => {
    const db = await getDB();
    await db.delete('progress', id);
  });
}

// --- Preferences CRUD ---

export async function getPreference<T>(key: string): Promise<T | undefined> {
  return readSafely('preferences', async () => {
    const db = await getDB();
    const record = await db.get('preferences', key);
    return record?.value as T | undefined;
  }, undefined);
}

export async function setPreference<T>(key: string, value: T): Promise<void> {
  return writeWithRetry('preferences', async () => {
    const db = await getDB();
    await db.put('preferences', { key, value });
  });
}

export async function deletePreference(key: string): Promise<void> {
  return writeWithRetry('preferences', async () => {
    const db = await getDB();
    await db.delete('preferences', key);
  });
}

export async function getAllPreferences(): Promise<Record<string, unknown>> {
  return readSafely('preferences', async () => {
    const db = await getDB();
    const all = await db.getAll('preferences');
    const result: Record<string, unknown> = {};
    for (const entry of all) {
      result[entry.key] = entry.value;
    }
    return result;
  }, {});
}

// --- Utility: Reset DB connection (useful for testing) ---

export async function resetDBConnection(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
  }
  dbPromise = null;
}
