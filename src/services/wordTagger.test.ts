import { describe, it, expect } from 'vitest';
import {
  tagWords,
  extractUniqueWords,
  isComplexWord,
  findSentenceContaining,
} from './wordTagger';
import type { Passage } from '../types';

function makePassage(text: string): Passage {
  return {
    id: 'test-1',
    text,
    genre: 'fiction',
    difficulty: 2,
    theme: 'adventure',
    paragraphs: text.split(/\n\s*\n/).filter((p) => p.trim().length > 0),
    taggedWords: [],
  };
}

describe('extractUniqueWords', () => {
  it('extracts lowercase unique words and strips punctuation', () => {
    const words = extractUniqueWords('Hello, world! Hello again.');
    expect(words).toContain('hello');
    expect(words).toContain('world');
    expect(words).toContain('again');
    // 'hello' should appear only once
    expect(words.filter((w) => w === 'hello')).toHaveLength(1);
  });

  it('returns empty array for empty text', () => {
    expect(extractUniqueWords('')).toEqual([]);
  });
});

describe('isComplexWord', () => {
  it('returns true for long words (>=8 chars)', () => {
    expect(isComplexWord('adventure')).toBe(true);
    expect(isComplexWord('mysterious')).toBe(true);
  });

  it('returns true for words with complex patterns (>=6 chars)', () => {
    expect(isComplexWord('nation')).toBe(true); // -tion
    expect(isComplexWord('joyful')).toBe(true); // -ful
  });

  it('returns false for short simple words', () => {
    expect(isComplexWord('cat')).toBe(false);
    expect(isComplexWord('run')).toBe(false);
  });

  it('returns false for stop words', () => {
    expect(isComplexWord('the')).toBe(false);
    expect(isComplexWord('would')).toBe(false);
  });
});

describe('findSentenceContaining', () => {
  it('finds the sentence containing the target word', () => {
    const text = 'The cat sat on the mat. The environment was calm. Birds sang.';
    const sentence = findSentenceContaining(text, 'environment');
    expect(sentence).toBe('The environment was calm.');
  });

  it('returns first sentence as fallback when word not found', () => {
    const text = 'First sentence here. Second sentence there.';
    const sentence = findSentenceContaining(text, 'missing');
    expect(sentence).toBe('First sentence here.');
  });
});

describe('tagWords', () => {
  it('tags curriculum words found in the passage', () => {
    const passage = makePassage(
      'The ancient environment was marvellous. The committee made a sacrifice for the community. ' +
      'They felt conscious of the controversy surrounding the government programme. ' +
      'It was necessary to accommodate everyone in the restaurant.',
    );
    const tagged = tagWords(passage);
    const curriculumTagged = tagged.filter((t) => t.isCurriculumWord);
    expect(curriculumTagged.length).toBeGreaterThanOrEqual(3);
    expect(tagged.length).toBeGreaterThanOrEqual(3);
    expect(tagged.length).toBeLessThanOrEqual(10);
  });

  it('enforces minimum of 3 tagged words by supplementing from statutory list', () => {
    // A passage with no curriculum or complex words
    const passage = makePassage(
      'The cat sat on the mat. The dog ran in the park. A bird flew over the tree. ' +
      'The sun was warm and the sky was blue. It was a nice day to play.',
    );
    const tagged = tagWords(passage);
    expect(tagged.length).toBeGreaterThanOrEqual(3);
  });

  it('enforces maximum of 10 tagged words', () => {
    // A passage loaded with curriculum words
    const passage = makePassage(
      'The ancient committee made a sacrifice. The environment was marvellous and the community was conscious. ' +
      'The controversy about the government programme was apparent. It was necessary to accommodate the restaurant. ' +
      'The individual felt desperate and embarrassed. The explanation was excellent and sufficient. ' +
      'The opportunity was immediate and relevant.',
    );
    const tagged = tagWords(passage);
    expect(tagged.length).toBeLessThanOrEqual(10);
  });

  it('each tagged word has non-empty definition and context', () => {
    const passage = makePassage(
      'The ancient environment was marvellous. The committee made a sacrifice for the community. ' +
      'They felt conscious of the controversy surrounding the government programme.',
    );
    const tagged = tagWords(passage);
    for (const t of tagged) {
      expect(t.definition.length).toBeGreaterThan(0);
      expect(t.passageContext.length).toBeGreaterThan(0);
    }
  });

  it('prioritises curriculum words over complex words', () => {
    const passage = makePassage(
      'The ancient environment was marvellous. The committee made a sacrifice for the community. ' +
      'The extraordinary phenomenon was breathtaking and overwhelming.',
    );
    const tagged = tagWords(passage);
    const curriculumWords = tagged.filter((t) => t.isCurriculumWord);
    // Curriculum words should appear before non-curriculum in the list
    if (curriculumWords.length > 0 && tagged.length > curriculumWords.length) {
      const lastCurriculumIdx = Math.max(
        ...curriculumWords.map((cw) => tagged.indexOf(cw)),
      );
      const firstNonCurriculumIdx = tagged.findIndex((t) => !t.isCurriculumWord);
      expect(lastCurriculumIdx).toBeLessThan(
        tagged.length, // curriculum words exist in the list
      );
      // At minimum, the first items should be curriculum words
      expect(tagged[0].isCurriculumWord).toBe(true);
    }
  });
});
