// Passage generator — builds prompts for Ollama and validates LLM output
// Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 11.1

import { generate } from './ollamaClient';
import type { Genre, DifficultyLevel, Passage, TaggedWord } from '../types';

const UNAVAILABLE_MESSAGE =
  "We can't create a new passage right now. Why not revisit one you've already read?";

const MIN_WORDS = 150;
const MAX_WORDS = 500;
const MAX_SENTENCES_PER_PARAGRAPH = 4;

const CHILD_THEMES = ['animals', 'space', 'adventure', 'mystery'];

const DIFFICULTY_DESCRIPTORS: Record<DifficultyLevel, string> = {
  1: 'Use simple, everyday vocabulary suitable for a beginner reader. Short, clear sentences.',
  2: 'Use moderate vocabulary with some challenging words. Sentences can be compound but still clear.',
  3: 'Use advanced vocabulary with complex sentence structures. Include figurative language and nuanced ideas.',
};

/**
 * Count sentences in a paragraph by splitting on sentence-ending punctuation.
 * Handles abbreviations and decimal numbers conservatively.
 */
export function countSentences(paragraph: string): number {
  const trimmed = paragraph.trim();
  if (trimmed.length === 0) return 0;

  // Split on sentence-ending punctuation followed by a space or end of string.
  // This regex matches '.', '!', or '?' that are followed by whitespace+uppercase, whitespace+quote, or end of string.
  const sentences = trimmed.split(/(?<=[.!?])\s+(?=[A-Z"'\u201C])|(?<=[.!?])$/);
  return sentences.filter((s) => s.trim().length > 0).length;
}

/**
 * Validate a passage text: word count in [150, 500] and each paragraph ≤ 4 sentences.
 */
export function validatePassage(text: string): {
  valid: boolean;
  wordCount: number;
  paragraphs: string[];
} {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const wordCount = text
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  const wordCountValid = wordCount >= MIN_WORDS && wordCount <= MAX_WORDS;
  const paragraphsValid = paragraphs.every(
    (p) => countSentences(p) <= MAX_SENTENCES_PER_PARAGRAPH,
  );

  return {
    valid: wordCountValid && paragraphsValid,
    wordCount,
    paragraphs,
  };
}

function buildPrompt(genre: Genre, difficulty: DifficultyLevel, theme: string): string {
  return [
    `Write a ${genre} passage for a 10-11 year old child about "${theme}".`,
    DIFFICULTY_DESCRIPTORS[difficulty],
    `The passage MUST be between ${MIN_WORDS} and ${MAX_WORDS} words.`,
    `Structure the passage into short paragraphs. Each paragraph must have no more than ${MAX_SENTENCES_PER_PARAGRAPH} sentences.`,
    'Separate paragraphs with a blank line.',
    'The content must be child-friendly, engaging, and age-appropriate.',
    'Do NOT include a title, heading, or any meta-commentary. Output only the passage text.',
  ].join('\n');
}

function buildRetryPrompt(genre: Genre, difficulty: DifficultyLevel, theme: string): string {
  return [
    `Write a ${genre} passage for a 10-11 year old child about "${theme}".`,
    DIFFICULTY_DESCRIPTORS[difficulty],
    `IMPORTANT: The passage MUST contain between ${MIN_WORDS} and ${MAX_WORDS} words total.`,
    `IMPORTANT: Each paragraph MUST have at most ${MAX_SENTENCES_PER_PARAGRAPH} sentences. Keep paragraphs short.`,
    'Separate each paragraph with a blank line.',
    'The content must be child-friendly, engaging, and age-appropriate.',
    'Do NOT include a title, heading, or any meta-commentary. Output ONLY the passage text, nothing else.',
  ].join('\n');
}

function pickTheme(theme?: string): string {
  if (theme) return theme;
  return CHILD_THEMES[Math.floor(Math.random() * CHILD_THEMES.length)];
}

/**
 * Generate a passage using the local Ollama LLM.
 * Retries once on validation failure with a refined prompt.
 * Falls back to a friendly error on second failure.
 */
export async function generatePassage(
  genre: Genre,
  difficulty: DifficultyLevel,
  theme?: string,
): Promise<Passage> {
  const chosenTheme = pickTheme(theme);

  // First attempt
  const firstResponse = await generate(buildPrompt(genre, difficulty, chosenTheme));

  if (firstResponse === UNAVAILABLE_MESSAGE) {
    return makeErrorPassage(genre, difficulty, chosenTheme);
  }

  const firstValidation = validatePassage(firstResponse);
  if (firstValidation.valid) {
    return buildPassage(firstResponse, firstValidation.paragraphs, genre, difficulty, chosenTheme);
  }

  // Retry with refined prompt
  const retryResponse = await generate(buildRetryPrompt(genre, difficulty, chosenTheme));

  if (retryResponse === UNAVAILABLE_MESSAGE) {
    return makeErrorPassage(genre, difficulty, chosenTheme);
  }

  const retryValidation = validatePassage(retryResponse);
  if (retryValidation.valid) {
    return buildPassage(retryResponse, retryValidation.paragraphs, genre, difficulty, chosenTheme);
  }

  // Second failure — fall back to friendly error
  return makeErrorPassage(genre, difficulty, chosenTheme);
}

function buildPassage(
  text: string,
  paragraphs: string[],
  genre: Genre,
  difficulty: DifficultyLevel,
  theme: string,
): Passage {
  return {
    id: crypto.randomUUID(),
    text,
    genre,
    difficulty,
    theme,
    paragraphs,
    taggedWords: [] as TaggedWord[],
  };
}

function makeErrorPassage(
  genre: Genre,
  difficulty: DifficultyLevel,
  theme: string,
): Passage {
  return {
    id: crypto.randomUUID(),
    text: UNAVAILABLE_MESSAGE,
    genre,
    difficulty,
    theme,
    paragraphs: [UNAVAILABLE_MESSAGE],
    taggedWords: [],
  };
}
