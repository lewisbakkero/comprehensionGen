// QuestionView — comprehension questions with detailed feedback, scoring, and review

import { useState, useCallback } from 'react';
import type { ComprehensionQuestion } from '../types';

export interface QuestionViewProps {
  questions: ComprehensionQuestion[];
  onComplete?: (results: QuestionResult[]) => void;
}

export interface QuestionResult {
  question: ComprehensionQuestion;
  studentAnswer: string;
  evaluation: 'correct' | 'partial' | 'incorrect' | 'skipped';
}

type FeedbackType = 'correct' | 'partial' | 'incorrect' | 'skipped' | null;

function evaluateLocally(learnerAnswer: string, modelAnswer: string): FeedbackType {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  const stops = new Set(['the','and','was','were','are','for','that','this','with','from','they','have','has','had','but','not','you','all','can','her','his','one','our','out','its','also','been','then','than','them','into','some','very','just','about','would','could','should','which','their','there','what','when','where','who','how','each','other','more','most','only','over','such','after','before']);
  const learnerWords = new Set(clean(learnerAnswer).filter(w => !stops.has(w)));
  const modelWords = new Set(clean(modelAnswer).filter(w => !stops.has(w)));
  if (learnerWords.size === 0) return 'incorrect';
  let matches = 0;
  for (const w of learnerWords) { if (modelWords.has(w)) matches++; }
  const score = modelWords.size > 0 ? ((matches / modelWords.size) + (matches / learnerWords.size)) / 2 : 0;
  if (score >= 0.4) return 'correct';
  if (score >= 0.15) return 'partial';
  return 'incorrect';
}

export function ScaffoldingHints({ hints, relevantSection, hintsRevealed }: { hints: string[]; relevantSection: string; hintsRevealed: number }) {
  if (hintsRevealed === 0) return null;
  return (
    <div role="region" aria-label="Hints" style={{ marginTop: '0.75rem' }}>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {hints.slice(0, hintsRevealed).map((hint, idx) => (
          <li key={idx} style={{ padding: '0.5rem 0.75rem', marginBottom: '0.4rem', background: '#e8f4fd', borderRadius: '6px', borderLeft: '3px solid #4a9fd5' }}>{hint}</li>
        ))}
      </ul>
      <div aria-label="Relevant passage section" style={{ marginTop: '0.5rem', padding: '0.6rem 0.75rem', background: '#fff3cd', borderRadius: '6px', borderLeft: '3px solid #f59e0b', fontStyle: 'italic' }}>{relevantSection}</div>
    </div>
  );
}

export default function QuestionView({ questions, onComplete }: QuestionViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [showReview, setShowReview] = useState(false);

  const currentQuestion: ComprehensionQuestion | undefined = questions[currentIndex];
  const isLastQuestion = currentIndex >= questions.length - 1;

  const resetForNextQuestion = useCallback(() => {
    setAnswer('');
    setFeedback(null);
    setHintsRevealed(0);
  }, []);

  const recordResult = useCallback((evaluation: QuestionResult['evaluation'], studentAnswer: string) => {
    if (!currentQuestion) return;
    setResults(prev => [...prev, { question: currentQuestion, studentAnswer, evaluation }]);
  }, [currentQuestion]);

  const handleSubmit = useCallback(() => {
    if (!currentQuestion || answer.trim() === '') return;
    const result = evaluateLocally(answer, currentQuestion.modelAnswer);
    setFeedback(result);
    recordResult(result!, answer);
  }, [currentQuestion, answer, recordResult]);

  const handleSkip = useCallback(() => {
    setFeedback('skipped');
    recordResult('skipped', '');
  }, [recordResult]);

  const handleShowHint = useCallback(() => {
    if (!currentQuestion) return;
    setHintsRevealed(prev => Math.min(prev + 1, currentQuestion.hints.length));
  }, [currentQuestion]);

  const handleNext = useCallback(() => {
    if (isLastQuestion) {
      // results already includes the last answer (recorded on submit/skip)
      setShowReview(true);
      // Use a timeout to ensure state has flushed
      setTimeout(() => onComplete?.(results), 0);
    } else {
      setCurrentIndex(prev => prev + 1);
      resetForNextQuestion();
    }
  }, [isLastQuestion, onComplete, results, resetForNextQuestion]);

  // ── Review summary view ──
  if (showReview) {
    const correctCount = results.filter(r => r.evaluation === 'correct').length;
    const partialCount = results.filter(r => r.evaluation === 'partial').length;
    const totalAnswered = results.filter(r => r.evaluation !== 'skipped').length;

    return (
      <div role="region" aria-label="Test review" style={{ maxWidth: '720px', margin: '0 auto', padding: '1rem' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>📝 Your Answers</h2>
        <p style={{ textAlign: 'center', color: '#555', marginBottom: '1.5rem' }}>
          You answered {totalAnswered} of {questions.length} questions.
          {correctCount > 0 && ` ${correctCount} correct`}{partialCount > 0 && `, ${partialCount} partially correct`}.
          {correctCount === questions.length ? ' Perfect! 🌟' : ' Keep practising — you\'re doing great!'}
        </p>

        {results.map((r, idx) => (
          <div key={idx} style={{
            marginBottom: '1.25rem', padding: '1rem', borderRadius: '8px',
            border: '1px solid #ddd',
            background: r.evaluation === 'correct' ? '#f0fdf4' : r.evaluation === 'partial' ? '#fffbeb' : r.evaluation === 'skipped' ? '#f8fafc' : '#fef2f2',
          }}>
            <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#333' }}>
              {idx + 1}. {r.question.text}
              <span style={{ marginLeft: '0.5rem', fontSize: '0.85em',
                color: r.evaluation === 'correct' ? '#16a34a' : r.evaluation === 'partial' ? '#d97706' : r.evaluation === 'skipped' ? '#6b7280' : '#dc2626',
              }}>
                ({r.evaluation === 'correct' ? '✓ Correct' : r.evaluation === 'partial' ? '◐ Partial' : r.evaluation === 'skipped' ? '→ Skipped' : '✗ Incorrect'})
              </span>
            </p>

            {r.studentAnswer && (
              <div style={{ marginBottom: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.03)', borderRadius: '6px', borderLeft: '3px solid #999' }}>
                <p style={{ margin: 0, fontSize: '0.8em', color: '#666', fontWeight: 600 }}>Your answer:</p>
                <p style={{ margin: '0.2rem 0 0' }}>{r.studentAnswer}</p>
              </div>
            )}

            <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.03)', borderRadius: '6px', borderLeft: '3px solid #16a34a' }}>
              <p style={{ margin: 0, fontSize: '0.8em', color: '#16a34a', fontWeight: 600 }}>Correct answer:</p>
              <p style={{ margin: '0.2rem 0 0' }}>{r.question.modelAnswer}</p>
            </div>

            <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: '#fff3cd', borderRadius: '6px', borderLeft: '3px solid #f59e0b', fontSize: '0.9em' }}>
              <p style={{ margin: 0, fontStyle: 'italic' }}>📖 {r.question.relevantSection}</p>
            </div>
          </div>
        ))}

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <p style={{ fontWeight: 600, color: '#2d6a4f', fontSize: '1.1em' }}>
            Well done for completing the questions! 🌟
          </p>
        </div>
      </div>
    );
  }

  // ── Empty state ──
  if (questions.length === 0) {
    return (
      <div role="status" aria-label="Questions complete" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        <p style={{ fontSize: '1.2em', fontWeight: 600, color: '#2d6a4f' }}>No questions available right now.</p>
      </div>
    );
  }

  const hasMoreHints = hintsRevealed < currentQuestion.hints.length;
  const hasFeedback = feedback !== null;

  // ── Cumulative score bar ──
  const answeredSoFar = results.length;
  const correctSoFar = results.filter(r => r.evaluation === 'correct').length;

  return (
    <div role="region" aria-label="Comprehension questions" style={{ maxWidth: '680px', margin: '0 auto', padding: '1rem' }}>
      {/* Progress bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <p style={{ color: '#666', fontSize: '0.9em', margin: 0 }}>
          Question {currentIndex + 1} of {questions.length}
        </p>
        {answeredSoFar > 0 && (
          <p style={{ color: '#2d6a4f', fontSize: '0.85em', margin: 0, fontWeight: 600 }}>
            ⭐ {correctSoFar}/{answeredSoFar} correct so far
          </p>
        )}
      </div>

      <h2 style={{ fontSize: '1.15em', fontWeight: 600, marginBottom: '1rem', lineHeight: 1.4 }}>
        {currentQuestion.text}
      </h2>

      {/* Answer input */}
      {!hasFeedback && (
        <div>
          <label htmlFor="answer-input" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>Your answer:</label>
          <textarea id="answer-input" value={answer} onChange={e => setAnswer(e.target.value)} rows={3}
            aria-label="Type your answer"
            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: 'inherit', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={handleSubmit} disabled={answer.trim() === ''} aria-label="Submit answer"
              style={{ padding: '0.5rem 1.2rem', borderRadius: '6px', border: 'none', background: '#4a6fa5', color: '#fff', cursor: answer.trim() === '' ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: answer.trim() === '' ? 0.6 : 1 }}
            >Submit</button>
            {hasMoreHints && (
              <button type="button" onClick={handleShowHint} aria-label="Show hint"
                style={{ padding: '0.5rem 1.2rem', borderRadius: '6px', border: '1px solid #4a9fd5', background: 'transparent', color: '#4a9fd5', cursor: 'pointer', fontWeight: 500 }}
              >Show Hint</button>
            )}
            <button type="button" onClick={handleSkip} aria-label="Skip question"
              style={{ padding: '0.5rem 1.2rem', borderRadius: '6px', border: '1px solid #999', background: 'transparent', color: '#666', cursor: 'pointer', fontWeight: 500 }}
            >Skip</button>
          </div>
          <ScaffoldingHints hints={currentQuestion.hints} relevantSection={currentQuestion.relevantSection} hintsRevealed={hintsRevealed} />
        </div>
      )}

      {/* Feedback after submit/skip */}
      {hasFeedback && currentQuestion != null && (
        <FeedbackPanel
          feedback={feedback}
          studentAnswer={answer}
          question={currentQuestion}
          isLastQuestion={isLastQuestion}
          onNext={handleNext}
        />
      )}
    </div>
  );
}

function FeedbackPanel({ feedback, studentAnswer, question, isLastQuestion, onNext }: {
  feedback: FeedbackType;
  studentAnswer: string;
  question: ComprehensionQuestion;
  isLastQuestion: boolean;
  onNext: () => void;
}) {
  const bgColor = feedback === 'correct' ? '#d4edda' : feedback === 'partial' ? '#fff3cd' : feedback === 'skipped' ? '#e2e8f0' : '#fce4e4';
  const emoji = feedback === 'correct' ? '⭐' : feedback === 'partial' ? '💡' : feedback === 'skipped' ? '➡️' : '🤔';

  const message = feedback === 'correct'
    ? "Well done! You've got the key points."
    : feedback === 'partial'
    ? "Good thinking! You're on the right track. Compare your answer with the correct one below to see what you could add."
    : feedback === 'skipped'
    ? "No worries! Read the correct answer below — it will help you next time."
    : "Not quite this time, but that's okay! Read the correct answer carefully and compare it with yours to see what was different.";

  return (
    <div role="status" aria-live="polite" style={{ padding: '1rem', borderRadius: '8px', marginTop: '0.75rem', background: bgColor }}>
      <p style={{ fontWeight: 600, margin: '0 0 0.75rem', fontSize: '1.05em' }}>{emoji} {message}</p>

      {/* Student's answer */}
      {feedback !== 'skipped' && studentAnswer.trim() && (
        <div style={{ marginBottom: '0.75rem', padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.6)', borderRadius: '6px', borderLeft: '3px solid #999' }}>
          <p style={{ margin: 0, fontSize: '0.85em', color: '#666', fontWeight: 600 }}>Your answer:</p>
          <p style={{ margin: '0.25rem 0 0' }}>{studentAnswer}</p>
        </div>
      )}

      {/* Correct answer — always shown */}
      <div style={{ padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.8)', borderRadius: '6px', borderLeft: '3px solid #16a34a' }}>
        <p style={{ margin: 0, fontSize: '0.85em', color: '#16a34a', fontWeight: 600 }}>Correct answer:</p>
        <p style={{ margin: '0.25rem 0 0' }}>{question.modelAnswer}</p>
      </div>

      {/* Passage evidence */}
      <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', background: '#fff3cd', borderRadius: '6px', borderLeft: '3px solid #f59e0b' }}>
        <p style={{ margin: 0, fontSize: '0.85em', color: '#92600a', fontWeight: 600 }}>📖 From the passage:</p>
        <p style={{ margin: '0.25rem 0 0', fontStyle: 'italic' }}>{question.relevantSection}</p>
      </div>

      {/* Question-type tip when not correct */}
      {feedback !== 'correct' && feedback !== 'skipped' && (
        <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', background: '#e8f4fd', borderRadius: '6px', borderLeft: '3px solid #4a9fd5' }}>
          <p style={{ margin: 0, fontSize: '0.85em', color: '#1a5276', fontWeight: 600 }}>💡 Tip:</p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.95em' }}>{getTipForQuestionType(question.type)}</p>
        </div>
      )}

      <button type="button" onClick={onNext}
        aria-label={isLastQuestion ? 'See your results' : 'Next question'}
        style={{ marginTop: '1rem', padding: '0.5rem 1.2rem', borderRadius: '6px', border: 'none', background: '#4a6fa5', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
      >{isLastQuestion ? 'See My Results' : 'Next Question'}</button>
    </div>
  );
}

function getTipForQuestionType(type: ComprehensionQuestion['type']): string {
  switch (type) {
    case 'retrieval': return 'For retrieval questions, the answer is stated directly in the passage. Scan for key words from the question to find the right sentence.';
    case 'inference': return 'For inference questions, the answer isn\'t stated directly — you need to read between the lines. Look at what characters do and how things are described for clues.';
    case 'vocabulary': return 'For vocabulary questions, re-read the sentence containing the word. The surrounding words often give strong clues about its meaning.';
    case 'authors-purpose': return 'For author\'s purpose questions, think about why the author chose those specific words or details. What feeling or image were they trying to create?';
    case 'summarisation': return 'For summary questions, identify the main point of each paragraph and combine them. Leave out small details — focus on the big picture.';
    default: return 'Read the question carefully and look back at the passage for clues.';
  }
}
