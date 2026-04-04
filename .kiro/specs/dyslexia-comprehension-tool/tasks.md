# Implementation Plan: Dyslexia Comprehension Tool

## Overview

Build a React + TypeScript SPA that generates reading passages and comprehension questions via a local Ollama/Gemma model, reinforces vocabulary through motor-memory exercises with SM-2 spaced repetition, and presents everything in a dyslexia-friendly, anxiety-free interface. Data is persisted in IndexedDB; TTS uses the Web Speech API.

## Tasks

- [x] 1. Project scaffolding and core types
  - [x] 1.1 Initialise React + TypeScript project with Vite, install dependencies (fast-check, idb, OpenDyslexic font)
    - Create project with `npm create vite@latest` using the react-ts template
    - Install runtime deps: `idb` for IndexedDB wrapper
    - Install dev deps: `vitest`, `fast-check`, `@testing-library/react`
    - Add OpenDyslexic web font files or CDN link to `index.html`
    - _Requirements: 6.1_

  - [x] 1.2 Define shared TypeScript types and interfaces
    - Create `src/types.ts` with all shared types: `Genre`, `DifficultyLevel`, `Passage`, `TaggedWord`, `ComprehensionQuestion`, `QuestionType`, `WordBankEntry`, `PassageRecord`, `ProgressRecord`, `UserPreferences`, `ReviewUpdate`, `LevelSuggestion`, `ExerciseSession`, `ExerciseStepResult`
    - _Requirements: 1.2, 2.2, 3.1, 3.2, 4.1, 5.1, 6.4, 11.1_

  - [x] 1.3 Create the Y5/6 statutory word list constant
    - Create `src/data/statutoryWords.ts` containing the `YEAR_5_6_STATUTORY_WORDS` array as specified in the design
    - _Requirements: 2.1_

- [x] 2. IndexedDB persistence layer
  - [x] 2.1 Implement IndexedDB store with idb wrapper
    - Create `src/db/store.ts` implementing database initialisation with object stores: `passages`, `wordBank`, `progress`, `preferences`
    - Define indexes as specified in the design schema (genre, difficulty, createdAt, word, nextReviewDate, mastered, date, passageId)
    - Implement CRUD helpers for each store
    - Handle storage-full and read/write failure errors gracefully per the design error handling section
    - _Requirements: 5.1, 5.3, 9.1, 6.5, 7.5, 10.5_

- [x] 3. Ollama HTTP client
  - [x] 3.1 Implement OllamaClient
    - Create `src/services/ollamaClient.ts` implementing `generate()` and `isAvailable()`
    - Base URL `http://localhost:11434`, default model `gemma:2b`, 30-second timeout
    - Return friendly error message when Ollama is unavailable
    - _Requirements: 1.1, 1.7_

- [x] 4. Passage generation and word tagging
  - [x] 4.1 Implement PassageGenerator
    - Create `src/services/passageGenerator.ts`
    - Build structured prompts specifying genre, difficulty, word count (150–500), paragraph length (≤4 sentences), and child-friendly themes
    - Validate output: word count in range, paragraph structure correct
    - Retry once on validation failure with refined prompt; fall back to friendly error on second failure
    - Support 3 difficulty levels controlling vocabulary complexity
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 11.1_

  - [x] 4.2 Write property test for passage structure validation
    - **Property 1: Passage structure validation** — for any passage returned, word count ∈ [150, 500] and every paragraph ≤ 4 sentences
    - **Validates: Requirements 1.4, 1.6**

  - [x] 4.3 Implement WordTagger
    - Create `src/services/wordTagger.ts`
    - Cross-reference passage words against Y5/6 statutory word list
    - Apply word frequency/complexity heuristics for non-curriculum words
    - Enforce 3–10 tagged words per passage; supplement from statutory list if <3, trim to 10 most relevant if >10
    - Each tagged word includes definition and passage context sentence
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 4.4 Write property test for tagged word completeness
    - **Property 2: Tagged word completeness** — for any passage, tagged word count ∈ [3, 10] and each has non-empty definition and context
    - **Validates: Requirements 2.2, 2.4**

- [x] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Comprehension questions and answer evaluation
  - [x] 6.1 Implement QuestionGenerator
    - Create `src/services/questionGenerator.ts`
    - Generate 4–8 questions per passage via Ollama with a mix of types: retrieval, inference, vocabulary, author's purpose, summarisation
    - Each question includes 2–3 graduated hints and a model answer with relevant passage section
    - Retry once if <4 questions generated; present whatever valid questions exist (minimum 1) on second failure
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

  - [x] 6.2 Write property test for question generation structure
    - **Property 3: Question generation structure** — count ∈ [4, 8], ≥2 distinct types, every question has non-empty hints and relevantSection
    - **Validates: Requirements 3.1, 3.2, 3.4**

  - [x] 6.3 Implement answer evaluation
    - Add `evaluateAnswer()` to QuestionGenerator that uses Ollama to compare learner answer against model answer
    - Return exactly one of 'correct', 'partial', or 'incorrect'
    - Present questions one at a time
    - _Requirements: 3.3, 3.6_

  - [x] 6.4 Write property test for answer evaluation category
    - **Property 4: Answer evaluation returns valid category** — for any answer submitted, result ∈ {'correct', 'partial', 'incorrect'}
    - **Validates: Requirements 3.3**

- [x] 7. Motor memory exercise
  - [x] 7.1 Implement MotorMemoryExercise state machine
    - Create `src/services/motorMemoryExercise.ts`
    - Implement three-step flow: type-three-times → use-in-sentence → type-from-memory → complete
    - Case-insensitive comparison, trim whitespace, ignore empty submissions
    - Incorrect input keeps exercise at same step without penalty, with encouraging feedback
    - On completion, reveal definition + context and add word to WordBank
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 2.3_

  - [x] 7.2 Write property test for exercise state machine
    - **Property 5: Motor memory exercise state machine** — 3 correct typings → use-in-sentence → valid sentence → type-from-memory → correct recall → complete with definition available
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

  - [x] 7.3 Write property test for incorrect typing non-advancement
    - **Property 6: Incorrect typing does not advance exercise** — incorrect input at any step keeps same step and progress count
    - **Validates: Requirements 4.5**

- [x] 8. Word bank and spaced repetition
  - [x] 8.1 Implement WordBankStore
    - Create `src/services/wordBankStore.ts` implementing `addWord()`, `getAll()` (sorted by nextReviewDate ascending), `getDueForReview()`, `updateReviewResult()`, `getMasteredCount()`
    - Use IndexedDB store from task 2.1
    - _Requirements: 5.1, 5.3, 5.4, 5.5_

  - [x] 8.2 Write property test for word bank addition round trip
    - **Property 7: Word bank addition round trip** — add word after exercise, retrieve all, assert word present with matching definition and context
    - **Validates: Requirements 5.1**

  - [x] 8.3 Write property test for word bank sorted by review date
    - **Property 9: Word bank sorted by review date** — getAll() returns entries sorted by nextReviewDate ascending, due entries before future entries
    - **Validates: Requirements 5.3**

  - [x] 8.4 Write property test for word bank query correctness
    - **Property 10: Word bank query correctness** — getDueForReview() returns exactly entries with nextReviewDate ≤ now; getMasteredCount() equals count of mastered entries
    - **Validates: Requirements 5.4, 5.5**

  - [x] 8.5 Implement SpacedRepetitionScheduler (SM-2)
    - Create `src/services/spacedRepetitionScheduler.ts`
    - SM-2 algorithm: initial intervals 1 day, 3 days, then formula; ease factor adjusts on recall quality
    - Binary recall (recalled/not) mapped to SM-2 quality for child UX
    - Word mastered when interval ≥ 21 days
    - _Requirements: 5.2_

  - [x] 8.6 Write property test for spaced repetition interval monotonicity
    - **Property 8: Spaced repetition interval monotonicity** — consecutive successful recalls produce non-decreasing intervals
    - **Validates: Requirements 5.2**

- [x] 9. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Progress tracking and difficulty management
  - [x] 10.1 Implement ProgressTracker
    - Create `src/services/progressTracker.ts`
    - Record passage completions with date, track consecutive-day streaks, count completions at each difficulty level
    - `shouldSuggestLevelUp()`: true after ≥5 passages at current level with ≥60% correct/partial answers
    - _Requirements: 9.1, 9.2, 9.3, 11.3_

  - [x] 10.2 Write property test for progress recording round trip
    - **Property 13: Progress recording round trip** — recorded completion is retrievable with correct passageId and today's date
    - **Validates: Requirements 9.1**

  - [x] 10.3 Write property test for streak calculation correctness
    - **Property 14: Streak calculation correctness** — streak equals longest run of consecutive calendar days ending at today (0 if no completion today)
    - **Validates: Requirements 9.2**

  - [x] 10.4 Implement DifficultyManager
    - Create `src/services/difficultyManager.ts`
    - Default to level 1 on first use; allow manual override
    - Suggest level-up after 5 passages with satisfactory comprehension
    - Suggest level-down when <30% correct over last 3 passages at level >1
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 10.5 Write property test for difficulty suggestion correctness
    - **Property 16: Difficulty suggestion correctness** — shouldSuggestLevelUp() true at ≥5 completions with satisfactory comprehension; suggestLevelChange() returns 'down' when below struggling threshold at level >1
    - **Validates: Requirements 11.3, 11.5**

- [x] 11. Display preferences and TTS
  - [x] 11.1 Implement DisplayPreferences service
    - Create `src/services/displayPreferences.ts`
    - Defaults: fontSize 18px, lineSpacing 1.5, backgroundColor '#FFF8E7' (cream), fontFamily 'OpenDyslexic', readingRulerEnabled true, ttsSpeed 0.85
    - Persist to IndexedDB preferences store; apply changes immediately on update
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.5_

  - [x] 11.2 Write property test for preference persistence round trip
    - **Property 11: Preference persistence round trip** — update() then get() returns all updated values including readingRulerEnabled
    - **Validates: Requirements 6.5, 7.5**

  - [x] 11.3 Implement TTSController
    - Create `src/services/ttsController.ts` wrapping Web Speech API
    - speak(), pause(), resume(), stop(), setRate() with clamping to [0.5, 2.0]
    - Word boundary events for highlighting; start from specific paragraph offset
    - Hide TTS controls if `window.speechSynthesis` unavailable
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 11.4 Write property test for TTS rate clamping
    - **Property 12: TTS rate clamping** — any numeric rate passed to setRate() is clamped to [0.5, 2.0]
    - **Validates: Requirements 8.4**

- [x] 12. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. UI components — passage reading experience
  - [x] 13.1 Implement PassageView component
    - Create `src/components/PassageView.tsx`
    - Render passage text in short paragraphs with tagged words highlighted/clickable
    - Genre and difficulty selectors; "New Passage" button
    - Show friendly fallback message when Ollama is unavailable
    - Apply dyslexia-friendly styles from DisplayPreferences (font, background, line spacing)
    - Simple, uncluttered layout with clear navigation
    - _Requirements: 1.1, 1.2, 1.7, 2.3, 6.1, 6.2, 6.3, 6.6, 10.5_

  - [x] 13.2 Implement ReadingRuler component
    - Create `src/components/ReadingRuler.tsx`
    - Semi-transparent overlay dimming all lines except active line
    - Respond to click, tap, and keyboard (up/down arrow) events
    - Toggle on/off; persist preference via DisplayPreferences
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 13.3 Implement TTSControls component
    - Create `src/components/TTSControls.tsx`
    - Play/pause/resume/stop buttons; speed slider
    - Word-level highlighting during playback
    - Click paragraph to start reading from that point
    - Hidden entirely if Web Speech API unavailable
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 14. UI components — questions, exercises, and word bank
  - [x] 14.1 Implement QuestionView component with scaffolding
    - Create `src/components/QuestionView.tsx`
    - Present questions one at a time with text input for answers
    - Show feedback: correct / partial / incorrect with encouraging language
    - Graduated hints with passage section highlighting via ScaffoldingHints sub-component
    - Allow skipping any question without negative feedback
    - No timers, no scores, no percentages
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 3.6, 10.1, 10.2, 10.3, 10.4_

  - [x] 14.2 Implement WordExerciseView component
    - Create `src/components/WordExerciseView.tsx`
    - Three-step motor memory UI: type 3 times → use in sentence → type from memory
    - Gentle error indication on incorrect input; allow retry without penalty
    - Reveal definition + context on completion
    - Allow skipping without negative feedback
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.1, 10.2_

  - [x] 14.3 Implement WordBankView component
    - Create `src/components/WordBankView.tsx`
    - Display all saved words sorted by next review date (due words first)
    - "Words Mastered" counter
    - Launch motor memory exercise for due review words
    - _Requirements: 5.3, 5.4, 5.5_

- [x] 15. UI components — progress, settings, and app shell
  - [x] 15.1 Implement ProgressView component
    - Create `src/components/ProgressView.tsx`
    - Visual, non-test-like progress display (e.g., growing garden or filling map metaphor)
    - Show passages completed, current streak, words in bank, words mastered
    - Encouraging language only — no scores, percentages, or rankings
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.3_

  - [x] 15.2 Implement SettingsPanel component
    - Create `src/components/SettingsPanel.tsx`
    - Controls for font size, background colour, line spacing, reading ruler toggle, TTS speed
    - Manual difficulty level selector
    - Changes apply immediately and persist
    - _Requirements: 6.4, 6.5, 7.4, 7.5, 8.4, 11.4_

  - [x] 15.3 Implement App shell and routing
    - Create `src/App.tsx` with navigation between PassageView, WordBankView, ProgressView, SettingsPanel
    - Apply global dyslexia-friendly styles from preferences
    - Default to difficulty level 1 on first use
    - Difficulty level-up/down suggestions as gentle prompts
    - Positive completion feedback regardless of performance
    - _Requirements: 6.1, 6.2, 6.3, 6.6, 10.4, 11.2, 11.3, 11.4, 11.5_

- [x] 16. Passage retrieval and previous passage access
  - [x] 16.1 Implement passage history and retrieval
    - Store every generated passage in IndexedDB via the passages store
    - Allow learner to browse and revisit any previous passage at any time
    - Suggested as fallback when Ollama is unavailable
    - _Requirements: 1.7, 10.5_

  - [x] 16.2 Write property test for previous passages always retrievable
    - **Property 15: Previous passages always retrievable** — any stored passage remains retrievable after further operations
    - **Validates: Requirements 10.5**

- [x] 17. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases
- All code is React + TypeScript; persistence via IndexedDB (idb wrapper); LLM via local Ollama HTTP API
