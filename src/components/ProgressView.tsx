// ProgressView — visual, encouraging progress display using a garden metaphor
// Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.3

import { useState, useEffect } from 'react';
import * as progressTracker from '../services/progressTracker';
import * as wordBankStore from '../services/wordBankStore';

interface ProgressStats {
  passagesCompleted: number;
  currentStreak: number;
  wordsInBank: number;
  wordsMastered: number;
}

export default function ProgressView() {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [passagesCompleted, currentStreak, allWords, wordsMastered] =
          await Promise.all([
            progressTracker.getCompletedCount(),
            progressTracker.getCurrentStreak(),
            wordBankStore.getAll(),
            wordBankStore.getMasteredCount(),
          ]);
        if (!cancelled) {
          setStats({
            passagesCompleted,
            currentStreak,
            wordsInBank: allWords.length,
            wordsMastered,
          });
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
    return <p aria-label="Loading progress">Loading your garden…</p>;
  }

  const { passagesCompleted, currentStreak, wordsInBank, wordsMastered } =
    stats ?? { passagesCompleted: 0, currentStreak: 0, wordsInBank: 0, wordsMastered: 0 };

  return (
    <div
      role="region"
      aria-label="Your progress garden"
      style={{ maxWidth: '640px', margin: '0 auto', padding: '1rem' }}
    >
      <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
        🌻 Your Reading Garden
      </h2>
      <p style={{ textAlign: 'center', color: '#555', marginBottom: '1.5rem' }}>
        {passagesCompleted === 0
          ? 'Plant your first flower by reading a passage!'
          : 'Your garden is growing! Keep it up!'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Passages completed — flowers */}
        <div
          aria-label="Passages completed"
          style={{
            padding: '1rem',
            background: '#fce4ec',
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '2rem' }} aria-hidden="true">
            {'🌸'.repeat(Math.min(passagesCompleted, 10)) || '🌱'}
          </div>
          <p style={{ fontWeight: 600, margin: '0.5rem 0 0.25rem' }}>
            {passagesCompleted} {passagesCompleted === 1 ? 'flower' : 'flowers'} planted
          </p>
          <p style={{ color: '#555', fontSize: '0.85em', margin: 0 }}>
            Every passage grows a flower!
          </p>
        </div>

        {/* Streak — sunshine days */}
        <div
          aria-label="Current streak"
          style={{
            padding: '1rem',
            background: '#fff9c4',
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '2rem' }} aria-hidden="true">
            {'☀️'.repeat(Math.min(currentStreak, 7)) || '🌤️'}
          </div>
          <p style={{ fontWeight: 600, margin: '0.5rem 0 0.25rem' }}>
            {currentStreak} {currentStreak === 1 ? 'sunshine day' : 'sunshine days'}
          </p>
          <p style={{ color: '#555', fontSize: '0.85em', margin: 0 }}>
            {currentStreak === 0
              ? 'Read today to start your streak!'
              : 'Keep the sunshine going!'}
          </p>
        </div>

        {/* Words in bank — seeds planted */}
        <div
          aria-label="Words in bank"
          style={{
            padding: '1rem',
            background: '#e8f5e9',
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '2rem' }} aria-hidden="true">
            {'🌱'.repeat(Math.min(wordsInBank, 10)) || '🪴'}
          </div>
          <p style={{ fontWeight: 600, margin: '0.5rem 0 0.25rem' }}>
            {wordsInBank} {wordsInBank === 1 ? 'seed' : 'seeds'} planted
          </p>
          <p style={{ color: '#555', fontSize: '0.85em', margin: 0 }}>
            Every new word is a seed!
          </p>
        </div>

        {/* Words mastered — bloomed */}
        <div
          aria-label="Words mastered"
          style={{
            padding: '1rem',
            background: '#f3e5f5',
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '2rem' }} aria-hidden="true">
            {'🌻'.repeat(Math.min(wordsMastered, 10)) || '🌱'}
          </div>
          <p style={{ fontWeight: 600, margin: '0.5rem 0 0.25rem' }}>
            {wordsMastered} {wordsMastered === 1 ? 'word' : 'words'} bloomed
          </p>
          <p style={{ color: '#555', fontSize: '0.85em', margin: 0 }}>
            Mastered words bloom into sunflowers!
          </p>
        </div>
      </div>

      {/* Encouraging footer */}
      <p
        style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          fontStyle: 'italic',
          color: '#666',
        }}
      >
        {passagesCompleted >= 5
          ? 'What a beautiful garden you have built! 🌈'
          : 'Every little bit of reading helps your garden grow!'}
      </p>
    </div>
  );
}
