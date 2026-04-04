import type { DifficultyLevel, LevelSuggestion, ProgressRecord } from '../types';

// --- Module state ---

let currentLevel: DifficultyLevel = 1;

// --- Public API ---

/**
 * Returns the current difficulty level. Defaults to 1 on first use.
 */
export function getCurrentLevel(): DifficultyLevel {
  return currentLevel;
}

/**
 * Manually set the difficulty level.
 */
export function setLevel(level: DifficultyLevel): void {
  currentLevel = level;
}

/**
 * Reset to level 1 (for testing).
 */
export function resetLevel(): void {
  currentLevel = 1;
}

/**
 * Analyse progress records at the current level and suggest a level change.
 *
 * - Level-up: ≥5 completions at current level with ≥60% correct/partial → suggest 'up' (unless already at 3)
 * - Level-down: <30% correct over last 3 passages at current level AND level > 1 → suggest 'down'
 * - Otherwise: null
 */
export function suggestLevelChange(records: ProgressRecord[]): LevelSuggestion | null {
  const atLevel = records.filter((r) => r.difficulty === currentLevel);

  // Check level-up condition first
  if (currentLevel < 3 && atLevel.length >= 5) {
    let totalQuestions = 0;
    let totalSatisfactory = 0;

    for (const r of atLevel) {
      totalQuestions += r.questionsTotal;
      totalSatisfactory += r.questionsCorrect + r.questionsPartial;
    }

    if (totalQuestions > 0 && totalSatisfactory / totalQuestions >= 0.6) {
      return {
        direction: 'up',
        message: "You're doing really well! Would you like to try something a bit more challenging?",
      };
    }
  }

  // Check level-down condition
  if (currentLevel > 1 && atLevel.length >= 3) {
    const lastThree = atLevel.slice(-3);

    let totalQuestions = 0;
    let totalCorrect = 0;

    for (const r of lastThree) {
      totalQuestions += r.questionsTotal;
      totalCorrect += r.questionsCorrect;
    }

    if (totalQuestions > 0 && totalCorrect / totalQuestions < 0.3) {
      return {
        direction: 'down',
        message: "These passages seem quite tricky. Would you like to go back to an easier level for a while?",
      };
    }
  }

  return null;
}
