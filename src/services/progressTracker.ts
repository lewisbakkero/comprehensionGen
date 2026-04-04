import type { DifficultyLevel, ProgressRecord } from '../types';
import { addProgressRecord, getAllProgressRecords } from '../db/store';

/**
 * Get today's date as YYYY-MM-DD.
 */
function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Return the previous calendar day as YYYY-MM-DD, using UTC to avoid timezone drift.
 */
function previousDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z'); // noon UTC avoids DST edge cases
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Record a passage completion with today's date.
 */
export async function recordPassageCompletion(
  passageId: string,
  difficulty: DifficultyLevel,
  questionsTotal: number,
  questionsCorrect: number,
  questionsPartial: number,
): Promise<void> {
  const now = new Date();
  const date = now.toISOString().slice(0, 10); // YYYY-MM-DD

  const record: ProgressRecord = {
    id: crypto.randomUUID(),
    passageId,
    date,
    difficulty,
    questionsTotal,
    questionsCorrect,
    questionsPartial,
    completedAt: now,
  };

  await addProgressRecord(record);
}

/**
 * Return the total count of all progress records.
 */
export async function getCompletedCount(): Promise<number> {
  const records = await getAllProgressRecords();
  return records.length;
}

/**
 * Calculate the current streak of consecutive calendar days ending at today
 * with at least one completion. Returns 0 if no completion today.
 * @param today - override for testing (YYYY-MM-DD)
 */
export async function getCurrentStreak(today?: string): Promise<number> {
  const records = await getAllProgressRecords();
  if (records.length === 0) return 0;

  // Collect unique completion dates
  const dateSet = new Set<string>();
  for (const r of records) {
    dateSet.add(r.date);
  }

  const todayStr = today ?? todayDate();
  if (!dateSet.has(todayStr)) return 0;

  let streak = 1;
  let currentDate = todayStr;

  while (true) {
    currentDate = previousDay(currentDate);
    if (dateSet.has(currentDate)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Count progress records matching the given difficulty level.
 */
export async function getCompletionsAtDifficulty(
  level: DifficultyLevel,
): Promise<number> {
  const records = await getAllProgressRecords();
  return records.filter((r) => r.difficulty === level).length;
}

/**
 * Returns true when:
 * - There are ≥5 completions at the current level, AND
 * - ≥60% of total answers across those completions are correct or partial.
 */
export async function shouldSuggestLevelUp(
  currentLevel: DifficultyLevel,
): Promise<boolean> {
  const records = await getAllProgressRecords();
  const atLevel = records.filter((r) => r.difficulty === currentLevel);

  if (atLevel.length < 5) return false;

  let totalQuestions = 0;
  let totalCorrectOrPartial = 0;

  for (const r of atLevel) {
    totalQuestions += r.questionsTotal;
    totalCorrectOrPartial += r.questionsCorrect + r.questionsPartial;
  }

  if (totalQuestions === 0) return false;

  return totalCorrectOrPartial / totalQuestions >= 0.6;
}
