// PassageView — reading + questions, never repeats passages, background generation

import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [allDone, setAllDone] = useState(false);
  const [questionsFinished, setQuestionsFinished] = useState(false);
  const [generatingInBackground, setGeneratingInBackground] = useState(false);
  const extraPassagesRef = useRef<PassageRecord[]>([]);
  const bgGeneratingRef = useRef(false);

  useEffect(() => {
    getPreferences().then(setPreferences).catch(() => {});
  }, []);

  // Get fresh used IDs from IndexedDB every time we need them
  const getFreshUsedIds = useCallback(async (): Promise<Set<string>> => {
    try { return await getUsedPassageIds(); }
    catch { return new Set(); }
  }, []);

  // Pick next unused passage for given genre/difficulty
  const pickFreshPassage = useCallback(async (g: Genre, d: DifficultyLevel): Promise<PassageRecord | null> => {
    const usedIds = await getFreshUsedIds();
    const seeds = SEED_PASSAGES.filter(p => p.genre === g && p.difficulty === d);
    const extras = extraPassagesRef.current.filter(p => p.genre === g && p.difficulty === d);
    const all = [...seeds, ...extras];
    const fresh = all.filter(p => !usedIds.has(p.id));
    console.log(`[PassageView] pick: ${all.length} total, ${fresh.length} fresh for ${g} L${d}, used: ${usedIds.size}`);
    return fresh.length > 0 ? fresh[0] : null;
  }, [getFreshUsedIds]);

  // Count remaining fresh passages
  const countFresh = useCallback(async (g: Genre, d: DifficultyLevel): Promise<number> => {
    const usedIds = await getFreshUsedIds();
    const seeds = SEED_PASSAGES.filter(p => p.genre === g && p.difficulty === d);
    const extras = extraPassagesRef.current.filter(p => p.genre === g && p.difficulty === d);
    return [...seeds, ...extras].filter(p => !usedIds.has(p.id)).length;
  }, [getFreshUsedIds]);

  // Background LLM generation — called when fresh count is low
  const generateInBackground = useCallback(async (g: Genre, d: DifficultyLevel) => {
    if (bgGeneratingRef.current) return;
    bgGeneratingRef.current = true;
    setGeneratingInBackground(true);
    console.log(`[PassageView] Background generating for ${g} L${d}...`);
    try {
      const p = await generatePassage(g, d);
      if (p.text && !p.text.includes("can't create")) {
        p.taggedWords = tagWords(p);
        const qs = await generateQuestions(p);
        const record: PassageRecord = { ...p, questions: qs, createdAt: new Date(), completed: false, questionsAnswered: 0, questionsCorrect: 0 };
        extraPassagesRef.current = [...extraPassagesRef.current, record];
        console.log(`[PassageView] Background generated: ${record.id}`);
      }
    } catch { /* non-critical */ }
    finally { bgGeneratingRef.current = false; setGeneratingInBackground(false); }
  }, []);

  const handleNewPassage = useCallback(async () => {
    setLoading(true);
    setQuestions([]);
    setAllDone(false);
    setQuestionsFinished(false);

    const picked = await pickFreshPassage(genre, difficulty);
    if (picked) {
      // Tag words if needed
      if (!picked.taggedWords || picked.taggedWords.length === 0) {
        try { picked.taggedWords = tagWords({ id: picked.id, text: picked.text, genre: picked.genre, difficulty: picked.difficulty, theme: picked.theme, paragraphs: picked.paragraphs, taggedWords: [] }); }
        catch { picked.taggedWords = []; }
      }
      setPassage(picked);
      setQuestions(picked.questions || []);
      await markPassageUsed(picked.id);
      setLoading(false);

      // Check if this was the last fresh one — generate more in background
      const remaining = await countFresh(genre, difficulty);
      if (remaining <= 1) {
        generateInBackground(genre, difficulty);
      }
      return;
    }

    // No fresh passages available — try LLM directly
    console.log('[PassageView] No fresh passages, trying LLM...');
    try {
      const generated = await generatePassage(genre, difficulty);
      if (generated.text && !generated.text.includes("can't create")) {
        generated.taggedWords = tagWords(generated);
        const qs = await generateQuestions(generated);
        const record: PassageRecord = { ...generated, questions: qs, createdAt: new Date(), completed: false, questionsAnswered: 0, questionsCorrect: 0 };
        setPassage(record);
        setQuestions(qs);
        await markPassageUsed(record.id);
        extraPassagesRef.current = [...extraPassagesRef.current, record];
      } else {
        setPassage(null);
        setAllDone(true);
      }
    } catch {
      setPassage(null);
      setAllDone(true);
    }
    finally { setLoading(false); }
  }, [genre, difficulty, pickFreshPassage, countFresh, generateInBackground]);

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
    setQuestionsFinished(true);

    // Pre-generate next passage in background
    generateInBackground(genre, difficulty);
  }, [passage, questions, genre, difficulty, generateInBackground]);

  const containerStyle: React.CSSProperties = preferences
    ? { fontFamily: preferences.fontFamily, fontSize: `${preferences.fontSize}px`, lineHeight: preferences.lineSpacing, backgroundColor: preferences.backgroundColor, padding: '1.5rem', maxWidth: '720px', margin: '0 auto' }
    : { padding: '1.5rem', maxWidth: '720px', margin: '0 auto' };

  return (
    <div style={containerStyle} role="main" aria-label="Passage reading area">
      {/* Controls */}
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
        >{loading ? 'Loading…' : passage ? 'New Passage' : 'Start Reading'}</button>
        {generatingInBackground && <span style={{ fontSize: '0.8em', color: '#888' }}>✨ Preparing more…</span>}
      </div>

      {!passage && !loading && !allDone && <p style={{ textAlign: 'center', color: '#666', marginTop: '3rem' }}>Choose a genre and level, then press "Start Reading" to begin.</p>}
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

      {passage && questionsFinished && questions.length === 0 && (
        <div style={{ textAlign: 'center', padding: '1.5rem' }}>
          <p style={{ color: '#2d6a4f', fontWeight: 600, marginBottom: '0.75rem' }}>Well done! Ready for another passage?</p>
          <button type="button" onClick={handleNewPassage} disabled={loading} aria-label="Next passage"
            style={{ padding: '0.6rem 1.5rem', borderRadius: '6px', border: 'none', background: '#4a6fa5', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 'inherit' }}
          >Next Passage →</button>
        </div>
      )}

      {allDone && (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#555', background: '#fff3cd', borderRadius: '8px', marginTop: '1rem' }}>
          <p style={{ fontSize: '1.1em', fontWeight: 600, margin: '0 0 0.5rem' }}>🌟 You've completed all available passages for this genre and level!</p>
          <p style={{ margin: 0 }}>Try a different genre or difficulty level, or check back later for new passages.</p>
        </div>
      )}

      {passage && questions.length === 0 && !loading && !questionsFinished && !allDone && (
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
