import type { WordBankEntry } from '../types';
import {
  addWordBankEntry,
  getAllWordBankEntries,
  getDueWordBankEntries,
  getWordBankEntry,
  updateWordBankEntry,
  getMasteredWordCount,
} from '../db/store';

/**
 * Add a word to the word bank.
 * Delegates to the IndexedDB store.
 */
export async function addWord(entry: WordBankEntry): Promise<void> {
  await addWordBankEntry(entry);
}

/**
 * Get all word bank entries sorted by nextReviewDate ascending.
 * The IndexedDB index already returns them in this order.
 */
export async function getAll(): Promise<WordBankEntry[]> {
  return getAllWordBankEntries();
}

/**
 * Get entries that are due for review (nextReviewDate <= now).
 */
export async function getDueForReview(): Promise<WordBankEntry[]> {
  return getDueWordBankEntries();
}

/**
 * Update a word bank entry after a review attempt.
 *
 * Placeholder spaced repetition logic (will be replaced by
 * SpacedRepetitionScheduler in task 8.5):
 * - If recalled: double the interval (minimum 1 day)
 * - If not recalled: reset interval to 1 day
 * - Mastered when interval >= 21 days
 */
export async function updateReviewResult(
  wordId: string,
  recalled: boolean,
): Promise<void> {
  const entry = await getWordBankEntry(wordId);
  if (!entry) {
    throw new Error(`Word bank entry not found: ${wordId}`);
  }

  let newInterval: number;
  let newRepetitions: number;

  if (recalled) {
    newInterval = Math.max(entry.interval * 2, 1);
    newRepetitions = entry.repetitions + 1;
  } else {
    newInterval = 1;
    newRepetitions = 0;
  }

  const now = new Date();
  const nextReviewDate = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);
  const mastered = newInterval >= 21;

  await updateWordBankEntry({
    ...entry,
    interval: newInterval,
    repetitions: newRepetitions,
    nextReviewDate,
    mastered,
  });
}

/**
 * Get the count of mastered words in the word bank.
 */
export async function getMasteredCount(): Promise<number> {
  return getMasteredWordCount();
}
