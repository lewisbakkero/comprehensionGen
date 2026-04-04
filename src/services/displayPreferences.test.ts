import 'fake-indexeddb/auto';
import { deleteDB } from 'idb';
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDBConnection } from '../db/store';
import {
  DEFAULT_PREFERENCES,
  getPreferences,
  updatePreferences,
} from './displayPreferences';

beforeEach(async () => {
  await resetDBConnection();
  await deleteDB('dyslexia-comprehension-tool');
});

describe('DisplayPreferences', () => {
  describe('DEFAULT_PREFERENCES', () => {
    it('should have fontSize 18', () => {
      expect(DEFAULT_PREFERENCES.fontSize).toBe(18);
    });

    it('should have lineSpacing 1.5', () => {
      expect(DEFAULT_PREFERENCES.lineSpacing).toBe(1.5);
    });

    it('should have cream backgroundColor #FFF8E7', () => {
      expect(DEFAULT_PREFERENCES.backgroundColor).toBe('#FFF8E7');
    });

    it('should have fontFamily OpenDyslexic', () => {
      expect(DEFAULT_PREFERENCES.fontFamily).toBe('OpenDyslexic');
    });

    it('should have readingRulerEnabled true', () => {
      expect(DEFAULT_PREFERENCES.readingRulerEnabled).toBe(true);
    });

    it('should have ttsSpeed 0.85', () => {
      expect(DEFAULT_PREFERENCES.ttsSpeed).toBe(0.85);
    });
  });

  describe('getPreferences', () => {
    it('should return defaults when no preferences are stored', async () => {
      const prefs = await getPreferences();
      expect(prefs).toEqual(DEFAULT_PREFERENCES);
    });

    it('should return stored values merged with defaults', async () => {
      await updatePreferences({ fontSize: 24 });
      const prefs = await getPreferences();
      expect(prefs.fontSize).toBe(24);
      expect(prefs.lineSpacing).toBe(1.5);
      expect(prefs.backgroundColor).toBe('#FFF8E7');
    });
  });

  describe('updatePreferences', () => {
    it('should persist a single preference change', async () => {
      await updatePreferences({ backgroundColor: '#E0F0FF' });
      const prefs = await getPreferences();
      expect(prefs.backgroundColor).toBe('#E0F0FF');
    });

    it('should persist multiple preference changes at once', async () => {
      await updatePreferences({
        fontSize: 22,
        lineSpacing: 2.0,
        fontFamily: 'Arial',
      });
      const prefs = await getPreferences();
      expect(prefs.fontSize).toBe(22);
      expect(prefs.lineSpacing).toBe(2.0);
      expect(prefs.fontFamily).toBe('Arial');
    });

    it('should apply changes immediately on subsequent get', async () => {
      await updatePreferences({ ttsSpeed: 1.2 });
      const prefs1 = await getPreferences();
      expect(prefs1.ttsSpeed).toBe(1.2);

      await updatePreferences({ ttsSpeed: 0.6 });
      const prefs2 = await getPreferences();
      expect(prefs2.ttsSpeed).toBe(0.6);
    });

    it('should persist readingRulerEnabled toggle', async () => {
      await updatePreferences({ readingRulerEnabled: false });
      const prefs = await getPreferences();
      expect(prefs.readingRulerEnabled).toBe(false);

      await updatePreferences({ readingRulerEnabled: true });
      const prefs2 = await getPreferences();
      expect(prefs2.readingRulerEnabled).toBe(true);
    });

    it('should not affect unrelated preferences when updating one', async () => {
      await updatePreferences({ fontSize: 30 });
      const prefs = await getPreferences();
      expect(prefs.fontSize).toBe(30);
      expect(prefs.lineSpacing).toBe(DEFAULT_PREFERENCES.lineSpacing);
      expect(prefs.backgroundColor).toBe(DEFAULT_PREFERENCES.backgroundColor);
      expect(prefs.fontFamily).toBe(DEFAULT_PREFERENCES.fontFamily);
      expect(prefs.readingRulerEnabled).toBe(DEFAULT_PREFERENCES.readingRulerEnabled);
      expect(prefs.ttsSpeed).toBe(DEFAULT_PREFERENCES.ttsSpeed);
    });

    it('should round-trip all preferences after full update', async () => {
      const custom = {
        fontSize: 14,
        lineSpacing: 2.5,
        backgroundColor: '#000000',
        fontFamily: 'Comic Sans',
        readingRulerEnabled: false,
        ttsSpeed: 1.5,
      };
      await updatePreferences(custom);
      const prefs = await getPreferences();
      expect(prefs).toEqual(custom);
    });
  });
});
