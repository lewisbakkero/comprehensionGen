// QuestionView — comprehension questions with scaffolding hints
// Requirements: 3.1, 3.3, 3.4, 3.5, 3.6, 10.1, 10.2, 10.3, 10.4

import { useState, useCallback } from 'react';
import type { ComprehensionQuestion } from '../types';
import { evaluateAnswer } from '../services/questionGenerator';

export interface QuestionViewProps {
  questions: ComprehensionQuestion[];
  onComplete?: () => void;
}

type FeedbackType = 'correct' | 'partial' | 'incorrect' | 'skipped' | null;

const FEEDBACK_MESSAGES: Record<Exclude<FeedbackType, null>, string> = {
  correct: "Well done! That's a great answer.",
  partial: "Good thinking! You're on the right track.",
  incorrect: "Not quite, but that's okay. Let's look at some hints.",
  skipped: "No worries, let's try the next one!",
};

/**
 * ScaffoldingHints — reveals graduated hints one at a time
 * and highlights the relevant passage section.
 * Requirements: 3.4, 3.5
 */
export function ScaffoldingHints({
  hints,
  relevantSection,
  hintsRevealed,
}: {
  hints: string[];
  relevantSection: string;
  hintsRevealed: number;
}) {
  if (hintsRevealed === 0) return null;

  return (
    <div role="region" aria-label="Hints" style={{ marginTop: '0.75rem' }}>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {hints.slice(0, hintsRevealed).map((hint, idx) => (
          <li
            key={idx}
            style={{
              padding: '0.5rem 0.75rem',
              marginBottom: '0.4rem',
              background: '#e8f4fd',
              borderRadius: '6px',
              borderLeft: '3px solid #4a9fd5',
            }}
          >
            {hint}
          </li>
        ))}
      </ul>

      {/* Highlight the relevant passage section */}
      <div
        aria-label="Relevant passage section"
        style={{
          marginTop: '0.5rem',
          padding: '0.6rem 0.75rem',
          background: '#fff3cd',
          borderRadius: '6px',
          borderLeft: '3px solid #f59e0b',
          fontStyle: 'italic',
        }}
      >
        {relevantSection}
      </div>
    </div>
  );
}

export default function QuestionView({ questions, onComplete }: QuestionViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const currentQuestion: ComprehensionQuestion | undefined = questions[currentIndex];
  const isLastQuestion = currentIndex >= questions.length - 1;
  const isComplete = currentIndex >= questions.length;

  const resetForNextQuestion = useCallback(() => {
    setAnswer('');
    setFeedback(null);
    setHintsRevealed(0);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!currentQuestion || answer.trim() === '' || submitting) return;

    setSubmitting(true);
    try {
      const result = await evaluateAnswer(
        answer,
        currentQuestion.modelAnswer,
        currentQuestion.text,
      );
      setFeedback(result as FeedbackType);
    } catch {
      // Default to partial on error — benefit of the doubt
      setFeedback('partial');
    } finally {
      setSubmitting(false);
    }
  }, [currentQuestion, answer, submitting]);

  const handleSkip = useCallback(() => {
    setFeedback('skipped');
  }, []);

  const handleShowHint = useCallback(() => {
    if (!currentQuestion) return;
    setHintsRevealed((prev) => Math.min(prev + 1, currentQuestion.hints.length));
  }, [currentQuestion]);

  const handleNext = useCallback(() => {
    if (isLastQuestion) {
      setCurrentIndex(questions.length); // triggers completion view
      onComplete?.();
    } else {
      setCurrentIndex((prev) => prev + 1);
      resetForNextQuestion();
    }
  }, [isLastQuestion, questions.length, onComplete, resetForNextQuestion]);

  // Completion state
  if (isComplete || questions.length === 0) {
    return (
      <div
        role="status"
        aria-label="Questions complete"
        style={{ textAlign: 'center', padding: '2rem 1rem' }}
      >
        <p style={{ fontSize: '1.2em', fontWeight: 600, color: '#2d6a4f' }}>
          {questions.length === 0
            ? 'No questions available right now.'
            : "Great job! You've finished all the questions. Keep up the fantastic work!"}
        </p>
      </div>
    );
  }

  const hasMoreHints = hintsRevealed < currentQuestion.hints.length;
  const hasFeedback = feedback !== null;

  return (
    <div
      role="region"
      aria-label="Comprehension questions"
      style={{ maxWidth: '680px', margin: '0 auto', padding: '1rem' }}
    >
      {/* Question counter — no scores, just position */}
      <p style={{ color: '#666', marginBottom: '0.5rem', fontSize: '0.9em' }}>
        Question {currentIndex + 1} of {questions.length}
      </p>

      {/* Question text */}
      <h2
        style={{
          fontSize: '1.15em',
          fontWeight: 600,
          marginBottom: '1rem',
          lineHeight: 1.4,
        }}
      >
        {currentQuestion.text}
      </h2>

      {/* Answer input — no timer (Req 10.1) */}
      {!hasFeedback && (
        <div>
          <label htmlFor="answer-input" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>
            Your answer:
          </label>
          <textarea
            id="answer-input"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={3}
            aria-label="Type your answer"
            style={{
              width: '100%',
              padding: '0.6rem',
              borderRadius: '6px',
              border: '1px solid #ccc',
              fontSize: 'inherit',
              fontFamily: 'inherit',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={answer.trim() === '' || submitting}
              aria-label="Submit answer"
              style={{
                padding: '0.5rem 1.2rem',
                borderRadius: '6px',
                border: 'none',
                background: '#4a6fa5',
                color: '#fff',
                cursor: answer.trim() === '' || submitting ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                opacity: answer.trim() === '' || submitting ? 0.6 : 1,
              }}
            >
              {submitting ? 'Checking…' : 'Submit'}
            </button>

            {/* Show Hint button — graduated hints (Req 3.4) */}
            {hasMoreHints && (
              <button
                type="button"
                onClick={handleShowHint}
                aria-label="Show hint"
                style={{
                  padding: '0.5rem 1.2rem',
                  borderRadius: '6px',
                  border: '1px solid #4a9fd5',
                  background: 'transparent',
                  color: '#4a9fd5',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Show Hint
              </button>
            )}

            {/* Skip button — no negative feedback (Req 10.2) */}
            <button
              type="button"
              onClick={handleSkip}
              aria-label="Skip question"
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

          {/* Hints shown before submitting */}
          <ScaffoldingHints
            hints={currentQuestion.hints}
            relevantSection={currentQuestion.relevantSection}
            hintsRevealed={hintsRevealed}
          />
        </div>
      )}

      {/* Feedback display — encouraging language (Req 10.3, 10.4) */}
      {hasFeedback && (
        <div
          role="status"
          aria-live="polite"
          style={{
            padding: '1rem',
            borderRadius: '8px',
            marginTop: '0.5rem',
            background:
              feedback === 'correct'
                ? '#d4edda'
                : feedback === 'partial'
                  ? '#fff3cd'
                  : feedback === 'skipped'
                    ? '#e2e8f0'
                    : '#fce4e4',
          }}
        >
          <p style={{ fontWeight: 600, margin: 0, marginBottom: '0.5rem' }}>
            {FEEDBACK_MESSAGES[feedback!]}
          </p>

          {/* Show all hints + relevant section after incorrect feedback */}
          {feedback === 'incorrect' && (
            <ScaffoldingHints
              hints={currentQuestion.hints}
              relevantSection={currentQuestion.relevantSection}
              hintsRevealed={currentQuestion.hints.length}
            />
          )}

          {/* Next / Finish button */}
          <button
            type="button"
            onClick={handleNext}
            aria-label={isLastQuestion ? 'Finish questions' : 'Next question'}
            style={{
              marginTop: '0.75rem',
              padding: '0.5rem 1.2rem',
              borderRadius: '6px',
              border: 'none',
              background: '#4a6fa5',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {isLastQuestion ? 'Finish' : 'Next Question'}
          </button>
        </div>
      )}
    </div>
  );
}
