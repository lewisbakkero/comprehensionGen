// HistoryView — shows all past test attempts with scores and answer review

import { useState, useEffect } from 'react';
import { getAllTestAttempts, type TestAttempt } from '../services/testHistory';

export default function HistoryView() {
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllTestAttempts().then(a => { setAttempts(a.reverse()); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ textAlign: 'center', padding: '2rem' }}>Loading history…</p>;

  if (attempts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '640px', margin: '0 auto' }}>
        <p style={{ fontSize: '1.1em', color: '#666' }}>No tests completed yet. Read a passage and answer the questions to see your history here.</p>
      </div>
    );
  }

  // Overall stats
  const totalCorrect = attempts.reduce((s, a) => s + a.correctCount, 0);
  const totalPartial = attempts.reduce((s, a) => s + a.partialCount, 0);
  const totalQuestions = attempts.reduce((s, a) => s + a.totalQuestions, 0);

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '1rem' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>📋 Test History</h2>

      {/* Overall score */}
      <div style={{ textAlign: 'center', padding: '0.75rem', background: '#d4edda', borderRadius: '8px', marginBottom: '1.5rem' }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: '1.05em' }}>
          Overall: {totalCorrect} correct, {totalPartial} partial out of {totalQuestions} questions across {attempts.length} {attempts.length === 1 ? 'test' : 'tests'}
        </p>
      </div>

      {/* Test list */}
      {attempts.map(attempt => {
        const isExpanded = expandedId === attempt.id;
        const scoreColor = attempt.correctCount === attempt.totalQuestions ? '#16a34a'
          : attempt.correctCount >= attempt.totalQuestions / 2 ? '#d97706' : '#dc2626';

        return (
          <div key={attempt.id} style={{ marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
            {/* Summary row — clickable */}
            <button type="button" onClick={() => setExpandedId(isExpanded ? null : attempt.id)}
              style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#fafafa', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', fontFamily: 'inherit', fontSize: 'inherit' }}
            >
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>{attempt.passageTitle}</p>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85em', color: '#666' }}>
                  {attempt.genre} · Level {attempt.difficulty} · {attempt.date}
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, color: scoreColor }}>
                  {attempt.correctCount}/{attempt.totalQuestions}
                </p>
                <p style={{ margin: 0, fontSize: '0.8em', color: '#666' }}>{isExpanded ? '▲ Hide' : '▼ Review'}</p>
              </div>
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #eee' }}>
                {attempt.questions.map((q, idx) => (
                  <div key={idx} style={{
                    marginBottom: '0.75rem', padding: '0.75rem', borderRadius: '6px',
                    background: q.evaluation === 'correct' ? '#f0fdf4' : q.evaluation === 'partial' ? '#fffbeb' : q.evaluation === 'skipped' ? '#f8fafc' : '#fef2f2',
                  }}>
                    <p style={{ fontWeight: 600, margin: '0 0 0.4rem' }}>
                      {idx + 1}. {q.questionText}
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.8em',
                        color: q.evaluation === 'correct' ? '#16a34a' : q.evaluation === 'partial' ? '#d97706' : q.evaluation === 'skipped' ? '#6b7280' : '#dc2626',
                      }}>
                        ({q.evaluation === 'correct' ? '✓' : q.evaluation === 'partial' ? '◐' : q.evaluation === 'skipped' ? '→' : '✗'} {q.evaluation})
                      </span>
                    </p>

                    {q.studentAnswer && (
                      <div style={{ marginBottom: '0.4rem', padding: '0.4rem 0.6rem', background: 'rgba(0,0,0,0.03)', borderRadius: '4px', borderLeft: '3px solid #999' }}>
                        <p style={{ margin: 0, fontSize: '0.8em', color: '#666', fontWeight: 600 }}>Your answer:</p>
                        <p style={{ margin: '0.15rem 0 0' }}>{q.studentAnswer}</p>
                      </div>
                    )}

                    <div style={{ padding: '0.4rem 0.6rem', background: 'rgba(0,0,0,0.03)', borderRadius: '4px', borderLeft: '3px solid #16a34a' }}>
                      <p style={{ margin: 0, fontSize: '0.8em', color: '#16a34a', fontWeight: 600 }}>Correct answer:</p>
                      <p style={{ margin: '0.15rem 0 0' }}>{q.correctAnswer}</p>
                    </div>

                    <p style={{ margin: '0.3rem 0 0', fontSize: '0.85em', fontStyle: 'italic', color: '#92600a' }}>
                      📖 {q.relevantSection}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
