// PassageView — main reading experience component
// Uses seed passages for instant content, generates new ones via LLM in background

import { useState, useEffect, useCallback } from 'react';
import type { TaggedWord, Genre, DifficultyLevel, UserPreferences, ComprehensionQuestion, PassageRecord } from '../types';
import { tagWords } from '../services/wordTagger';
import { getPreferences } from '../services/displayPreferences';
import { SEED_PASSAGES } from '../data/seedPassages';
import { generatePassage } from '../services/passageGenerator';
import { generateQuestions } from '../services/questionGenerator';
import QuestionView from './QuestionView';

const GENRES: { value: Genre; label: string }[] = [
  { value: 'fiction', label: 'Fiction' },
  { value: 'non-fiction', label: 'Non-Fiction' },
  { value: 'poetry', label: 'Poetry' },
  { value: 'persuasive', label: 'Persuasive' },
];

const DIFFICULTY_LEVELS: DifficultyLevel[] = [1, 2, 3];

export interface PassageViewProps {
  onWordClick?: (word: TaggedWord) => void;
  onQuestionsReady?: (passage: PassageRecord) => void;
}

export default function PassageView({ onWordClick }: PassageViewProps) {
  const [passage, setPassage] = useState<PassageRecord | null>(null);
  const [questions, setQuestions] = useState<ComprehensionQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [genre, setGenre] = useState<Genre>('fiction');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(1);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set());
  const [generatingInBackground, setGeneratingInBackground] = useState(false);

  // Extra LLM-generated passages stored here
  const [extraPassages, setExtraPassages] = useState<PassageRecord[]>([]);

  useEffect(() => {
    getPreferences().then(setPreferences).catch(() => {});
  }, []);

  // Get available passages for current genre+difficulty (seed + extra)
  const getAvailablePassages = useCallback((): PassageRecord[] => {
    const seedMatches = SEED_PASSAGES.filter(
      (p) => p.genre === genre && p.difficulty === difficulty
    );
    const extraMatches = extraPassages.filter(
      (p) => p.genre === genre && p.difficulty === difficulty
    );
    return [...seedMatches, ...extraMatches];
  }, [genre, difficulty, extraPassages]);

  // Pick next unattempted passage, or any if all attempted
  const pickPassage = useCallback((): PassageRecord | null => {
    const available = getAvailablePassages();
    if (available.length === 0) return null;
    const unattempted = available.filter((p) => !usedIds.has(p.id));
    if (unattempted.length > 0) return unattempted[0];
    // All attempted — let them revisit
    return available[0];
  }, [getAvailablePassages, usedIds]);

  // Background LLM generation when running low on unattempted passages
  const maybeGenerateInBackground = useCallback(async () => {
    const available = getAvailablePassages();
    const unattempted = available.filter((p) => !usedIds.has(p.id));
    if (unattempted.length <= 1 && !generatingInBackground) {
      setGeneratingInBackground(true);
      try {
        const newPassage = await generatePassage(genre, difficulty);
        if (newPassage.text && !newPassage.text.includes("can't create")) {
          newPassage.taggedWords = tagWords(newPassage);
          // Generate questions for it too
          const qs = await generateQuestions(newPassage);
          const record: PassageRecord = {
            ...newPassage,
            questions: qs,
            createdAt: new Date(),
            completed: false,
            questionsAnswered: 0,
            questionsCorrect: 0,
          };
          setExtraPassages((prev) => [...prev, record]);
          console.log('[PassageView] Background-generated new passage:', record.id);
        }
      } catch {
        // Non-critical — seed passages still available
      } finally {
        setGeneratingInBackground(false);
      }
    }
  }, [genre, difficulty, getAvailablePassages, usedIds, generatingInBackground]);

  const handleNewPassage = useCallback(async () => {
    console.log('[PassageView] handleNewPassage called, genre:', genre, 'difficulty:', difficulty);
    setLoading(true);
    setQuestions([]);

    // Try seed/extra passages first
    const picked = pickPassage();
    console.log('[PassageView] Available seeds for', genre, difficulty, ':', getAvailablePassages().length, 'picked:', picked?.id);
    if (picked) {
      if (!picked.taggedWords || picked.taggedWords.length === 0) {
        try {
          picked.taggedWords = tagWords({ id: picked.id, text: picked.text, genre: picked.genre, difficulty: picked.difficulty, theme: picked.theme, paragraphs: picked.paragraphs, taggedWords: [] });
        } catch { picked.taggedWords = []; }
      }
      setPassage(picked);
      setQuestions(picked.questions || []);
      setUsedIds((prev) => new Set([...prev, picked.id]));
      setLoading(false);
      maybeGenerateInBackground();
      return;
    }

    // No seed passages for this combo — try LLM directly
    try {
      setGeneratingQuestions(true);
      const generated = await generatePassage(genre, difficulty);
      if (generated.text && !generated.text.includes("can't create")) {
        generated.taggedWords = tagWords(generated);
        const qs = await generateQuestions(generated);
        const record: PassageRecord = {
          ...generated,
          questions: qs,
          createdAt: new Date(),
          completed: false,
          questionsAnswered: 0,
          questionsCorrect: 0,
        };
        setPassage(record);
        setQuestions(qs);
        setUsedIds((prev) => new Set([...prev, record.id]));
        setExtraPassages((prev) => [...prev, record]);
      } else {
        setPassage(null);
      }
    } catch {
      setPassage(null);
    } finally {
      setLoading(false);
      setGeneratingQuestions(false);
    }
  }, [genre, difficulty, pickPassage, maybeGenerateInBackground]);

  const handleQuestionsComplete = useCallback(() => {
    setQuestions([]);
  }, []);

  const containerStyle: React.CSSProperties = preferences
    ? {
        fontFamily: preferences.fontFamily,
        fontSize: `${preferences.fontSize}px`,
        lineHeight: preferences.lineSpacing,
        backgroundColor: preferences.backgroundColor,
        padding: '1.5rem',
        maxWidth: '720px',
        margin: '0 auto',
      }
    : { padding: '1.5rem', maxWidth: '720px', margin: '0 auto' };

  return (
    <div style={containerStyle} role="main" aria-label="Passage reading area">
      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '1.5rem' }}>
        <label htmlFor="genre-select" style={{ fontWeight: 600 }}>Genre:</label>
        <select
          id="genre-select"
          value={genre}
          onChange={(e) => setGenre(e.target.value as Genre)}
          aria-label="Select passage genre"
          style={{ padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          {GENRES.map((g) => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>

        <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <legend style={{ fontWeight: 600, float: 'left', marginRight: '0.5rem' }}>Level:</legend>
          {DIFFICULTY_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setDifficulty(level)}
              aria-pressed={difficulty === level}
              aria-label={`Difficulty level ${level}`}
              style={{
                padding: '0.35rem 0.75rem', borderRadius: '4px',
                border: difficulty === level ? '2px solid #4a6fa5' : '1px solid #ccc',
                background: difficulty === level ? '#4a6fa5' : 'transparent',
                color: difficulty === level ? '#fff' : 'inherit',
                cursor: 'pointer', fontWeight: difficulty === level ? 700 : 400,
              }}
            >{level}</button>
          ))}
        </fieldset>

        <button
          type="button"
          onClick={handleNewPassage}
          disabled={loading}
          aria-label="Generate a new passage"
          style={{
            padding: '0.5rem 1.2rem', borderRadius: '6px', border: 'none',
            background: '#4a6fa5', color: '#fff',
            cursor: loading ? 'wait' : 'pointer', fontWeight: 600,
            opacity: loading ? 0.7 : 1,
          }}
        >{loading ? 'Loading…' : 'New Passage'}</button>

        {generatingInBackground && (
          <span style={{ fontSize: '0.8em', color: '#888' }}>✨ Preparing more passages…</span>
        )}
      </div>

      {/* Empty state */}
      {!passage && !loading && (
        <p style={{ textAlign: 'center', color: '#666', marginTop: '3rem' }}>
          Choose a genre and level, then press "New Passage" to start reading.
        </p>
      )}

      {loading && !passage && (
        <p style={{ textAlign: 'center', color: '#666', marginTop: '3rem' }}>Loading passage…</p>
      )}

      {/* Passage text */}
      {passage && (
        <article aria-label="Reading passage">
          {passage.paragraphs.map((para, pIdx) => (
            <p key={pIdx} style={{ marginBottom: '1em' }}>
              {renderParagraphWithTags(para, passage.taggedWords, onWordClick)}
            </p>
          ))}
        </article>
      )}

      {/* Questions section */}
      {generatingQuestions && (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: '#666' }}>
          <p>✨ Generating comprehension questions…</p>
        </div>
      )}

      {questions.length > 0 && (
        <div style={{ borderTop: '2px solid #ddd', marginTop: '1.5rem', paddingTop: '1rem' }}>
          <QuestionView questions={questions} onComplete={handleQuestionsComplete} />
        </div>
      )}

      {passage && questions.length === 0 && !generatingQuestions && !loading && (
        <div style={{ textAlign: 'center', padding: '1rem', color: '#888', fontStyle: 'italic' }}>
          No questions available for this passage yet.
        </div>
      )}
    </div>
  );
}

function renderParagraphWithTags(
  paragraph: string,
  taggedWords: TaggedWord[],
  onWordClick?: (word: TaggedWord) => void,
): React.ReactNode[] {
  if (!taggedWords || taggedWords.length === 0) return [paragraph];

  const taggedSet = new Map<string, TaggedWord>();
  for (const tw of taggedWords) {
    taggedSet.set(tw.word.toLowerCase(), tw);
  }

  const tokens = paragraph.split(/(\b\w+\b)/g);

  return tokens.map((token, idx) => {
    const lower = token.toLowerCase().replace(/[^a-z'-]/g, '');
    const tagged = taggedSet.get(lower);

    if (tagged) {
      return (
        <span
          key={idx}
          role="button"
          tabIndex={0}
          aria-label={`Tagged word: ${tagged.word}. Click to practise.`}
          onClick={() => onWordClick?.(tagged)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onWordClick?.(tagged);
            }
          }}
          style={{
            backgroundColor: '#ffe0b2', borderRadius: '3px', padding: '0 2px',
            cursor: 'pointer', borderBottom: '2px solid #f59e0b', fontWeight: 600,
          }}
        >{token}</span>
      );
    }
    return <span key={idx}>{token}</span>;
  });
}
