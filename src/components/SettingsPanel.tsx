// SettingsPanel — controls for display preferences and difficulty level
// Requirements: 6.4, 6.5, 7.4, 7.5, 8.4, 11.4

import { useState, useEffect } from 'react';
import { getPreferences, updatePreferences } from '../services/displayPreferences';
import { getCurrentLevel, setLevel } from '../services/difficultyManager';
import type { UserPreferences, DifficultyLevel } from '../types';

export interface SettingsPanelProps {
  onPreferencesChange?: () => void;
}

const BACKGROUND_COLOURS = [
  { label: 'Cream', value: '#FFF8E7' },
  { label: 'Light Blue', value: '#E0F0FF' },
  { label: 'Light Green', value: '#E8F5E9' },
  { label: 'White', value: '#FFFFFF' },
] as const;

const DIFFICULTY_LEVELS: DifficultyLevel[] = [1, 2, 3];

export default function SettingsPanel({ onPreferencesChange }: SettingsPanelProps) {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(getCurrentLevel);

  useEffect(() => {
    getPreferences().then(setPrefs);
  }, []);

  const handleUpdate = async (partial: Partial<UserPreferences>) => {
    await updatePreferences(partial);
    const updated = await getPreferences();
    setPrefs(updated);
    onPreferencesChange?.();
  };

  const handleDifficultyChange = (level: DifficultyLevel) => {
    setLevel(level);
    setDifficulty(level);
    onPreferencesChange?.();
  };

  if (!prefs) {
    return <div data-testid="settings-loading">Loading settings…</div>;
  }

  return (
    <div data-testid="settings-panel" role="region" aria-label="Settings">
      {/* Font size — Req 6.4 */}
      <div>
        <label htmlFor="font-size-slider">Font size: {prefs.fontSize}px</label>
        <input
          id="font-size-slider"
          type="range"
          min={12}
          max={36}
          step={1}
          value={prefs.fontSize}
          onChange={(e) => handleUpdate({ fontSize: Number(e.target.value) })}
          aria-label="Font size"
        />
      </div>

      {/* Line spacing — Req 6.4 */}
      <div>
        <label htmlFor="line-spacing-slider">Line spacing: {prefs.lineSpacing.toFixed(1)}</label>
        <input
          id="line-spacing-slider"
          type="range"
          min={1.0}
          max={3.0}
          step={0.1}
          value={prefs.lineSpacing}
          onChange={(e) => handleUpdate({ lineSpacing: parseFloat(e.target.value) })}
          aria-label="Line spacing"
        />
      </div>

      {/* Background colour — Req 6.4 */}
      <fieldset>
        <legend>Background colour</legend>
        {BACKGROUND_COLOURS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => handleUpdate({ backgroundColor: value })}
            aria-pressed={prefs.backgroundColor === value}
            aria-label={`${label} background`}
            style={{
              backgroundColor: value,
              border: prefs.backgroundColor === value ? '2px solid #333' : '1px solid #ccc',
              padding: '8px 12px',
              margin: '0 4px',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </fieldset>

      {/* Reading ruler toggle — Req 7.4, 7.5 */}
      <div>
        <label htmlFor="reading-ruler-toggle">
          <input
            id="reading-ruler-toggle"
            type="checkbox"
            checked={prefs.readingRulerEnabled}
            onChange={(e) => handleUpdate({ readingRulerEnabled: e.target.checked })}
            aria-label="Reading ruler"
          />
          Reading ruler
        </label>
      </div>

      {/* TTS speed — Req 8.4 */}
      <div>
        <label htmlFor="tts-speed-slider">Reading speed: {prefs.ttsSpeed.toFixed(2)}×</label>
        <input
          id="tts-speed-slider"
          type="range"
          min={0.5}
          max={2.0}
          step={0.05}
          value={prefs.ttsSpeed}
          onChange={(e) => handleUpdate({ ttsSpeed: parseFloat(e.target.value) })}
          aria-label="TTS speed"
        />
      </div>

      {/* Difficulty level — Req 11.4 */}
      <fieldset>
        <legend>Difficulty level</legend>
        {DIFFICULTY_LEVELS.map((level) => (
          <button
            key={level}
            onClick={() => handleDifficultyChange(level)}
            aria-pressed={difficulty === level}
            aria-label={`Difficulty level ${level}`}
            style={{
              fontWeight: difficulty === level ? 'bold' : 'normal',
              border: difficulty === level ? '2px solid #333' : '1px solid #ccc',
              padding: '8px 16px',
              margin: '0 4px',
              cursor: 'pointer',
            }}
          >
            {level}
          </button>
        ))}
      </fieldset>
    </div>
  );
}
