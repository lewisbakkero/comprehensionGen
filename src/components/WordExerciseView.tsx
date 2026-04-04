// WordExerciseView — three-step motor memory word exercise UI
// Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.1, 10.2

import { useState, useCallback } from 'react';
import type { TaggedWord, ExerciseSession } from '../types';
import { createExerciseSession } from '../services/motorMemoryExercise';
import { addWord } from '../services/wordBankStore';

export interface WordExerciseViewProps {
  word: TaggedWord;
  onComplete?: () => void;
  onSkip?: () => void;
}

const STEP_LABELS: Record<ExerciseSession['step'], string> = {
  'type-three-times': 'Type the word:',
  'use-in-sentence': 'Use the word in a sentence:',
  'type-from-memory': 'Can you type the word from memory?',
  complete: '',
};

export default function WordExerciseView({ word, onComplete, onSkip }: WordExerciseViewProps) {
  const [session] = useState<ExerciseSession>(() => createExerciseSession(word));
  const [step, setStep] = useState<ExerciseSession['step']>(session.step);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackCorrect, setFeedbackCorrect] = useState<boolean | null>(null);

  const handleSubmit = useCallback(() => {
    if (input.trim() === '') return;

    let result;
    if (step === 'type-three-times') {
      result = session.submitTyping(input);
    } else if (step === 'use-in-sentence') {
      result = session.submitSentence(input);
    } else if (step === 'type-from-memory') {
      result = session.submitMemoryRecall(input);
    } else {
      return;
    }

    setFeedback(result.feedback);
    setFeedbackCorrect(result.correct);
    setStep(session.step);

    if (result.correct) {
      setInput('');
    }

    if (result.nextStep === 'complete') {
      // Save word to word bank
      addWord({
        id: crypto.randomUUID(),
        word: word.word,
        definition: word.definition,
        passageContext: word.passageContext,
        addedDate: new Date(),
        nextReviewDate: new Date(Date.now() + 86400000), // tomorrow
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
        mastered: false,
      }).catch(() => { /* non-critical */ });
      onComplete?.();
    }
  }, [input, step, session, onComplete]);

  const handleSkip = useCallback(() => {
    onSkip?.();
  }, [onSkip]);

  // Completion state — reveal definition + context (Req 4.4)
  if (step === 'complete') {
    return (
      <div
        role="status"
        aria-label="Exercise complete"
        style={{ maxWidth: '600px', margin: '0 auto', padding: '1rem' }}
      >
        <p style={{ fontSize: '1.2em', fontWeight: 600, color: '#2d6a4f', marginBottom: '0.75rem' }}>
          Well done! You've learned a new word!
        </p>
        <div
          style={{
            padding: '1rem',
            background: '#d4edda',
            borderRadius: '8px',
            marginBottom: '0.75rem',
          }}
        >
          <p style={{ fontWeight: 600, fontSize: '1.1em', margin: '0 0 0.5rem' }}>
            {word.word}
          </p>
          <p style={{ margin: '0 0 0.5rem' }}>
            <strong>Definition:</strong> {word.definition}
          </p>
          <p style={{ margin: 0, fontStyle: 'italic' }}>
            <strong>Context:</strong> "{word.passageContext}"
          </p>
        </div>
      </div>
    );
  }

  const progressText =
    step === 'type-three-times'
      ? `${session.correctTypings} of 3`
      : null;

  return (
    <div
      role="region"
      aria-label="Word exercise"
      style={{ maxWidth: '600px', margin: '0 auto', padding: '1rem' }}
    >
      {/* Step label */}
      <h2 style={{ fontSize: '1.15em', fontWeight: 600, marginBottom: '0.5rem', lineHeight: 1.4 }}>
        {STEP_LABELS[step]}
        {step === 'type-three-times' && (
          <span style={{ fontWeight: 400, marginLeft: '0.5rem', color: '#555' }}>
            "{word.word}"
          </span>
        )}
      </h2>

      {/* Progress indicator for type-three-times step */}
      {progressText && (
        <p
          aria-label="Typing progress"
          style={{ color: '#666', fontSize: '0.9em', marginBottom: '0.75rem' }}
        >
          Progress: {progressText}
        </p>
      )}

      {/* Text input */}
      <label htmlFor="exercise-input" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>
        {step === 'use-in-sentence' ? 'Your sentence:' : 'Type here:'}
      </label>
      {step === 'use-in-sentence' ? (
        <textarea
          id="exercise-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          aria-label="Type your sentence"
          style={{
            width: '100%',
            padding: '0.6rem',
            borderRadius: '6px',
            border: feedbackCorrect === false && feedback ? '2px solid #e07a5f' : '1px solid #ccc',
            fontSize: 'inherit',
            fontFamily: 'inherit',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
      ) : (
        <input
          id="exercise-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          aria-label="Type the word"
          style={{
            width: '100%',
            padding: '0.6rem',
            borderRadius: '6px',
            border: feedbackCorrect === false && feedback ? '2px solid #e07a5f' : '1px solid #ccc',
            fontSize: 'inherit',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={input.trim() === ''}
          aria-label="Submit"
          style={{
            padding: '0.5rem 1.2rem',
            borderRadius: '6px',
            border: 'none',
            background: '#4a6fa5',
            color: '#fff',
            cursor: input.trim() === '' ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            opacity: input.trim() === '' ? 0.6 : 1,
          }}
        >
          Submit
        </button>

        {/* Skip button — no negative feedback (Req 10.2) */}
        <button
          type="button"
          onClick={handleSkip}
          aria-label="Skip exercise"
          style={{
            padding: '0.5rem 1.2rem',
            borderRadius: '6px',
            border: '1px solid #999',
            background: 'transparent',
            color: '#666',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Skip
        </button>
      </div>

      {/* Feedback — encouraging language (Req 4.5, 10.4) */}
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          style={{
            marginTop: '0.75rem',
            padding: '0.75rem',
            borderRadius: '8px',
            background: feedbackCorrect ? '#d4edda' : '#fce4e4',
          }}
        >
          <p style={{ margin: 0 }}>{feedback}</p>
        </div>
      )}
    </div>
  );
}
