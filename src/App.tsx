// App shell — tab-based navigation with global dyslexia-friendly styles

import { useState, useEffect, useCallback } from 'react';
import type { TaggedWord, UserPreferences, LevelSuggestion } from './types';
import { getPreferences } from './services/displayPreferences';
import PassageView from './components/PassageView';
import WordBankView from './components/WordBankView';
import ProgressView from './components/ProgressView';
import SettingsPanel from './components/SettingsPanel';
import WordExerciseView from './components/WordExerciseView';
import HistoryView from './components/HistoryView';

type Tab = 'read' | 'history' | 'wordbank' | 'progress' | 'settings';

const TAB_LABELS: Record<Tab, string> = {
  read: '📖 Read',
  history: '📋 History',
  wordbank: '📚 Words',
  progress: '🌻 Progress',
  settings: '⚙️ Settings',
};
const TAB_ORDER: Tab[] = ['read', 'history', 'wordbank', 'progress', 'settings'];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('read');
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [activeWord, setActiveWord] = useState<TaggedWord | null>(null);
  const [levelSuggestion, setLevelSuggestion] = useState<LevelSuggestion | null>(null);
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    try { setPreferences(await getPreferences()); } catch { /* fallback */ }
  }, []);

  useEffect(() => { loadPreferences(); }, [loadPreferences]);

  const handleWordClick = useCallback((word: TaggedWord) => setActiveWord(word), []);

  const handleExerciseComplete = useCallback(() => {
    setActiveWord(null);
    setCompletionMessage("Great job learning that word! It's been added to your word bank. 🌱");
    setTimeout(() => setCompletionMessage(null), 5000);
  }, []);

  const handleExerciseSkip = useCallback(() => setActiveWord(null), []);
  const handleDismissSuggestion = useCallback(() => setLevelSuggestion(null), []);
  const handlePreferencesChange = useCallback(() => { loadPreferences(); }, [loadPreferences]);

  const containerStyle: React.CSSProperties = preferences
    ? {
        fontFamily: preferences.fontFamily,
        fontSize: `${preferences.fontSize}px`,
        lineHeight: preferences.lineSpacing,
        backgroundColor: preferences.backgroundColor,
        minHeight: '100vh', color: '#333',
      }
    : { minHeight: '100vh', color: '#333' };

  return (
    <div style={containerStyle} data-testid="app-container">
      <nav role="tablist" aria-label="Main navigation" style={{
        display: 'flex', gap: 0, borderBottom: '2px solid #ddd',
        background: preferences?.backgroundColor ?? '#FFF8E7',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        {TAB_ORDER.map((tab) => (
          <button key={tab} role="tab" aria-selected={activeTab === tab}
            aria-controls={`panel-${tab}`} onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '0.75rem 0.5rem', border: 'none',
              borderBottom: activeTab === tab ? '3px solid #4a6fa5' : '3px solid transparent',
              background: 'transparent', cursor: 'pointer',
              fontWeight: activeTab === tab ? 700 : 400,
              fontSize: 'inherit', fontFamily: 'inherit',
              color: activeTab === tab ? '#4a6fa5' : '#666',
            }}
          >{TAB_LABELS[tab]}</button>
        ))}
      </nav>

      {levelSuggestion && (
        <div role="status" data-testid="level-suggestion" style={{
          padding: '0.75rem 1rem',
          background: levelSuggestion.direction === 'up' ? '#d4edda' : '#fff3cd',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem',
        }}>
          <p style={{ margin: 0, flex: 1 }}>{levelSuggestion.message}</p>
          <button type="button" onClick={handleDismissSuggestion}
            style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #999', background: 'transparent', cursor: 'pointer' }}
          >Got it</button>
        </div>
      )}

      {completionMessage && (
        <div role="status" data-testid="completion-feedback" style={{
          padding: '0.75rem 1rem', background: '#d4edda',
          textAlign: 'center', fontWeight: 600, color: '#2d6a4f',
        }}>{completionMessage}</div>
      )}

      {activeWord && (
        <div role="dialog" aria-label="Word exercise" data-testid="word-exercise-overlay" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
          <div style={{
            background: preferences?.backgroundColor ?? '#FFF8E7',
            borderRadius: '12px', padding: '1.5rem', maxWidth: '640px', width: '90%',
            maxHeight: '90vh', overflow: 'auto', fontFamily: preferences?.fontFamily ?? 'inherit',
          }}>
            <WordExerciseView word={activeWord} onComplete={handleExerciseComplete} onSkip={handleExerciseSkip} />
          </div>
        </div>
      )}

      <div id="panel-read" role="tabpanel" hidden={activeTab !== 'read'}>
        {activeTab === 'read' && <PassageView onWordClick={handleWordClick} />}
      </div>
      <div id="panel-history" role="tabpanel" hidden={activeTab !== 'history'}>
        {activeTab === 'history' && <HistoryView />}
      </div>
      <div id="panel-wordbank" role="tabpanel" hidden={activeTab !== 'wordbank'}>
        {activeTab === 'wordbank' && <WordBankView onReviewWord={handleWordClick} />}
      </div>
      <div id="panel-progress" role="tabpanel" hidden={activeTab !== 'progress'}>
        {activeTab === 'progress' && <ProgressView />}
      </div>
      <div id="panel-settings" role="tabpanel" hidden={activeTab !== 'settings'}>
        {activeTab === 'settings' && <SettingsPanel onPreferencesChange={handlePreferencesChange} />}
      </div>
    </div>
  );
}
