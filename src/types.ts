// Shared types for the Dyslexia Comprehension Tool
// Requirements: 1.2, 2.2, 3.1, 3.2, 4.1, 5.1, 6.4, 11.1

export type Genre = 'fiction' | 'non-fiction' | 'poetry' | 'persuasive';

export type DifficultyLevel = 1 | 2 | 3;

export type QuestionType =
  | 'retrieval'
  | 'inference'
  | 'vocabulary'
  | 'authors-purpose'
  | 'summarisation';

export interface TaggedWord {
  word: string;
  definition: string;
  passageContext: string;
  isCurriculumWord: boolean;
}

export interface Passage {
  id: string;
  text: string;
  genre: Genre;
  difficulty: DifficultyLevel;
  theme: string;
  paragraphs: string[];
  taggedWords: TaggedWord[];
}

export interface ComprehensionQuestion {
  id: string;
  text: string;
  type: QuestionType;
  modelAnswer: string;
  hints: string[];
  relevantSection: string;
}

export interface WordBankEntry {
  id: string;
  word: string;
  definition: string;
  passageContext: string;
  addedDate: Date;
  nextReviewDate: Date;
  interval: number;
  easeFactor: number;
  repetitions: number;
  mastered: boolean;
}

export interface PassageRecord {
  id: string;
  text: string;
  genre: Genre;
  difficulty: DifficultyLevel;
  theme: string;
  paragraphs: string[];
  taggedWords: TaggedWord[];
  questions: ComprehensionQuestion[];
  createdAt: Date;
  completed: boolean;
  questionsAnswered: number;
  questionsCorrect: number;
}

export interface ProgressRecord {
  id: string;
  passageId: string;
  date: string;
  difficulty: DifficultyLevel;
  questionsTotal: number;
  questionsCorrect: number;
  questionsPartial: number;
  completedAt: Date;
}

export interface UserPreferences {
  fontSize: number;
  lineSpacing: number;
  backgroundColor: string;
  fontFamily: string;
  readingRulerEnabled: boolean;
  ttsSpeed: number;
}

export interface ReviewUpdate {
  nextReviewDate: Date;
  newInterval: number;
  newEaseFactor: number;
  newRepetitions: number;
  mastered: boolean;
}

export interface LevelSuggestion {
  direction: 'up' | 'down';
  message: string;
}

export interface ExerciseStepResult {
  correct: boolean;
  feedback: string;
  nextStep: ExerciseSession['step'];
}

export interface ExerciseSession {
  step: 'type-three-times' | 'use-in-sentence' | 'type-from-memory' | 'complete';
  correctTypings: number;
  submitTyping(input: string): ExerciseStepResult;
  submitSentence(sentence: string): ExerciseStepResult;
  submitMemoryRecall(input: string): ExerciseStepResult;
}
