// PassageView — reading + questions with persistent history and passage cycling

import { useState, useEffect, useCallback } from 'react';
import type { TaggedWord, Genre, DifficultyLevel, UserPreferences, ComprehensionQuestion, PassageRecord } from '../types';
import { tagWords } from '../services/wordTagger';
import { getPreferences } from '../services/displayPreferences';
import { SEED_PASSAGES } from '../data/seedPassages';
import { generatePassage } from '../services/passageGenerator';
import { generateQuestions } from '../services/questionGenerator';
import { getUsedPassageIds, markPassageUsed, saveTestAttempt, buildTestAttempt } from '../services/testHistory';
import QuestionView, { type QuestionResult } from './QuestionView';

const GENRES: { value: Genre; label: string }[] = [
  { value: 'fiction', label: 'Fiction' },
  { value: 'non-fiction', label: 'Non-Fiction' },
  { value: 'poetry', label: 'Poetry' },
  { value: 'persuasive', label: 'Persuasive' },
];
const DIFFICULTY_LEVELS: DifficultyLevel[] = [1, 2, 3];

export interface PassageViewProps {
  onWordClick?: (word: TaggedWord) => void;
}

export default function PassageView({ onWordClick }: PassageViewProps) {
  const [passage, setPassage] = useState<PassageRecord | null>(null);
  const [questions, setQuestions] = useState<ComprehensionQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [genre, setGenre] = useState<Genre>('fiction');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(1);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set());
  const [extraPassages, setExtraPassages] = useState<PassageRecord[]>([]);
  const [generatingInBackground, setGeneratingInBackground] = useState(false);

  // Load preferences and used IDs from IndexedDB on mount
  useEffect(() => {
    getPreferences().then(setPreferences).catch(() => {});
    getUsedPassageIds().then(setUsedIds).catch(() => {});
  }, []);

  const allPassages = useCallback((): PassageRecord[] => {
    const seeds = SEED_PASSAGES.filter(p => p.genre === genre && p.difficulty === difficulty);
    const extras = extraPassages.filter(p => p.genre === genre && p.difficulty === difficulty);
    return [...seeds, ...extras];
  }, [genre, difficulty, extraPassages]);

  const pickNextPassage = useCallback((): PassageRecord | null => {
    const available = allPassages();
    if (available.length === 0) return null;
    const fresh = available.filter(p => !usedIds.has(p.id));
    return fresh.length > 0 ? fresh[0] : available[0]; // revisit if all used
  }, [allPassages, usedIds]);

  // Background generation when pool is low
  const maybeGenerateInBackground = useCallback(async () => {
    const available = allPassages();
    const fresh = available.filter(p => !usedIds.has(p.id));
    if (fresh.length <= 1 && !generatingInBackground) {
      setGeneratingInBackground(true);
      try {
        const p = await generatePassage(genre, difficulty);
        if (p.text && !p.text.includes("can't create")) {
          p.taggedWords = tagWords(p);
          const qs = await generateQuestions(p);
          const record: PassageRecord = { ...p, questions: qs, createdAt: new Date(), completed: false, questionsAnswered: 0, questionsCorrect: 0 };
          setExtraPassages(prev => [...prev, record]);
        }
      } catch { /* non-critical */ }
      finally { setGeneratingInBackground(false); }
    }
  }, [genre, difficulty, allPassages, usedIds, generatingInBackground]);

  const handleNewPassage = useCallback(async () => {
    setLoading(true);
    setQuestions([]);
    const picked = pickNextPassage();
    if (picked) {
      if (!picked.taggedWords || picked.taggedWords.length === 0) {
        try { picked.taggedWords = tagWords({ id: picked.id, text: picked.text, genre: picked.genre, difficulty: picked.difficulty, theme: picked.theme, paragraphs: picked.paragraphs, taggedWords: [] }); }
        catch { picked.taggedWords = []; }
      }
      setPassage(picked);
      setQuestions(picked.questions || []);
      // Persist used ID
      setUsedIds(prev => { const n = new Set(prev); n.add(picked.id); return n; });
      markPassageUsed(picked.id).catch(() => {});
      setLoading(false);
      maybeGenerateInBackground();
      return;
    }
    // Fallback to LLM
    try {
      const generated = await generatePassage(genre, difficulty);
      if (generated.text && !generated.text.includes("can't create")) {
        generated.taggedWords = tagWords(generated);
        const qs = await generateQuestions(generated);
        const record: PassageRecord = { ...generated, questions: qs, createdAt: new Date(), completed: false, questionsAnswered: 0, questionsCorrect: 0 };
        setPassage(record);
        setQuestions(qs);
        setUsedIds(prev => { const n = new Set(prev); n.add(record.id); return n; });
        markPassageUsed(record.id).catch(() => {});
        setExtraPassages(prev => [...prev, record]);
      } else { setPassage(null); }
    } catch { setPassage(null); }
    finally { setLoading(false); }
  }, [genre, difficulty, pickNextPassage, maybeGenerateInBackground]);

  // Save test results to history when questions are completed
  const handleQuestionsComplete = useCallback((results: QuestionResult[]) => {
    if (passage && questions.length > 0) {
      const attempt = buildTestAttempt(
        passage.id, passage.text, passage.genre, passage.difficulty,
        questions,
        results.map(r => ({ studentAnswer: r.studentAnswer, evaluation: r.evaluation })),
      );
      saveTestAttempt(attempt).catch(() => {});
    }
    setQuestions([]);
  }, [passage, questions]);

  const containerStyle: React.CSSProperties = preferences
    ? { fontFamily: preferences.fontFamily, fontSize: `${preferences.fontSize}px`, lineHeight: preferences.lineSpacing, backgroundColor: preferences.backgroundColor, padding: '1.5rem', maxWidth: '720px', margin: '0 auto' }
    : { padding: '1.5rem', maxWidth: '720px', margin: '0 auto' };

  return (
    <div style={containerStyle} role="main" aria-label="Passage reading area">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '1.5rem' }}>
        <label htmlFor="genre-select" style={{ fontWeight: 600 }}>Genre:</label>
        <select id="genre-select" value={genre} onChange={e => setGenre(e.target.value as Genre)} aria-label="Select passage genre"
          style={{ padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #ccc' }}>
          {GENRES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
        <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <legend style={{ fontWeight: 600, float: 'left', marginRight: '0.5rem' }}>Level:</legend>
          {DIFFICULTY_LEVELS.map(level => (
            <button key={level} type="button" onClick={() => setDifficulty(level)} aria-pressed={difficulty === level} aria-label={`Difficulty level ${level}`}
              style={{ padding: '0.35rem 0.75rem', borderRadius: '4px', border: difficulty === level ? '2px solid #4a6fa5' : '1px solid #ccc', background: difficulty === level ? '#4a6fa5' : 'transparent', color: difficulty === level ? '#fff' : 'inherit', cursor: 'pointer', fontWeight: difficulty === level ? 700 : 400 }}
            >{level}</button>
          ))}
        </fieldset>
        <button type="button" onClick={handleNewPassage} disabled={loading} aria-label="Generate a new passage"
          style={{ padding: '0.5rem 1.2rem', borderRadius: '6px', border: 'none', background: '#4a6fa5', color: '#fff', cursor: loading ? 'wait' : 'pointer', fontWeight: 600, opacity: loading ? 0.7 : 1 }}
        >{loading ? 'Loading…' : 'New Passage'}</button>
        {generatingInBackground && <span style={{ fontSize: '0.8em', color: '#888' }}>✨ Preparing more…</span>}
      </div>

      {!passage && !loading && <p style={{ textAlign: 'center', color: '#666', marginTop: '3rem' }}>Choose a genre and level, then press "New Passage" to start reading.</p>}
      {loading && !passage && <p style={{ textAlign: 'center', color: '#666', marginTop: '3rem' }}>Loading passage…</p>}

      {passage && (
        <article aria-label="Reading passage">
          {passage.paragraphs.map((para, i) => (
            <p key={i} style={{ marginBottom: '1em' }}>{renderParagraphWithTags(para, passage.taggedWords, onWordClick)}</p>
          ))}
        </article>
      )}

      {questions.length > 0 && (
        <div style={{ borderTop: '2px solid #ddd', marginTop: '1.5rem', paddingTop: '1rem' }}>
          <QuestionView questions={questions} onComplete={handleQuestionsComplete} />
        </div>
      )}

      {passage && questions.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '1rem', color: '#888', fontStyle: 'italic' }}>No questions available for this passage yet.</div>
      )}
    </div>
  );
}

function renderParagraphWithTags(paragraph: string, taggedWords: TaggedWord[], onWordClick?: (word: TaggedWord) => void): React.ReactNode[] {
  if (!taggedWords || taggedWords.length === 0) return [paragraph];
  const taggedSet = new Map<string, TaggedWord>();
  for (const tw of taggedWords) taggedSet.set(tw.word.toLowerCase(), tw);
  return paragraph.split(/(\b\w+\b)/g).map((token, idx) => {
    const tagged = taggedSet.get(token.toLowerCase().replace(/[^a-z'-]/g, ''));
    if (tagged) return (
      <span key={idx} role="button" tabIndex={0} aria-label={`Tagged word: ${tagged.word}. Click to practise.`}
        onClick={() => onWordClick?.(tagged)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onWordClick?.(tagged); } }}
        style={{ backgroundColor: '#ffe0b2', borderRadius: '3px', padding: '0 2px', cursor: 'pointer', borderBottom: '2px solid #f59e0b', fontWeight: 600 }}
      >{token}</span>
    );
    return <span key={idx}>{token}</span>;
  });
}
