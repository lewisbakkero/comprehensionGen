// QuestionView — comprehension questions with local evaluation and model answer feedback

import { useState, useCallback } from 'react';
import type { ComprehensionQuestion } from '../types';

export interface QuestionViewProps {
  questions: ComprehensionQuestion[];
  onComplete?: () => void;
}

type FeedbackType = 'correct' | 'partial' | 'incorrect' | 'skipped' | null;

/**
 * Local answer evaluation — compares learner answer against model answer
 * using keyword overlap. No LLM needed.
 */
function evaluateLocally(learnerAnswer: string, modelAnswer: string): FeedbackType {
  const learnerWords = new Set(
    learnerAnswer.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2)
  );
  const modelWords = new Set(
    modelAnswer.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2)
  );

  // Remove common stop words
  const stops = new Set(['the','and','was','were','are','for','that','this','with','from','they','have','has','had','but','not','you','all','can','her','his','one','our','out','its','also','been','then','than','them','into','some','very','just','about','would','could','should','which','their','there','what','when','where','who','how','each','other','more','most','only','over','such','after','before']);
  for (const s of stops) { learnerWords.delete(s); modelWords.delete(s); }

  if (learnerWords.size === 0) return 'incorrect';

  let matches = 0;
  for (const w of learnerWords) {
    if (modelWords.has(w)) matches++;
  }

  const coverage = modelWords.size > 0 ? matches / modelWords.size : 0;
  const precision = learnerWords.size > 0 ? matches / learnerWords.size : 0;
  const score = (coverage + precision) / 2;

  if (score >= 0.4) return 'correct';
  if (score >= 0.15) return 'partial';
  return 'incorrect';
}

export function ScaffoldingHints({
  hints, relevantSection, hintsRevealed,
}: { hints: string[]; relevantSection: string; hintsRevealed: number }) {
  if (hintsRevealed === 0) return null;
  return (
    <div role="region" aria-label="Hints" style={{ marginTop: '0.75rem' }}>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {hints.slice(0, hintsRevealed).map((hint, idx) => (
          <li key={idx} style={{ padding: '0.5rem 0.75rem', marginBottom: '0.4rem', background: '#e8f4fd', borderRadius: '6px', borderLeft: '3px solid #4a9fd5' }}>
            {hint}
          </li>
        ))}
      </ul>
      <div aria-label="Relevant passage section" style={{ marginTop: '0.5rem', padding: '0.6rem 0.75rem', background: '#fff3cd', borderRadius: '6px', borderLeft: '3px solid #f59e0b', fontStyle: 'italic' }}>
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

  const currentQuestion: ComprehensionQuestion | undefined = questions[currentIndex];
  const isLastQuestion = currentIndex >= questions.length - 1;
  const isComplete = currentIndex >= questions.length;

  const resetForNextQuestion = useCallback(() => {
    setAnswer('');
    setFeedback(null);
    setHintsRevealed(0);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!currentQuestion || answer.trim() === '') return;
    const result = evaluateLocally(answer, currentQuestion.modelAnswer);
    setFeedback(result);
  }, [currentQuestion, answer]);

  const handleSkip = useCallback(() => {
    setFeedback('skipped');
  }, []);

  const handleShowHint = useCallback(() => {
    if (!currentQuestion) return;
    setHintsRevealed((prev) => Math.min(prev + 1, currentQuestion.hints.length));
  }, [currentQuestion]);

  const handleNext = useCallback(() => {
    if (isLastQuestion) {
      setCurrentIndex(questions.length);
      onComplete?.();
    } else {
      setCurrentIndex((prev) => prev + 1);
      resetForNextQuestion();
    }
  }, [isLastQuestion, questions.length, onComplete, resetForNextQuestion]);

  if (isComplete || questions.length === 0) {
    return (
      <div role="status" aria-label="Questions complete" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        <p style={{ fontSize: '1.2em', fontWeight: 600, color: '#2d6a4f' }}>
          {questions.length === 0
            ? 'No questions available right now.'
            : "Great job! You've finished all the questions. Keep up the fantastic work! 🌟"}
        </p>
      </div>
    );
  }

  const hasMoreHints = hintsRevealed < currentQuestion.hints.length;
  const hasFeedback = feedback !== null;

  // Feedback messages with specific guidance
  const feedbackContent = () => {
    if (!hasFeedback || !currentQuestion) return null;

    const bgColor = feedback === 'correct' ? '#d4edda'
      : feedback === 'partial' ? '#fff3cd'
      : feedback === 'skipped' ? '#e2e8f0'
      : '#fce4e4';

    const emoji = feedback === 'correct' ? '⭐' : feedback === 'partial' ? '💡' : feedback === 'skipped' ? '➡️' : '🤔';

    const message = feedback === 'correct'
      ? "Well done! You've got the key points."
      : feedback === 'partial'
      ? "Good thinking! You're on the right track. Have a look at the full answer below to see what else you could include."
      : feedback === 'skipped'
      ? "No worries! Have a read of the answer below — it might help next time."
      : "Not quite this time, but that's okay! Read the answer below carefully — you'll spot what to look for next time.";

    return (
      <div role="status" aria-live="polite" style={{ padding: '1rem', borderRadius: '8px', marginTop: '0.75rem', background: bgColor }}>
        <p style={{ fontWeight: 600, margin: '0 0 0.75rem', fontSize: '1.05em' }}>
          {emoji} {message}
        </p>

        {/* Always show the student's answer back to them (except skip) */}
        {feedback !== 'skipped' && answer.trim() && (
          <div style={{ marginBottom: '0.75rem', padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.6)', borderRadius: '6px', borderLeft: '3px solid #999' }}>
            <p style={{ margin: 0, fontSize: '0.85em', color: '#666', fontWeight: 600 }}>Your answer:</p>
            <p style={{ margin: '0.25rem 0 0' }}>{answer}</p>
          </div>
        )}

        {/* Always show the model answer */}
        <div style={{ padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.8)', borderRadius: '6px', borderLeft: '3px solid #2d6a4f' }}>
          <p style={{ margin: 0, fontSize: '0.85em', color: '#2d6a4f', fontWeight: 600 }}>
            {feedback === 'correct' ? 'Here\'s a full example answer:' : 'The answer we were looking for:'}
          </p>
          <p style={{ margin: '0.25rem 0 0' }}>{currentQuestion.modelAnswer}</p>
        </div>

        {/* Show relevant passage section so they can see where the answer comes from */}
        <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', background: '#fff3cd', borderRadius: '6px', borderLeft: '3px solid #f59e0b' }}>
          <p style={{ margin: 0, fontSize: '0.85em', color: '#92600a', fontWeight: 600 }}>From the passage:</p>
          <p style={{ margin: '0.25rem 0 0', fontStyle: 'italic' }}>{currentQuestion.relevantSection}</p>
        </div>

        {/* Specific tips based on question type */}
        {feedback !== 'correct' && feedback !== 'skipped' && (
          <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', background: '#e8f4fd', borderRadius: '6px', borderLeft: '3px solid #4a9fd5' }}>
            <p style={{ margin: 0, fontSize: '0.85em', color: '#1a5276', fontWeight: 600 }}>💡 Tip for next time:</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.95em' }}>{getTipForQuestionType(currentQuestion.type)}</p>
          </div>
        )}

        <button type="button" onClick={handleNext}
          aria-label={isLastQuestion ? 'Finish questions' : 'Next question'}
          style={{ marginTop: '1rem', padding: '0.5rem 1.2rem', borderRadius: '6px', border: 'none', background: '#4a6fa5', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
        >{isLastQuestion ? 'Finish' : 'Next Question'}</button>
      </div>
    );
  };

  return (
    <div role="region" aria-label="Comprehension questions" style={{ maxWidth: '680px', margin: '0 auto', padding: '1rem' }}>
      <p style={{ color: '#666', marginBottom: '0.5rem', fontSize: '0.9em' }}>
        Question {currentIndex + 1} of {questions.length}
      </p>

      <h2 style={{ fontSize: '1.15em', fontWeight: 600, marginBottom: '1rem', lineHeight: 1.4 }}>
        {currentQuestion.text}
      </h2>

      {!hasFeedback && (
        <div>
          <label htmlFor="answer-input" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>
            Your answer:
          </label>
          <textarea id="answer-input" value={answer} onChange={(e) => setAnswer(e.target.value)} rows={3}
            aria-label="Type your answer"
            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: 'inherit', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={handleSubmit} disabled={answer.trim() === ''}
              aria-label="Submit answer"
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

      {feedbackContent()}
    </div>
  );
}

function getTipForQuestionType(type: ComprehensionQuestion['type']): string {
  switch (type) {
    case 'retrieval':
      return 'For retrieval questions, look for the answer directly in the passage. Try scanning for key words from the question.';
    case 'inference':
      return 'For inference questions, think about what the author is suggesting but not saying directly. Look for clues in the character\'s actions or the descriptions.';
    case 'vocabulary':
      return 'For vocabulary questions, read the sentence around the word carefully. The other words nearby often give clues about what it means.';
    case 'authors-purpose':
      return 'For author\'s purpose questions, ask yourself: why did the author choose these particular words? What feeling or picture are they trying to create?';
    case 'summarisation':
      return 'For summary questions, try to identify the main idea of each paragraph, then combine them into a short overview. Leave out small details.';
    default:
      return 'Read the question carefully and look back at the passage for clues.';
  }
}
