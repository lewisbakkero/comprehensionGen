# Dyslexia Comprehension Tool

A practice tool for dyslexic children (ages 10–11, UK Year 6) preparing for 11+ English comprehension exams. It generates reading passages and comprehension questions via a local Ollama/Gemma model, reinforces vocabulary through motor-memory exercises with SM-2 spaced repetition, and presents everything in a dyslexia-friendly, anxiety-free interface.

## Prerequisites

- **Node.js** 18+ (recommended: 20+)
- **npm** 9+
- **Ollama** running locally (for passage and question generation)

## Install and Run

### 1. Install dependencies

```bash
npm install
```

### 2. Install and start Ollama

The tool uses a local Ollama instance to generate passages and questions. Install Ollama from [ollama.com](https://ollama.com), then pull the default model:

```bash
ollama pull gemma:2b
```

Start the Ollama server (it runs on `http://localhost:11434` by default):

```bash
ollama serve
```

> The app comes with 12 pre-written seed passages (one per genre/difficulty combination) so it works immediately without Ollama. When Ollama is available, new passages are generated in the background as you use up the existing ones.

### 3. Start the development server

```bash
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

### 4. Build for production

```bash
npm run build
```

The output goes to `dist/`. Preview it locally with:

```bash
npm run preview
```

## How to Use

The app has four tabs along the top: Read, Word Bank, Progress, and Settings.

### Reading a passage

1. Select a genre (Fiction, Non-Fiction, Poetry, Persuasive) and difficulty level (1, 2, or 3)
2. Click "New Passage" — a passage loads instantly from the built-in library
3. Read the passage. Challenging vocabulary words are highlighted in orange
4. Comprehension questions appear below the passage automatically

### Answering comprehension questions

- Questions are shown one at a time below the passage
- Type your answer and click "Submit" to get feedback (correct, partially correct, or not quite)
- Click "Show Hint" for graduated clues — each click reveals a more helpful hint plus the relevant passage section
- Click "Skip" to move on without penalty — there are no scores or timers
- After all questions, you'll see an encouraging completion message

### Learning vocabulary (motor memory exercise)

Click any highlighted orange word in a passage to start the three-step exercise:

1. **Type it 3 times** — the word is shown and you type it correctly three times to build muscle memory for the spelling
2. **Use it in a sentence** — write any sentence containing the word to reinforce its meaning
3. **Type from memory** — the word is hidden and you type it from recall

After completing all three steps, the word's definition and original passage context are revealed, and the word is saved to your Word Bank. This approach is based on the "look, cover, write, check" method used in UK primary schools, extended with a sentence step for deeper understanding. You can skip the exercise at any point without penalty.

### Word Bank (📚 tab)

- Shows all words you've practised, sorted by next review date
- Words due for review have a "Review" button that launches the motor memory exercise again
- A "Words Mastered" counter tracks long-term retention
- Words are scheduled for review using SM-2 spaced repetition — intervals grow with each successful recall

### Progress (🌻 tab)

- A visual garden that grows as you practise — no scores, percentages, or rankings
- Tracks passages completed (flowers), current streak (sunshine days), words collected (seeds), and words mastered (bloomed)

### Settings (⚙️ tab)

- Adjust font size, line spacing, and background colour for comfortable reading
- Toggle the reading ruler on/off
- Change text-to-speech speed
- Manually set difficulty level

## Run Tests

```bash
npm test
```

This runs all unit tests and property-based tests (fast-check) via Vitest.

## Project Structure

```
src/
  types.ts                  # Shared TypeScript types
  data/
    statutoryWords.ts       # UK Year 5/6 statutory spelling word list
  db/
    store.ts                # IndexedDB persistence layer (idb wrapper)
  services/
    ollamaClient.ts         # Ollama HTTP client
    passageGenerator.ts     # Passage generation + validation
    wordTagger.ts           # Vocabulary tagging (curriculum + heuristic)
    questionGenerator.ts    # Comprehension question generation + answer evaluation
    motorMemoryExercise.ts  # Three-step word exercise state machine
    wordBankStore.ts        # Word bank CRUD
    spacedRepetitionScheduler.ts  # SM-2 spaced repetition algorithm
    progressTracker.ts      # Passage completion tracking + streaks
    difficultyManager.ts    # Difficulty level management + suggestions
    displayPreferences.ts   # Dyslexia-friendly display settings
    ttsController.ts        # Web Speech API wrapper
    passageHistory.ts       # Passage storage and retrieval
  components/
    PassageView.tsx         # Main reading experience
    ReadingRuler.tsx        # Line-tracking overlay
    TTSControls.tsx         # Text-to-speech controls
    QuestionView.tsx        # Comprehension questions with scaffolding
    WordExerciseView.tsx    # Motor memory exercise UI
    WordBankView.tsx        # Personal word bank
    ProgressView.tsx        # Visual progress (garden metaphor)
    SettingsPanel.tsx       # Display and difficulty settings
  App.tsx                   # App shell with tab navigation
```

## Key Features

- **Passage generation** — fiction, non-fiction, poetry, persuasive writing via local LLM
- **Vocabulary tagging** — automatic identification of challenging words using the UK Year 5/6 statutory list and complexity heuristics
- **Comprehension questions** — retrieval, inference, vocabulary, author's purpose, summarisation with graduated hints
- **Motor memory exercises** — type 3 times → use in sentence → type from memory
- **Spaced repetition** — SM-2 algorithm for long-term vocabulary retention
- **Dyslexia-friendly display** — OpenDyslexic font, cream background, adjustable font size/spacing/colours
- **Reading ruler** — line-tracking overlay with keyboard and click support
- **Text-to-speech** — Web Speech API with word-level highlighting
- **Progress tracking** — visual garden metaphor, streaks, no scores or percentages
- **Anxiety-free** — no timers, no penalties, encouraging language throughout
