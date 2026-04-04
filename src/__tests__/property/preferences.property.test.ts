// Feature: dyslexia-comprehension-tool, Property 11: Preference persistence round trip

import 'fake-indexeddb/auto';
import { deleteDB } from 'idb';
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { resetDBConnection } from '../../db/store';
import { getPreferences, updatePreferences } from '../../services/displayPreferences';
import type { UserPreferences } from '../../types';

const FONT_POOL = [
  'OpenDyslexic',
  'Lexie Readable',
  'Arial',
  'Comic Sans MS',
  'Verdana',
  'Tahoma',
  'Georgia',
  'Trebuchet MS',
];

/**
 * Arbitrary that generates a valid UserPreferences object with
 * randomised but realistic values matching the design constraints.
 */
function userPreferencesArb(): fc.Arbitrary<UserPreferences> {
  return fc.record({
    fontSize: fc.integer({ min: 10, max: 40 }),
    lineSpacing: fc.double({ min: 1.0, max: 3.0, noNaN: true }),
    backgroundColor: fc.stringMatching(/^[0-9a-fA-F]{6}$/).map((h) => `#${h}`),
    fontFamily: fc.constantFrom(...FONT_POOL),
    readingRulerEnabled: fc.boolean(),
    ttsSpeed: fc.double({ min: 0.5, max: 2.0, noNaN: true }),
  });
}

beforeEach(async () => {
  await resetDBConnection();
  await deleteDB('dyslexia-comprehension-tool');
});

// **Validates: Requirements 6.5, 7.5**
describe('Property 11: Preference persistence round trip', () => {
  it('update() then get() returns all updated values including readingRulerEnabled', () => {
    fc.assert(
      fc.asyncProperty(userPreferencesArb(), async (prefs) => {
        await updatePreferences(prefs);
        const retrieved = await getPreferences();

        expect(retrieved.fontSize).toBe(prefs.fontSize);
        expect(retrieved.lineSpacing).toBe(prefs.lineSpacing);
        expect(retrieved.backgroundColor).toBe(prefs.backgroundColor);
        expect(retrieved.fontFamily).toBe(prefs.fontFamily);
        expect(retrieved.readingRulerEnabled).toBe(prefs.readingRulerEnabled);
        expect(retrieved.ttsSpeed).toBe(prefs.ttsSpeed);

        // Clean up for next iteration
        await resetDBConnection();
        await deleteDB('dyslexia-comprehension-tool');
      }),
      { numRuns: 100 },
    );
  });
});
