import type { TaggedWord, ExerciseSession, ExerciseStepResult } from '../types';

/**
 * Creates a mutable exercise session for a given tagged word.
 * Three-step flow: type-three-times → use-in-sentence → type-from-memory → complete
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 2.3
 */
export function createExerciseSession(word: TaggedWord): ExerciseSession {
  const targetWord = word.word;

  const session: ExerciseSession = {
    step: 'type-three-times',
    correctTypings: 0,

    submitTyping(input: string): ExerciseStepResult {
      const trimmed = input.trim();

      // Ignore empty/whitespace-only submissions
      if (trimmed === '') {
        return {
          correct: false,
          feedback: '',
          nextStep: session.step,
        };
      }

      if (trimmed.toLowerCase() === targetWord.toLowerCase()) {
        session.correctTypings++;

        if (session.correctTypings >= 3) {
          session.step = 'use-in-sentence';
          return {
            correct: true,
            feedback: 'Brilliant! You typed it perfectly all three times. Now try using it in a sentence.',
            nextStep: 'use-in-sentence',
          };
        }

        return {
          correct: true,
          feedback: `Great job! ${session.correctTypings} of 3 — keep going!`,
          nextStep: 'type-three-times',
        };
      }

      // Incorrect — stay at same step, encouraging feedback
      return {
        correct: false,
        feedback: "Not quite — have another go, you're doing well!",
        nextStep: 'type-three-times',
      };
    },

    submitSentence(sentence: string): ExerciseStepResult {
      const trimmed = sentence.trim();

      // Ignore empty/whitespace-only submissions
      if (trimmed === '') {
        return {
          correct: false,
          feedback: '',
          nextStep: session.step,
        };
      }

      // Accept any non-empty sentence containing the target word (case-insensitive)
      if (trimmed.toLowerCase().includes(targetWord.toLowerCase())) {
        session.step = 'type-from-memory';
        return {
          correct: true,
          feedback: 'Lovely sentence! Now see if you can type the word from memory.',
          nextStep: 'type-from-memory',
        };
      }

      // Word not found in sentence
      return {
        correct: false,
        feedback: 'Try using the word in your sentence. You can do it!',
        nextStep: 'use-in-sentence',
      };
    },

    submitMemoryRecall(input: string): ExerciseStepResult {
      const trimmed = input.trim();

      // Ignore empty/whitespace-only submissions
      if (trimmed === '') {
        return {
          correct: false,
          feedback: '',
          nextStep: session.step,
        };
      }

      if (trimmed.toLowerCase() === targetWord.toLowerCase()) {
        session.step = 'complete';
        return {
          correct: true,
          feedback: `Amazing! You remembered "${targetWord}" perfectly! Here is what it means: ${word.definition}. It was used in: "${word.passageContext}"`,
          nextStep: 'complete',
        };
      }

      // Incorrect — stay at same step
      return {
        correct: false,
        feedback: "Nearly there — give it one more try, you've got this!",
        nextStep: 'type-from-memory',
      };
    },
  };

  return session;
}
