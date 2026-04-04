// Word tagger — identifies difficult vocabulary in passages
// Requirements: 2.1, 2.2, 2.4

import { YEAR_5_6_STATUTORY_WORDS } from '../data/statutoryWords';
import type { Passage, TaggedWord } from '../types';

const MIN_TAGGED = 3;
const MAX_TAGGED = 10;
const COMPLEX_WORD_MIN_LENGTH = 8;

/** Set of statutory words in lowercase for fast lookup. */
const statutorySet = new Set(
  YEAR_5_6_STATUTORY_WORDS.map((w) => w.toLowerCase()),
);

/** Common short words that should never be tagged. */
const STOP_WORDS = new Set([
  'the', 'and', 'but', 'for', 'nor', 'yet', 'not', 'was', 'were',
  'are', 'been', 'being', 'have', 'has', 'had', 'does', 'did',
  'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'can',
  'could', 'this', 'that', 'these', 'those', 'with', 'from', 'into',
  'about', 'after', 'before', 'between', 'under', 'over', 'then',
  'than', 'when', 'where', 'which', 'while', 'there', 'their',
  'they', 'them', 'what', 'who', 'whom', 'your', 'you', 'its',
  'his', 'her', 'she', 'him', 'our', 'also', 'just', 'very',
  'some', 'any', 'each', 'every', 'all', 'both', 'few', 'more',
  'most', 'other', 'such', 'only', 'same', 'here', 'how', 'why',
]);

/**
 * Extract unique lowercase words from text, stripping punctuation.
 */
export function extractUniqueWords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, '')
    .split(/\s+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, ''))
    .filter((w) => w.length > 0);

  return [...new Set(words)];
}

/**
 * Determine whether a word is "complex" based on heuristics:
 * - Length >= COMPLEX_WORD_MIN_LENGTH (8)
 * - Contains uncommon letter patterns (ph, ght, ough, tion, sion, ous)
 * - Not a stop word
 */
export function isComplexWord(word: string): boolean {
  const lower = word.toLowerCase();
  if (STOP_WORDS.has(lower)) return false;
  if (lower.length < 4) return false;

  // Length heuristic
  if (lower.length >= COMPLEX_WORD_MIN_LENGTH) return true;

  // Uncommon patterns often found in advanced vocabulary
  const complexPatterns = /(?:ph|ght|ough|tion|sion|ous|ious|eous|ible|able|ment|ness|ence|ance|ful|less|ise|ize)/;
  if (complexPatterns.test(lower) && lower.length >= 6) return true;

  return false;
}

/**
 * Find the sentence in the passage text that contains the given word.
 * Returns the first matching sentence, or the first sentence as fallback.
 */
export function findSentenceContaining(text: string, word: string): string {
  // Split text into sentences on . ! ? followed by space or end
  const sentences = text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const lower = word.toLowerCase();
  const wordRegex = new RegExp(`\\b${lower}\\b`, 'i');

  const match = sentences.find((s) => wordRegex.test(s));
  return match ?? sentences[0] ?? '';
}

/**
 * Generate a simple definition for a tagged word.
 * Curriculum words get a curriculum-specific note; complex words get a
 * heuristic-based description.
 */
function generateDefinition(word: string, isCurriculum: boolean): string {
  if (isCurriculum) {
    return `A word from the Year 5/6 spelling list.`;
  }

  const lower = word.toLowerCase();
  if (/tion$|sion$/.test(lower)) {
    return `A noun describing an action or process.`;
  }
  if (/ous$|ious$|eous$/.test(lower)) {
    return `An adjective describing a quality or characteristic.`;
  }
  if (/ment$/.test(lower)) {
    return `A noun related to an action or result.`;
  }
  if (/ness$/.test(lower)) {
    return `A noun describing a state or quality.`;
  }
  if (/able$|ible$/.test(lower)) {
    return `An adjective meaning capable of or suitable for something.`;
  }
  if (/ful$/.test(lower)) {
    return `An adjective meaning full of a particular quality.`;
  }
  if (/less$/.test(lower)) {
    return `An adjective meaning without a particular quality.`;
  }
  return `An advanced vocabulary word worth learning.`;
}

/**
 * Tag words in a passage for vocabulary learning.
 *
 * Algorithm:
 * 1. Extract unique words from passage text
 * 2. Identify curriculum words (Y5/6 statutory list)
 * 3. Identify complex non-curriculum words via heuristics
 * 4. Prioritise curriculum words
 * 5. Enforce 3–10 tagged words: supplement from statutory list if <3, trim if >10
 * 6. Attach definition and passage context sentence to each
 */
export function tagWords(passage: Passage): TaggedWord[] {
  const uniqueWords = extractUniqueWords(passage.text);

  // Separate curriculum and complex words found in the passage
  const curriculumFound: string[] = [];
  const complexFound: string[] = [];

  for (const word of uniqueWords) {
    if (statutorySet.has(word)) {
      curriculumFound.push(word);
    } else if (isComplexWord(word)) {
      complexFound.push(word);
    }
  }

  // Build candidate list: curriculum words first, then complex words
  let candidates = [...curriculumFound, ...complexFound];

  // Supplement from statutory list if we have fewer than MIN_TAGGED
  if (candidates.length < MIN_TAGGED) {
    const alreadyIncluded = new Set(candidates);
    for (const statutory of YEAR_5_6_STATUTORY_WORDS) {
      if (candidates.length >= MIN_TAGGED) break;
      const lower = statutory.toLowerCase();
      if (!alreadyIncluded.has(lower)) {
        candidates.push(lower);
        alreadyIncluded.add(lower);
      }
    }
  }

  // Trim to MAX_TAGGED, keeping curriculum words first
  if (candidates.length > MAX_TAGGED) {
    const curriculum = candidates.filter((w) => statutorySet.has(w));
    const nonCurriculum = candidates.filter((w) => !statutorySet.has(w));
    candidates = [
      ...curriculum.slice(0, MAX_TAGGED),
      ...nonCurriculum.slice(0, MAX_TAGGED - Math.min(curriculum.length, MAX_TAGGED)),
    ];
  }

  // Build TaggedWord objects
  return candidates.map((word) => {
    const isCurriculumWord = statutorySet.has(word);
    return {
      word,
      definition: generateDefinition(word, isCurriculumWord),
      passageContext: findSentenceContaining(passage.text, word),
      isCurriculumWord,
    };
  });
}
