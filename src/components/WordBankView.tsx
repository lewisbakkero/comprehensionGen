// WordBankView — displays saved words sorted by review date, mastered counter, review launcher
// Requirements: 5.3, 5.4, 5.5

import { useState, useEffect } from 'react';
import type { TaggedWord, WordBankEntry } from '../types';
import * as wordBankStore from '../services/wordBankStore';

export interface WordBankViewProps {
  onReviewWord?: (word: TaggedWord) => void;
}

export default function WordBankView({ onReviewWord }: WordBankViewProps) {
  const [words, setWords] = useState<WordBankEntry[]>([]);
  const [masteredCount, setMasteredCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [all, mastered] = await Promise.all([
          wordBankStore.getAll(),
          wordBankStore.getMasteredCount(),
        ]);
        if (!cancelled) {
          setWords(all);
          setMasteredCount(mastered);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <p aria-label="Loading word bank">Loading your word bank…</p>;
  }

  if (words.length === 0) {
    return (
      <div role="region" aria-label="Word bank">
        <p>Your word bank is empty. Start reading passages to collect new words!</p>
      </div>
    );
  }

  const now = new Date();

  return (
    <div role="region" aria-label="Word bank" style={{ maxWidth: '640px', margin: '0 auto', padding: '1rem' }}>
      {/* Mastered counter (Req 5.5) */}
      <div
        aria-label="Words mastered"
        style={{
          padding: '0.75rem 1rem',
          background: '#d4edda',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontWeight: 600,
          fontSize: '1.05em',
        }}
      >
        ⭐ Words Mastered: {masteredCount}
      </div>

      {/* Word list sorted by nextReviewDate — due words first (Req 5.3) */}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {words.map((entry) => {
          const isDue = new Date(entry.nextReviewDate) <= now;
          return (
            <li
              key={entry.id}
              style={{
                padding: '0.75rem 1rem',
                marginBottom: '0.5rem',
                borderRadius: '8px',
                border: isDue ? '2px solid #e9a820' : '1px solid #ddd',
                background: isDue ? '#fff8e1' : '#fff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '1.05em' }}>{entry.word}</span>
                  {entry.mastered && (
                    <span aria-label="Mastered" style={{ marginLeft: '0.5rem', color: '#2d6a4f' }}>✓ Mastered</span>
                  )}
                  <p style={{ margin: '0.25rem 0 0', color: '#555', fontSize: '0.9em' }}>{entry.definition}</p>
                </div>
                {/* Review button for due words (Req 5.4) */}
                {isDue && onReviewWord && (
                  <button
                    type="button"
                    aria-label={`Review ${entry.word}`}
                    onClick={() =>
                      onReviewWord({
                        word: entry.word,
                        definition: entry.definition,
                        passageContext: entry.passageContext,
                        isCurriculumWord: false,
                      })
                    }
                    style={{
                      padding: '0.4rem 1rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#4a6fa5',
                      color: '#fff',
                      cursor: 'pointer',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    Review
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
