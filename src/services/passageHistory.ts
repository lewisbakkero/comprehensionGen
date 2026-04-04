import type { PassageRecord } from '../types';
import {
  addPassage,
  getAllPassages as dbGetAllPassages,
  getPassage,
} from '../db/store';

/**
 * Saves a passage to IndexedDB for later retrieval.
 * Requirements: 1.7, 10.5
 */
export async function savePassage(passage: PassageRecord): Promise<void> {
  await addPassage(passage);
}

/**
 * Returns all stored passages.
 * Requirements: 10.5
 */
export async function getAllPassages(): Promise<PassageRecord[]> {
  return dbGetAllPassages();
}

/**
 * Retrieves a specific passage by its id.
 * Requirements: 10.5
 */
export async function getPassageById(id: string): Promise<PassageRecord | undefined> {
  return getPassage(id);
}
