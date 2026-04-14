// Test history — persists completed passage attempts with student answers and scores

import type { ComprehensionQuestion } from '../types';
import { getDB } from '../db/store';

export interface QuestionAttempt {
  questionText: string;
  questionType: string;
  studentAnswer: string;
  correctAnswer: string;
  relevantSection: string;
  evaluation: 'correct' | 'partial' | 'incorrect' | 'skipped';
}

export interface TestAttempt {
  id: string;
  passageId: string;
  passageTitle: string; // first ~60 chars of passage text
  genre: string;
  difficulty: number;
  date: string; // ISO date
  questions: QuestionAttempt[];
  correctCount: number;
  partialCount: number;
  totalQuestions: number;
}

// Store test attempts in IndexedDB preferences store as a JSON array
const HISTORY_KEY = 'testHistory';
const USED_PASSAGES_KEY = 'usedPassageIds';

async function getHistoryArray(): Promise<TestAttempt[]> {
  try {
    const db = await getDB();
    const record = await db.get('preferences', HISTORY_KEY);
    return (record?.value as TestAttempt[]) ?? [];
  } catch { return []; }
}

async function saveHistoryArray(history: TestAttempt[]): Promise<void> {
  const db = await getDB();
  await db.put('preferences', { key: HISTORY_KEY, value: history });
}

export async function saveTestAttempt(attempt: TestAttempt): Promise<void> {
  const history = await getHistoryArray();
  history.push(attempt);
  await saveHistoryArray(history);
}

export async function getAllTestAttempts(): Promise<TestAttempt[]> {
  return getHistoryArray();
}

export async function getUsedPassageIds(): Promise<Set<string>> {
  try {
    // Derive from both the explicit used list AND the test history
    const db = await getDB();
    const record = await db.get('preferences', USED_PASSAGES_KEY);
    const explicitIds = (record?.value as string[]) ?? [];
    
    // Also get IDs from test history as a fallback
    const history = await getHistoryArray();
    const historyIds = history.map(a => a.passageId);
    
    return new Set([...explicitIds, ...historyIds]);
  } catch { return new Set(); }
}

export async function markPassageUsed(passageId: string): Promise<void> {
  const used = await getUsedPassageIds();
  used.add(passageId);
  const db = await getDB();
  await db.put('preferences', { key: USED_PASSAGES_KEY, value: [...used] });
}

export function buildTestAttempt(
  passageId: string,
  passageText: string,
  genre: string,
  difficulty: number,
  questions: ComprehensionQuestion[],
  results: { studentAnswer: string; evaluation: 'correct' | 'partial' | 'incorrect' | 'skipped' }[],
): TestAttempt {
  const questionAttempts: QuestionAttempt[] = questions.map((q, i) => ({
    questionText: q.text,
    questionType: q.type,
    studentAnswer: results[i]?.studentAnswer ?? '',
    correctAnswer: q.modelAnswer,
    relevantSection: q.relevantSection,
    evaluation: results[i]?.evaluation ?? 'skipped',
  }));

  return {
    id: crypto.randomUUID(),
    passageId,
    passageTitle: passageText.slice(0, 60).replace(/\n/g, ' ') + (passageText.length > 60 ? '…' : ''),
    genre,
    difficulty,
    date: new Date().toISOString().slice(0, 10),
    questions: questionAttempts,
    correctCount: questionAttempts.filter(q => q.evaluation === 'correct').length,
    partialCount: questionAttempts.filter(q => q.evaluation === 'partial').length,
    totalQuestions: questionAttempts.length,
  };
}
