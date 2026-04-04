// Question generator — produces comprehension questions via Ollama
// Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6

import { generate } from './ollamaClient';
import type { Passage, ComprehensionQuestion, QuestionType } from '../types';

const UNAVAILABLE_MESSAGE =
  "We can't create a new passage right now. Why not revisit one you've already read?";

const VALID_QUESTION_TYPES: QuestionType[] = [
  'retrieval',
  'inference',
  'vocabulary',
  'authors-purpose',
  'summarisation',
];

const MIN_QUESTIONS = 4;
const MAX_QUESTIONS = 8;
const MIN_DISTINCT_TYPES = 2;

/**
 * Parse the LLM response string into an array of ComprehensionQuestion objects.
 * Extracts JSON from the response, handling markdown code fences and other wrapping.
 */
export function parseQuestionsFromResponse(response: string): ComprehensionQuestion[] {
  const trimmed = response.trim();

  // Try to extract a JSON array from the response
  let jsonStr = trimmed;

  // Strip markdown code fences if present
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  // Try to find a JSON array in the string
  const arrayStart = jsonStr.indexOf('[');
  const arrayEnd = jsonStr.lastIndexOf(']');
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    jsonStr = jsonStr.slice(arrayStart, arrayEnd + 1);
  }

  let parsed: unknown[];
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const questions: ComprehensionQuestion[] = [];

  for (const item of parsed) {
    if (typeof item !== 'object' || item === null) continue;

    const raw = item as Record<string, unknown>;

    // Flexible key lookup — LLMs often use snake_case or different naming
    const text = extractString(raw, ['text', 'question', 'question_text']) ;
    if (!text) continue;

    const type = normaliseQuestionType(
      raw.type ?? raw.question_type ?? raw.questionType ?? raw.category
    );
    if (!type) continue;

    const modelAnswer = extractString(raw, ['modelAnswer', 'model_answer', 'answer', 'correct_answer', 'correctAnswer']);
    if (!modelAnswer) continue;

    const hints = parseHints(raw.hints ?? raw.graduated_hints ?? raw.clues);
    if (hints.length === 0) continue;

    const relevantSection = extractString(raw, ['relevantSection', 'relevant_section', 'passage_section', 'passageSection', 'excerpt', 'context']);
    if (!relevantSection) continue;

    questions.push({
      id: crypto.randomUUID(),
      text,
      type,
      modelAnswer,
      hints,
      relevantSection,
    });
  }

  return questions;
}

/**
 * Extract a string value from an object trying multiple possible keys.
 */
function extractString(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
  }
  return '';
}

/**
 * Normalise a raw question type string to a valid QuestionType.
 */
function normaliseQuestionType(raw: unknown): QuestionType | null {
  if (typeof raw !== 'string') return null;
  const normalised = raw.trim().toLowerCase().replace(/[_\s]+/g, '-');
  // Handle common LLM variations
  const aliases: Record<string, QuestionType> = {
    'retrieval': 'retrieval',
    'retrieve': 'retrieval',
    'literal': 'retrieval',
    'factual': 'retrieval',
    'inference': 'inference',
    'infer': 'inference',
    'inferential': 'inference',
    'deduction': 'inference',
    'vocabulary': 'vocabulary',
    'vocabulary-in-context': 'vocabulary',
    'word-meaning': 'vocabulary',
    'language': 'vocabulary',
    'authors-purpose': 'authors-purpose',
    "author's-purpose": 'authors-purpose',
    'author-purpose': 'authors-purpose',
    'authorial-intent': 'authors-purpose',
    'purpose': 'authors-purpose',
    'summarisation': 'summarisation',
    'summarization': 'summarisation',
    'summary': 'summarisation',
    'summarise': 'summarisation',
    'summarize': 'summarisation',
  };
  return aliases[normalised] ?? (VALID_QUESTION_TYPES.includes(normalised as QuestionType) ? (normalised as QuestionType) : null);
}

/**
 * Parse hints from a raw value — expects an array of strings.
 */
function parseHints(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const hints: string[] = [];
  for (const h of raw) {
    if (typeof h === 'string' && h.trim().length > 0) {
      hints.push(h.trim());
    }
  }
  return hints;
}

/**
 * Validate that a set of questions meets the structural requirements:
 * - Count between 4 and 8
 * - At least 2 distinct question types
 * - Every question has non-empty hints and relevantSection
 */
export function validateQuestions(questions: ComprehensionQuestion[]): boolean {
  if (questions.length < MIN_QUESTIONS || questions.length > MAX_QUESTIONS) return false;

  const types = new Set(questions.map((q) => q.type));
  if (types.size < MIN_DISTINCT_TYPES) return false;

  return questions.every(
    (q) =>
      q.hints.length > 0 &&
      q.hints.every((h) => h.trim().length > 0) &&
      q.relevantSection.trim().length > 0,
  );
}

function buildPrompt(passage: Passage): string {
  return [
    'You are a comprehension question generator for 10-11 year old children.',
    'Given the following passage, generate between 4 and 8 comprehension questions.',
    '',
    'Include a mix of these question types: retrieval, inference, vocabulary, authors-purpose, summarisation.',
    'Use at least 2 different question types.',
    '',
    'For each question provide:',
    '- "text": the question text',
    '- "type": one of "retrieval", "inference", "vocabulary", "authors-purpose", "summarisation"',
    '- "modelAnswer": a complete model answer',
    '- "hints": an array of 2-3 graduated hints (easiest first, most revealing last)',
    '- "relevantSection": the exact passage excerpt that helps answer the question',
    '',
    'Return ONLY a JSON array of question objects. No other text.',
    '',
    '--- PASSAGE ---',
    passage.text,
    '--- END PASSAGE ---',
  ].join('\n');
}

function buildRetryPrompt(passage: Passage): string {
  return [
    'You are a comprehension question generator for 10-11 year old children.',
    'Generate EXACTLY 6 comprehension questions for the passage below.',
    '',
    'IMPORTANT: You MUST include at least 2 different question types from: retrieval, inference, vocabulary, authors-purpose, summarisation.',
    'IMPORTANT: Each question MUST have 2-3 hints (graduated, easiest first) and a relevantSection from the passage.',
    '',
    'Return ONLY a valid JSON array. Each object must have these exact keys:',
    '  "text" (string), "type" (string), "modelAnswer" (string), "hints" (string[]), "relevantSection" (string)',
    '',
    '--- PASSAGE ---',
    passage.text,
    '--- END PASSAGE ---',
  ].join('\n');
}

/**
 * Generate comprehension questions for a passage using the local Ollama LLM.
 * Retries once if fewer than 4 valid questions are produced.
 * On second failure, returns whatever valid questions exist (minimum 1).
 */
export async function generateQuestions(passage: Passage): Promise<ComprehensionQuestion[]> {
  // First attempt
  const firstResponse = await generate(buildPrompt(passage));

  console.log('[QuestionGenerator] First response length:', firstResponse.length);
  console.log('[QuestionGenerator] First response preview:', firstResponse.slice(0, 200));

  if (firstResponse === UNAVAILABLE_MESSAGE) {
    console.log('[QuestionGenerator] Ollama unavailable');
    return [];
  }

  const firstQuestions = parseQuestionsFromResponse(firstResponse);
  console.log('[QuestionGenerator] Parsed questions count:', firstQuestions.length);

  if (validateQuestions(firstQuestions)) {
    return firstQuestions;
  }

  // Retry if <4 valid questions
  if (firstQuestions.length >= MIN_QUESTIONS) {
    return firstQuestions;
  }

  console.log('[QuestionGenerator] Retrying — got', firstQuestions.length, 'questions');
  const retryResponse = await generate(buildRetryPrompt(passage));
  console.log('[QuestionGenerator] Retry response length:', retryResponse.length);

  if (retryResponse === UNAVAILABLE_MESSAGE) {
    return firstQuestions.length >= 1 ? firstQuestions : [];
  }

  const retryQuestions = parseQuestionsFromResponse(retryResponse);
  console.log('[QuestionGenerator] Retry parsed questions count:', retryQuestions.length);

  if (validateQuestions(retryQuestions)) {
    return retryQuestions;
  }

  const best = retryQuestions.length >= firstQuestions.length ? retryQuestions : firstQuestions;
  return best.length >= 1 ? best : [];
}


const VALID_EVALUATION_RESULTS = ['correct', 'partial', 'incorrect'] as const;
type EvaluationResult = (typeof VALID_EVALUATION_RESULTS)[number];

/**
 * Parse an LLM response string to extract one of the three valid evaluation categories.
 * Returns 'partial' as a default if the response cannot be parsed (benefit of the doubt).
 */
export function parseEvaluationResult(response: string): EvaluationResult {
  const lower = response.trim().toLowerCase();

  // Check for exact match first
  for (const result of VALID_EVALUATION_RESULTS) {
    if (lower === result) return result;
  }

  // Check if the response contains exactly one of the valid results
  const found: EvaluationResult[] = [];
  for (const result of VALID_EVALUATION_RESULTS) {
    if (lower.includes(result)) {
      found.push(result);
    }
  }

  // 'incorrect' also contains 'correct', so if we find 'incorrect' prefer it
  if (found.includes('incorrect') && found.includes('correct')) {
    return 'incorrect';
  }

  if (found.length === 1) {
    return found[0];
  }

  // Default to 'partial' — benefit of the doubt for the child
  return 'partial';
}

/**
 * Evaluate a learner's answer against the model answer using Ollama.
 * Returns exactly one of 'correct', 'partial', or 'incorrect'.
 * Defaults to 'partial' if Ollama is unavailable or response cannot be parsed.
 *
 * Requirements: 3.3, 3.6
 */
export async function evaluateAnswer(
  learnerAnswer: string,
  modelAnswer: string,
  questionText: string,
): Promise<EvaluationResult> {
  const prompt = [
    'You are evaluating a child\'s answer to a reading comprehension question.',
    'Compare the learner\'s answer against the model answer.',
    'Respond with EXACTLY one word: correct, partial, or incorrect.',
    '',
    `Question: ${questionText}`,
    `Model answer: ${modelAnswer}`,
    `Learner's answer: ${learnerAnswer}`,
    '',
    'Your evaluation (one word only):',
  ].join('\n');

  try {
    const response = await generate(prompt);

    if (response === UNAVAILABLE_MESSAGE) {
      return 'partial';
    }

    return parseEvaluationResult(response);
  } catch {
    return 'partial';
  }
}
