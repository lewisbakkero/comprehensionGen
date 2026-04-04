import { describe, it, expect } from 'vitest';
import { createExerciseSession } from './motorMemoryExercise';
import type { TaggedWord } from '../types';

function makeWord(word = 'environment'): TaggedWord {
  return {
    word,
    definition: 'The surroundings or conditions in which a person lives.',
    passageContext: 'The ancient environment was marvellous.',
    isCurriculumWord: true,
  };
}

describe('createExerciseSession', () => {
  it('starts at type-three-times with 0 correct typings', () => {
    const session = createExerciseSession(makeWord());
    expect(session.step).toBe('type-three-times');
    expect(session.correctTypings).toBe(0);
  });

  describe('submitTyping (type-three-times step)', () => {
    it('increments correctTypings on correct input', () => {
      const session = createExerciseSession(makeWord());
      const result = session.submitTyping('environment');
      expect(result.correct).toBe(true);
      expect(session.correctTypings).toBe(1);
      expect(result.nextStep).toBe('type-three-times');
    });

    it('is case-insensitive', () => {
      const session = createExerciseSession(makeWord());
      const result = session.submitTyping('ENVIRONMENT');
      expect(result.correct).toBe(true);
      expect(session.correctTypings).toBe(1);
    });

    it('trims whitespace', () => {
      const session = createExerciseSession(makeWord());
      const result = session.submitTyping('  environment  ');
      expect(result.correct).toBe(true);
      expect(session.correctTypings).toBe(1);
    });

    it('transitions to use-in-sentence after 3 correct typings', () => {
      const session = createExerciseSession(makeWord());
      session.submitTyping('environment');
      session.submitTyping('environment');
      const result = session.submitTyping('environment');
      expect(result.correct).toBe(true);
      expect(result.nextStep).toBe('use-in-sentence');
      expect(session.step).toBe('use-in-sentence');
    });

    it('does not advance on incorrect input', () => {
      const session = createExerciseSession(makeWord());
      const result = session.submitTyping('enviroment');
      expect(result.correct).toBe(false);
      expect(session.correctTypings).toBe(0);
      expect(result.nextStep).toBe('type-three-times');
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('ignores empty submissions', () => {
      const session = createExerciseSession(makeWord());
      const result = session.submitTyping('');
      expect(result.correct).toBe(false);
      expect(result.feedback).toBe('');
      expect(session.correctTypings).toBe(0);
      expect(result.nextStep).toBe('type-three-times');
    });

    it('ignores whitespace-only submissions', () => {
      const session = createExerciseSession(makeWord());
      const result = session.submitTyping('   ');
      expect(result.correct).toBe(false);
      expect(result.feedback).toBe('');
      expect(session.correctTypings).toBe(0);
    });

    it('provides encouraging feedback on incorrect input', () => {
      const session = createExerciseSession(makeWord());
      const result = session.submitTyping('wrong');
      expect(result.correct).toBe(false);
      expect(result.feedback.length).toBeGreaterThan(0);
    });
  });

  describe('submitSentence (use-in-sentence step)', () => {
    function sessionAtSentenceStep() {
      const session = createExerciseSession(makeWord());
      session.submitTyping('environment');
      session.submitTyping('environment');
      session.submitTyping('environment');
      return session;
    }

    it('accepts a sentence containing the target word', () => {
      const session = sessionAtSentenceStep();
      const result = session.submitSentence('The environment is beautiful.');
      expect(result.correct).toBe(true);
      expect(result.nextStep).toBe('type-from-memory');
      expect(session.step).toBe('type-from-memory');
    });

    it('is case-insensitive for word matching', () => {
      const session = sessionAtSentenceStep();
      const result = session.submitSentence('The ENVIRONMENT is great.');
      expect(result.correct).toBe(true);
      expect(result.nextStep).toBe('type-from-memory');
    });

    it('rejects a sentence without the target word', () => {
      const session = sessionAtSentenceStep();
      const result = session.submitSentence('The weather is nice today.');
      expect(result.correct).toBe(false);
      expect(result.nextStep).toBe('use-in-sentence');
      expect(session.step).toBe('use-in-sentence');
    });

    it('ignores empty submissions', () => {
      const session = sessionAtSentenceStep();
      const result = session.submitSentence('');
      expect(result.correct).toBe(false);
      expect(result.feedback).toBe('');
      expect(session.step).toBe('use-in-sentence');
    });

    it('ignores whitespace-only submissions', () => {
      const session = sessionAtSentenceStep();
      const result = session.submitSentence('   ');
      expect(result.correct).toBe(false);
      expect(result.feedback).toBe('');
    });

    it('provides encouraging feedback when word is missing', () => {
      const session = sessionAtSentenceStep();
      const result = session.submitSentence('I like cats.');
      expect(result.correct).toBe(false);
      expect(result.feedback.length).toBeGreaterThan(0);
    });
  });

  describe('submitMemoryRecall (type-from-memory step)', () => {
    function sessionAtMemoryStep() {
      const session = createExerciseSession(makeWord());
      session.submitTyping('environment');
      session.submitTyping('environment');
      session.submitTyping('environment');
      session.submitSentence('The environment is lovely.');
      return session;
    }

    it('transitions to complete on correct recall', () => {
      const session = sessionAtMemoryStep();
      const result = session.submitMemoryRecall('environment');
      expect(result.correct).toBe(true);
      expect(result.nextStep).toBe('complete');
      expect(session.step).toBe('complete');
    });

    it('is case-insensitive', () => {
      const session = sessionAtMemoryStep();
      const result = session.submitMemoryRecall('Environment');
      expect(result.correct).toBe(true);
      expect(result.nextStep).toBe('complete');
    });

    it('trims whitespace', () => {
      const session = sessionAtMemoryStep();
      const result = session.submitMemoryRecall('  environment  ');
      expect(result.correct).toBe(true);
      expect(result.nextStep).toBe('complete');
    });

    it('reveals definition and context on completion', () => {
      const session = sessionAtMemoryStep();
      const result = session.submitMemoryRecall('environment');
      expect(result.feedback).toContain('environment');
      expect(result.feedback).toContain('surroundings');
      expect(result.feedback).toContain('ancient environment');
    });

    it('does not advance on incorrect recall', () => {
      const session = sessionAtMemoryStep();
      const result = session.submitMemoryRecall('enviroment');
      expect(result.correct).toBe(false);
      expect(result.nextStep).toBe('type-from-memory');
      expect(session.step).toBe('type-from-memory');
    });

    it('ignores empty submissions', () => {
      const session = sessionAtMemoryStep();
      const result = session.submitMemoryRecall('');
      expect(result.correct).toBe(false);
      expect(result.feedback).toBe('');
      expect(session.step).toBe('type-from-memory');
    });

    it('provides encouraging feedback on incorrect recall', () => {
      const session = sessionAtMemoryStep();
      const result = session.submitMemoryRecall('wrong');
      expect(result.correct).toBe(false);
      expect(result.feedback.length).toBeGreaterThan(0);
    });
  });

  describe('full exercise flow', () => {
    it('completes the entire three-step flow', () => {
      const session = createExerciseSession(makeWord());

      // Step 1: type three times
      expect(session.step).toBe('type-three-times');
      session.submitTyping('environment');
      session.submitTyping('environment');
      const r1 = session.submitTyping('environment');
      expect(r1.nextStep).toBe('use-in-sentence');

      // Step 2: use in sentence
      expect(session.step).toBe('use-in-sentence');
      const r2 = session.submitSentence('I love the environment.');
      expect(r2.nextStep).toBe('type-from-memory');

      // Step 3: type from memory
      expect(session.step).toBe('type-from-memory');
      const r3 = session.submitMemoryRecall('environment');
      expect(r3.nextStep).toBe('complete');
      expect(session.step).toBe('complete');
    });

    it('handles incorrect attempts without penalty throughout the flow', () => {
      const session = createExerciseSession(makeWord());

      // Incorrect typing doesn't change correctTypings
      session.submitTyping('wrong');
      expect(session.correctTypings).toBe(0);
      expect(session.step).toBe('type-three-times');

      // Correct typings still work after incorrect ones
      session.submitTyping('environment');
      session.submitTyping('environment');
      session.submitTyping('environment');
      expect(session.step).toBe('use-in-sentence');

      // Incorrect sentence doesn't advance
      session.submitSentence('No word here.');
      expect(session.step).toBe('use-in-sentence');

      // Correct sentence advances
      session.submitSentence('The environment is key.');
      expect(session.step).toBe('type-from-memory');

      // Incorrect recall doesn't advance
      session.submitMemoryRecall('wrong');
      expect(session.step).toBe('type-from-memory');

      // Correct recall completes
      session.submitMemoryRecall('environment');
      expect(session.step).toBe('complete');
    });
  });
});
