import { getPreference, setPreference } from '../db/store';
import type { UserPreferences } from '../types';

export const DEFAULT_PREFERENCES: UserPreferences = {
  fontSize: 18,
  lineSpacing: 1.5,
  backgroundColor: '#FFF8E7',
  fontFamily: 'OpenDyslexic',
  readingRulerEnabled: true,
  ttsSpeed: 0.85,
};

const PREFERENCE_KEYS = Object.keys(DEFAULT_PREFERENCES) as (keyof UserPreferences)[];

export async function getPreferences(): Promise<UserPreferences> {
  const result = { ...DEFAULT_PREFERENCES };

  for (const key of PREFERENCE_KEYS) {
    const value = await getPreference<UserPreferences[typeof key]>(key);
    if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value;
    }
  }

  return result;
}

export async function updatePreferences(
  partial: Partial<UserPreferences>,
): Promise<void> {
  const current = await getPreferences();
  const merged = { ...current, ...partial };

  for (const key of PREFERENCE_KEYS) {
    await setPreference(key, merged[key]);
  }
}
