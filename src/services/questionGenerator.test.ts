import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseQuestionsFromResponse,
  validateQuestions,
  generateQuestions,
  parseEvaluationResult,
  evaluateAnswer,
} from './questionGenerator';
import type { ComprehensionQuestion, Passage } from '../types';

// --- Helpers ---

function makeValidQuestionJson(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    text: 'What colour was the dragon?',
    type: 'retrieval',
    modelAnswer: 'The dragon was green.',
    hints: ['Look at the first paragraph.', 'The colour is mentioned early on.'],
    relevantSection: 'A green dragon sat on the hill.',
    ...overrides,
  };
}

function makeValidQuestionsArray(count: number, typeMix = true): Record<string, unknown>[] {
  const types = ['retrieval', 'inference', 'vocabulary', 'authors-purpose', 'summarisation'];
  return Array.from({ length: count }, (_, i) =>
    makeValidQuestionJson({
      text: `Question ${i + 1}?`,
      type: typeMix ? types[i % types.length] : 'retrieval',
    }),
  );
}

function makeParsedQuestions(count: number, typeMix = true): ComprehensionQuestion[] {
  const types: ComprehensionQuestion['type'][] = [
    'retrieval', 'inference', 'vocabulary', 'authors-purpose', 'summarisation',
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: 'test-uuid-1234',
    text: `Question ${i + 1}?`,
    type: typeMix ? types[i % types.length] : 'retrieval',
    modelAnswer: 'The dragon was green.',
    hints: ['Look at the first paragraph.', 'The colour is mentioned early on.'],
    relevantSection: 'A green dragon sat on the hill.',
  }));
}

const samplePassage: Passage = {
  id: 'passage-1',
  text: 'A green dragon sat on the hill. It watched the village below.\n\nThe villagers were afraid. They had never seen such a creature.',
  genre: 'fiction',
  difficulty: 1,
  theme: 'adventure',
  paragraphs: [
    'A green dragon sat on the hill. It watched the village below.',
    'The villagers were afraid. They had never seen such a creature.',
  ],
  taggedWords: [],
};

// --- parseQuestionsFromResponse ---

describe('parseQuestionsFromResponse', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid-1234' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses a valid JSON array of questions', () => {
    const json = JSON.stringify(makeValidQuestionsArray(5));
    const result = parseQuestionsFromResponse(json);
    expect(result).toHaveLength(5);
    expect(result[0].text).toBe('Question 1?');
    expect(result[0].id).toBe('test-uuid-1234');
  });

  it('handles markdown code fences around JSON', () => {
    const json = '```json\n' + JSON.stringify(makeValidQuestionsArray(4)) + '\n```';
    const result = parseQuestionsFromResponse(json);
    expect(result).toHaveLength(4);
  });

  it('handles extra text before/after JSON array', () => {
    const json = 'Here are the questions:\n' + JSON.stringify(makeValidQuestionsArray(4)) + '\nDone!';
    const result = parseQuestionsFromResponse(json);
    expect(result).toHaveLength(4);
  });

  it('returns empty array for completely invalid response', () => {
    expect(parseQuestionsFromResponse('This is not JSON at all')).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseQuestionsFromResponse('')).toEqual([]);
  });

  it('skips questions with missing text', () => {
    const questions = [
      makeValidQuestionJson({ text: '' }),
      makeValidQuestionJson({ text: 'Valid question?' }),
    ];
    const result = parseQuestionsFromResponse(JSON.stringify(questions));
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Valid question?');
  });

  it('skips questions with invalid type', () => {
    const questions = [
      makeValidQuestionJson({ type: 'unknown-type' }),
      makeValidQuestionJson({ type: 'retrieval' }),
    ];
    const result = parseQuestionsFromResponse(JSON.stringify(questions));
    expect(result).toHaveLength(1);
  });

  it('normalises type variations from LLM', () => {
    const questions = [
      makeValidQuestionJson({ type: 'vocabulary-in-context' }),
      makeValidQuestionJson({ type: "author's-purpose" }),
      makeValidQuestionJson({ type: 'summarization' }),
    ];
    const result = parseQuestionsFromResponse(JSON.stringify(questions));
    expect(result).toHaveLength(3);
    expect(result[0].type).toBe('vocabulary');
    expect(result[1].type).toBe('authors-purpose');
    expect(result[2].type).toBe('summarisation');
  });

  it('skips questions with empty hints array', () => {
    const questions = [
      makeValidQuestionJson({ hints: [] }),
      makeValidQuestionJson(),
    ];
    const result = parseQuestionsFromResponse(JSON.stringify(questions));
    expect(result).toHaveLength(1);
  });

  it('skips questions with missing relevantSection', () => {
    const questions = [
      makeValidQuestionJson({ relevantSection: '' }),
      makeValidQuestionJson(),
    ];
    const result = parseQuestionsFromResponse(JSON.stringify(questions));
    expect(result).toHaveLength(1);
  });

  it('skips questions with missing modelAnswer', () => {
    const questions = [
      makeValidQuestionJson({ modelAnswer: '' }),
      makeValidQuestionJson(),
    ];
    const result = parseQuestionsFromResponse(JSON.stringify(questions));
    expect(result).toHaveLength(1);
  });
});

// --- validateQuestions ---

describe('validateQuestions', () => {
  it('returns true for 4-8 questions with ≥2 types and valid hints/sections', () => {
    expect(validateQuestions(makeParsedQuestions(5))).toBe(true);
    expect(validateQuestions(makeParsedQuestions(4))).toBe(true);
    expect(validateQuestions(makeParsedQuestions(8))).toBe(true);
  });

  it('returns false for fewer than 4 questions', () => {
    expect(validateQuestions(makeParsedQuestions(3))).toBe(false);
  });

  it('returns false for more than 8 questions', () => {
    expect(validateQuestions(makeParsedQuestions(9))).toBe(false);
  });

  it('returns false when all questions have the same type', () => {
    expect(validateQuestions(makeParsedQuestions(5, false))).toBe(false);
  });

  it('returns false when a question has empty hints', () => {
    const questions = makeParsedQuestions(5);
    questions[2].hints = [];
    expect(validateQuestions(questions)).toBe(false);
  });

  it('returns false when a question has empty relevantSection', () => {
    const questions = makeParsedQuestions(5);
    questions[1].relevantSection = '';
    expect(validateQuestions(questions)).toBe(false);
  });
});

// --- generateQuestions tests (mock ollamaClient.generate) ---

vi.mock('./ollamaClient', () => ({
  generate: vi.fn(),
}));

import { generate as ollamaGenerate } from './ollamaClient';
const mockedGenerate = ollamaGenerate as ReturnType<typeof vi.fn>;

const UNAVAILABLE_MESSAGE =
  "We can't create a new passage right now. Why not revisit one you've already read?";

describe('generateQuestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid-1234' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns valid questions on first attempt', async () => {
    const validJson = JSON.stringify(makeValidQuestionsArray(6));
    mockedGenerate.mockResolvedValue(validJson);

    const result = await generateQuestions(samplePassage);

    expect(result).toHaveLength(6);
    expect(mockedGenerate).toHaveBeenCalledTimes(1);
  });

  it('retries when first attempt produces fewer than 4 questions', async () => {
    const tooFew = JSON.stringify(makeValidQuestionsArray(2));
    const valid = JSON.stringify(makeValidQuestionsArray(6));
    mockedGenerate
      .mockResolvedValueOnce(tooFew)
      .mockResolvedValueOnce(valid);

    const result = await generateQuestions(samplePassage);

    expect(mockedGenerate).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(6);
  });

  it('returns whatever valid questions exist on second failure (minimum 1)', async () => {
    const twoQuestions = JSON.stringify(makeValidQuestionsArray(2));
    const oneQuestion = JSON.stringify(makeValidQuestionsArray(1));
    mockedGenerate
      .mockResolvedValueOnce(twoQuestions)
      .mockResolvedValueOnce(oneQuestion);

    const result = await generateQuestions(samplePassage);

    expect(mockedGenerate).toHaveBeenCalledTimes(2);
    // Should return the larger set
    expect(result).toHaveLength(2);
  });

  it('returns empty array when Ollama is unavailable on first attempt', async () => {
    mockedGenerate.mockResolvedValue(UNAVAILABLE_MESSAGE);

    const result = await generateQuestions(samplePassage);

    expect(result).toEqual([]);
    expect(mockedGenerate).toHaveBeenCalledTimes(1);
  });

  it('returns first attempt questions when Ollama is unavailable on retry', async () => {
    const twoQuestions = JSON.stringify(makeValidQuestionsArray(2));
    mockedGenerate
      .mockResolvedValueOnce(twoQuestions)
      .mockResolvedValueOnce(UNAVAILABLE_MESSAGE);

    const result = await generateQuestions(samplePassage);

    expect(mockedGenerate).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
  });

  it('returns empty when both attempts produce no valid questions', async () => {
    mockedGenerate
      .mockResolvedValueOnce('not json')
      .mockResolvedValueOnce('still not json');

    const result = await generateQuestions(samplePassage);

    expect(result).toEqual([]);
  });

  it('does not retry when first attempt has ≥4 questions even if validation fails on type diversity', async () => {
    // 5 questions all same type — fails validateQuestions but has enough count
    const sameType = JSON.stringify(makeValidQuestionsArray(5, false));
    mockedGenerate.mockResolvedValue(sameType);

    const result = await generateQuestions(samplePassage);

    // Should not retry since count >= MIN_QUESTIONS
    expect(mockedGenerate).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(5);
  });
});


// --- parseEvaluationResult ---

describe('parseEvaluationResult', () => {
  it('returns "correct" for exact match', () => {
    expect(parseEvaluationResult('correct')).toBe('correct');
  });

  it('returns "partial" for exact match', () => {
    expect(parseEvaluationResult('partial')).toBe('partial');
  });

  it('returns "incorrect" for exact match', () => {
    expect(parseEvaluationResult('incorrect')).toBe('incorrect');
  });

  it('handles case-insensitive input', () => {
    expect(parseEvaluationResult('CORRECT')).toBe('correct');
    expect(parseEvaluationResult('Partial')).toBe('partial');
    expect(parseEvaluationResult('INCORRECT')).toBe('incorrect');
  });

  it('handles leading/trailing whitespace', () => {
    expect(parseEvaluationResult('  correct  ')).toBe('correct');
    expect(parseEvaluationResult('\npartial\n')).toBe('partial');
  });

  it('extracts result embedded in longer text', () => {
    expect(parseEvaluationResult('The answer is correct.')).toBe('correct');
    expect(parseEvaluationResult('I would rate this as partial.')).toBe('partial');
  });

  it('prefers "incorrect" over "correct" when both substrings match', () => {
    expect(parseEvaluationResult('incorrect')).toBe('incorrect');
    expect(parseEvaluationResult('The answer is incorrect.')).toBe('incorrect');
  });

  it('defaults to "partial" for unrecognisable response', () => {
    expect(parseEvaluationResult('I am not sure')).toBe('partial');
    expect(parseEvaluationResult('')).toBe('partial');
    expect(parseEvaluationResult('maybe')).toBe('partial');
  });
});

// --- evaluateAnswer ---

describe('evaluateAnswer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the parsed evaluation when Ollama responds with a valid category', async () => {
    mockedGenerate.mockResolvedValue('correct');

    const result = await evaluateAnswer(
      'The dragon was green',
      'The dragon was green.',
      'What colour was the dragon?',
    );

    expect(result).toBe('correct');
    expect(mockedGenerate).toHaveBeenCalledTimes(1);
  });

  it('returns "partial" when Ollama is unavailable', async () => {
    mockedGenerate.mockResolvedValue(UNAVAILABLE_MESSAGE);

    const result = await evaluateAnswer(
      'It was green',
      'The dragon was green.',
      'What colour was the dragon?',
    );

    expect(result).toBe('partial');
  });

  it('returns "partial" when Ollama throws an error', async () => {
    mockedGenerate.mockRejectedValue(new Error('Network error'));

    const result = await evaluateAnswer(
      'It was green',
      'The dragon was green.',
      'What colour was the dragon?',
    );

    expect(result).toBe('partial');
  });

  it('returns "incorrect" when Ollama responds with incorrect', async () => {
    mockedGenerate.mockResolvedValue('incorrect');

    const result = await evaluateAnswer(
      'The dragon was blue',
      'The dragon was green.',
      'What colour was the dragon?',
    );

    expect(result).toBe('incorrect');
  });

  it('parses a verbose Ollama response to extract the evaluation', async () => {
    mockedGenerate.mockResolvedValue('Based on the model answer, this is partial.');

    const result = await evaluateAnswer(
      'It was a dragon',
      'The dragon was green.',
      'What colour was the dragon?',
    );

    expect(result).toBe('partial');
  });

  it('includes question text, model answer, and learner answer in the prompt', async () => {
    mockedGenerate.mockResolvedValue('correct');

    await evaluateAnswer('my answer', 'the model answer', 'the question?');

    const prompt = mockedGenerate.mock.calls[0][0] as string;
    expect(prompt).toContain('the question?');
    expect(prompt).toContain('the model answer');
    expect(prompt).toContain('my answer');
  });
});
