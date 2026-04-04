import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { countSentences, validatePassage, generatePassage } from './passageGenerator';

const UNAVAILABLE_MESSAGE =
  "We can't create a new passage right now. Why not revisit one you've already read?";

// --- Helper: build a passage string with a given word count and paragraph structure ---
function makePassageText(wordCount: number, sentencesPerParagraph: number, paragraphCount: number): string {
  const paragraphs: string[] = [];
  let wordsRemaining = wordCount;

  for (let p = 0; p < paragraphCount; p++) {
    const sentences: string[] = [];
    for (let s = 0; s < sentencesPerParagraph; s++) {
      const wordsInSentence = Math.min(
        Math.ceil(wordsRemaining / (paragraphCount - p) / sentencesPerParagraph),
        wordsRemaining,
      );
      if (wordsInSentence <= 0) break;
      const words = Array.from({ length: wordsInSentence }, (_, i) => (i === 0 ? 'The' : 'word'));
      sentences.push(words.join(' ') + '.');
      wordsRemaining -= wordsInSentence;
    }
    paragraphs.push(sentences.join(' '));
  }

  return paragraphs.join('\n\n');
}

describe('countSentences', () => {
  it('returns 0 for empty string', () => {
    expect(countSentences('')).toBe(0);
  });

  it('returns 0 for whitespace-only string', () => {
    expect(countSentences('   ')).toBe(0);
  });

  it('counts a single sentence', () => {
    expect(countSentences('The cat sat on the mat.')).toBe(1);
  });

  it('counts multiple sentences', () => {
    expect(countSentences('Hello there. How are you? I am fine!')).toBe(3);
  });

  it('counts exactly 4 sentences', () => {
    const text = 'One. Two. Three. Four.';
    expect(countSentences(text)).toBe(4);
  });
});

describe('validatePassage', () => {
  it('accepts a passage with valid word count and paragraph structure', () => {
    const text = makePassageText(200, 3, 4);
    const result = validatePassage(text);
    expect(result.valid).toBe(true);
    expect(result.wordCount).toBeGreaterThanOrEqual(150);
    expect(result.wordCount).toBeLessThanOrEqual(500);
  });

  it('rejects a passage with too few words', () => {
    const text = 'Short text here.';
    const result = validatePassage(text);
    expect(result.valid).toBe(false);
    expect(result.wordCount).toBeLessThan(150);
  });

  it('rejects a passage with too many words', () => {
    const words = Array.from({ length: 600 }, () => 'word').join(' ') + '.';
    const result = validatePassage(words);
    expect(result.valid).toBe(false);
    expect(result.wordCount).toBeGreaterThan(500);
  });

  it('rejects a passage where a paragraph has more than 4 sentences', () => {
    // 5 sentences in one paragraph
    const paragraph = 'One. Two. Three. Four. Five.';
    // Pad with enough words to reach 150
    const padding = Array.from({ length: 145 }, () => 'word').join(' ') + '.';
    const text = paragraph + '\n\n' + padding;
    const result = validatePassage(text);
    expect(result.valid).toBe(false);
  });

  it('splits paragraphs on blank lines', () => {
    const text = makePassageText(200, 2, 5);
    const result = validatePassage(text);
    expect(result.paragraphs.length).toBe(5);
  });

  it('accepts passage at exactly 150 words', () => {
    // Build exactly 150 words: 3 paragraphs, each with 50 words in 2 sentences
    const sentence = Array.from({ length: 25 }, () => 'word').join(' ') + '.';
    const paragraph = sentence + ' ' + sentence;
    const text = [paragraph, paragraph, paragraph].join('\n\n');
    const result = validatePassage(text);
    expect(result.wordCount).toBe(150);
    expect(result.valid).toBe(true);
  });

  it('accepts passage at exactly 500 words', () => {
    // Build exactly 500 words: 10 paragraphs, each with 50 words in 2 sentences
    const sentence = Array.from({ length: 25 }, () => 'word').join(' ') + '.';
    const paragraph = sentence + ' ' + sentence;
    const text = Array.from({ length: 10 }, () => paragraph).join('\n\n');
    const result = validatePassage(text);
    expect(result.wordCount).toBe(500);
    expect(result.valid).toBe(true);
  });
});


// --- generatePassage tests (mock ollamaClient.generate) ---

vi.mock('./ollamaClient', () => ({
  generate: vi.fn(),
}));

import { generate as ollamaGenerate } from './ollamaClient';
const mockedGenerate = ollamaGenerate as ReturnType<typeof vi.fn>;

describe('generatePassage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Stub crypto.randomUUID
    vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid-1234' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a valid passage on first attempt', async () => {
    const validText = makePassageText(200, 3, 4);
    mockedGenerate.mockResolvedValue(validText);

    const passage = await generatePassage('fiction', 1, 'animals');

    expect(passage.id).toBe('test-uuid-1234');
    expect(passage.genre).toBe('fiction');
    expect(passage.difficulty).toBe(1);
    expect(passage.theme).toBe('animals');
    expect(passage.text).toBe(validText);
    expect(passage.paragraphs.length).toBeGreaterThan(0);
    expect(passage.taggedWords).toEqual([]);
    expect(mockedGenerate).toHaveBeenCalledTimes(1);
  });

  it('retries once when first attempt fails validation, succeeds on retry', async () => {
    const invalidText = 'Too short.';
    const validText = makePassageText(200, 3, 4);
    mockedGenerate
      .mockResolvedValueOnce(invalidText)
      .mockResolvedValueOnce(validText);

    const passage = await generatePassage('non-fiction', 2, 'space');

    expect(mockedGenerate).toHaveBeenCalledTimes(2);
    expect(passage.text).toBe(validText);
    expect(passage.genre).toBe('non-fiction');
    expect(passage.difficulty).toBe(2);
  });

  it('returns error passage when both attempts fail validation', async () => {
    mockedGenerate
      .mockResolvedValueOnce('Too short.')
      .mockResolvedValueOnce('Still too short.');

    const passage = await generatePassage('poetry', 3, 'mystery');

    expect(mockedGenerate).toHaveBeenCalledTimes(2);
    expect(passage.text).toBe(UNAVAILABLE_MESSAGE);
    expect(passage.paragraphs).toEqual([UNAVAILABLE_MESSAGE]);
  });

  it('returns error passage when Ollama is unavailable on first attempt', async () => {
    mockedGenerate.mockResolvedValue(UNAVAILABLE_MESSAGE);

    const passage = await generatePassage('persuasive', 1);

    expect(mockedGenerate).toHaveBeenCalledTimes(1);
    expect(passage.text).toBe(UNAVAILABLE_MESSAGE);
  });

  it('returns error passage when Ollama is unavailable on retry', async () => {
    mockedGenerate
      .mockResolvedValueOnce('Too short.')
      .mockResolvedValueOnce(UNAVAILABLE_MESSAGE);

    const passage = await generatePassage('fiction', 2);

    expect(mockedGenerate).toHaveBeenCalledTimes(2);
    expect(passage.text).toBe(UNAVAILABLE_MESSAGE);
  });

  it('picks a default child-friendly theme when none provided', async () => {
    const validText = makePassageText(200, 3, 4);
    mockedGenerate.mockResolvedValue(validText);

    const passage = await generatePassage('fiction', 1);

    expect(['animals', 'space', 'adventure', 'mystery']).toContain(passage.theme);
  });

  it('supports all four genres', async () => {
    const validText = makePassageText(200, 3, 4);
    mockedGenerate.mockResolvedValue(validText);

    for (const genre of ['fiction', 'non-fiction', 'poetry', 'persuasive'] as const) {
      const passage = await generatePassage(genre, 1, 'animals');
      expect(passage.genre).toBe(genre);
    }
  });

  it('supports all three difficulty levels', async () => {
    const validText = makePassageText(200, 3, 4);
    mockedGenerate.mockResolvedValue(validText);

    for (const level of [1, 2, 3] as const) {
      const passage = await generatePassage('fiction', level, 'animals');
      expect(passage.difficulty).toBe(level);
    }
  });
});
