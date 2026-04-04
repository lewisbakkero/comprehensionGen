# Requirements Document

## Introduction

A practice tool designed for dyslexic children (ages 10–11, UK Year 6) preparing for 11+ English comprehension examinations. The tool dynamically generates age-appropriate reading passages and comprehension questions using a local Ollama/Gemma model, reinforces vocabulary through motor-memory techniques, and presents everything in a dyslexia-friendly, anxiety-free interface. The goal is to build reading confidence and comprehension skills without replicating the stress of a formal test environment.

## Glossary

- **Comprehension_Tool**: The overall application that generates passages, questions, and vocabulary exercises
- **Passage_Generator**: The component that interfaces with Ollama/Gemma to produce reading passages
- **Question_Generator**: The component that creates comprehension questions for a given passage
- **Word_Tagger**: The component that identifies and tags difficult or notable vocabulary within a passage
- **Word_Bank**: A personal per-user collection of vocabulary words the learner has encountered, along with definitions, mastery status, and review schedule
- **Reading_Ruler**: A visual overlay that highlights the current line of text and dims surrounding lines to aid reading focus
- **Display_Engine**: The component responsible for rendering text, controls, and UI elements on screen
- **TTS_Engine**: The text-to-speech component that reads passage text and UI labels aloud
- **Progress_Tracker**: The component that records completed passages, streaks, and words mastered
- **Scaffolding_System**: The component that provides graduated hints for comprehension questions before revealing the answer
- **Spaced_Repetition_Scheduler**: The component that determines when Word_Bank entries should be reviewed based on spaced repetition intervals
- **Learner**: The child user of the Comprehension_Tool
- **Passage**: A generated reading text in one of the supported genres
- **Genre**: A category of writing style — fiction, non-fiction, poetry, or persuasive writing
- **Difficulty_Level**: A numeric scale representing vocabulary and sentence complexity within a Passage
- **Motor_Memory_Exercise**: The "type it 3 times" interaction followed by sentence usage and recall typing

## Requirements

### Requirement 1: Passage Generation

**User Story:** As a learner, I want to read interesting, age-appropriate passages in different genres, so that I can practise comprehension across the range of text types found in 11+ exams.

#### Acceptance Criteria

1. WHEN the Learner requests a new passage, THE Passage_Generator SHALL send a prompt to the local Ollama/Gemma model and return a Passage within 30 seconds.
2. THE Passage_Generator SHALL support generating passages in the following genres: fiction, non-fiction, poetry, and persuasive writing.
3. WHEN generating a Passage, THE Passage_Generator SHALL use themes appealing to 10–11-year-olds, including but not limited to animals, space, adventure, and mystery.
4. THE Passage_Generator SHALL produce passages between 150 and 500 words in length, appropriate for Year 6 reading level.
5. WHEN a Difficulty_Level is specified, THE Passage_Generator SHALL control vocabulary complexity to match that level.
6. THE Passage_Generator SHALL structure each Passage into short paragraphs of no more than 4 sentences each.
7. IF the Ollama/Gemma model is unavailable or returns an error, THEN THE Passage_Generator SHALL display a friendly message explaining that a new passage cannot be created right now and suggest the Learner revisit a previous passage.

### Requirement 2: Vocabulary Tagging

**User Story:** As a learner, I want difficult words in a passage to be identified for me, so that I can learn their meanings and expand my vocabulary.

#### Acceptance Criteria

1. WHEN a Passage is generated, THE Word_Tagger SHALL automatically identify and tag words that are above the expected reading level for a Year 6 learner.
2. THE Word_Tagger SHALL tag a minimum of 3 and a maximum of 10 words per Passage.
3. WHEN a tagged word is selected by the Learner, THE Comprehension_Tool SHALL initiate the Motor_Memory_Exercise for that word before revealing its definition.
4. THE Word_Tagger SHALL provide a definition and the original passage context for each tagged word.

### Requirement 3: Comprehension Questions

**User Story:** As a learner, I want to answer comprehension questions that match real 11+ exam formats, so that I am well prepared for the types of questions I will face.

#### Acceptance Criteria

1. WHEN a Passage has been read, THE Question_Generator SHALL produce between 4 and 8 comprehension questions for that Passage.
2. THE Question_Generator SHALL include a mix of question types: retrieval, inference, vocabulary in context, author's purpose, and summarisation.
3. WHEN the Learner submits an answer, THE Question_Generator SHALL evaluate the answer and provide feedback indicating whether the answer is correct, partially correct, or incorrect.
4. WHEN the Learner answers incorrectly, THE Scaffolding_System SHALL offer a graduated hint referencing the relevant section of the Passage before revealing the correct answer.
5. WHEN a hint is provided, THE Display_Engine SHALL highlight the key sentence in the relevant Passage section.
6. THE Question_Generator SHALL present questions one at a time to avoid overwhelming the Learner.

### Requirement 4: Motor Memory Word Exercise

**User Story:** As a learner, I want to type new words multiple times and use them in sentences, so that I remember them through physical practice.

#### Acceptance Criteria

1. WHEN a Motor_Memory_Exercise begins, THE Comprehension_Tool SHALL prompt the Learner to type the target word correctly 3 times.
2. WHEN the Learner has typed the word 3 times correctly, THE Comprehension_Tool SHALL prompt the Learner to use the word in a sentence.
3. WHEN the Learner has completed the sentence step, THE Comprehension_Tool SHALL hide the word and prompt the Learner to type it from memory.
4. WHEN all steps of the Motor_Memory_Exercise are complete, THE Comprehension_Tool SHALL reveal the word's definition alongside its original Passage context.
5. IF the Learner types the word incorrectly during any step, THEN THE Comprehension_Tool SHALL gently indicate the error and allow the Learner to try again without penalty.

### Requirement 5: Word Bank and Spaced Repetition

**User Story:** As a learner, I want a personal word bank that helps me revisit words over time, so that I retain vocabulary long-term.

#### Acceptance Criteria

1. WHEN a Motor_Memory_Exercise is completed for a word, THE Word_Bank SHALL add that word with its definition and original Passage context.
2. THE Spaced_Repetition_Scheduler SHALL schedule Word_Bank entries for review at increasing intervals based on the Learner's recall accuracy.
3. WHEN the Learner opens the Word_Bank, THE Comprehension_Tool SHALL display all saved words sorted by next review date, with due words shown first.
4. WHEN a word is due for review, THE Comprehension_Tool SHALL present a Motor_Memory_Exercise for that word.
5. THE Word_Bank SHALL display a "Words Mastered" counter showing the total number of words the Learner has successfully retained through spaced repetition.

### Requirement 6: Dyslexia-Friendly Display

**User Story:** As a learner with dyslexia, I want the text to be displayed in a way that reduces visual stress, so that I can read more comfortably and for longer.

#### Acceptance Criteria

1. THE Display_Engine SHALL render all passage and question text using a dyslexia-friendly font (OpenDyslexic or Lexie Readable).
2. THE Display_Engine SHALL use a default background colour that reduces visual stress (cream or pastel tone) instead of pure white.
3. THE Display_Engine SHALL use a default line spacing of at least 1.5× the font size.
4. THE Display_Engine SHALL provide controls allowing the Learner to adjust text size, background colour, and line spacing.
5. WHEN the Learner adjusts a display setting, THE Display_Engine SHALL apply the change immediately and persist the preference for future sessions.
6. THE Display_Engine SHALL present a simple, uncluttered interface with clear navigation and minimal distracting elements.

### Requirement 7: Reading Ruler

**User Story:** As a learner with dyslexia, I want a reading ruler that follows the line I am reading, so that I can keep my place in the text.

#### Acceptance Criteria

1. THE Display_Engine SHALL provide a Reading_Ruler overlay that highlights the current line of text.
2. WHILE the Reading_Ruler is active, THE Display_Engine SHALL dim all lines above and below the highlighted line.
3. WHEN the Learner moves focus to a different line (via click, tap, or keyboard), THE Reading_Ruler SHALL move to highlight that line.
4. THE Display_Engine SHALL allow the Learner to toggle the Reading_Ruler on or off.
5. WHEN the Reading_Ruler is toggled, THE Display_Engine SHALL persist the Learner's preference for future sessions.

### Requirement 8: Text-to-Speech

**User Story:** As a learner, I want to hear the passage read aloud, so that I can follow along and improve my understanding of the text.

#### Acceptance Criteria

1. THE TTS_Engine SHALL provide a control to read the current Passage aloud.
2. WHEN text-to-speech is active, THE TTS_Engine SHALL highlight each word or sentence as it is spoken.
3. THE TTS_Engine SHALL provide controls to pause, resume, and stop playback.
4. THE TTS_Engine SHALL allow the Learner to adjust the reading speed.
5. WHEN the Learner selects a specific paragraph, THE TTS_Engine SHALL begin reading from that paragraph.

### Requirement 9: Progress Tracking and Motivation

**User Story:** As a learner, I want to see how many passages I have completed and how my vocabulary is growing, so that I feel encouraged to keep practising.

#### Acceptance Criteria

1. THE Progress_Tracker SHALL record each completed Passage and the date of completion.
2. THE Progress_Tracker SHALL track the Learner's current streak of consecutive days with at least one completed Passage.
3. THE Progress_Tracker SHALL display the total number of words in the Word_Bank and the number of words mastered.
4. THE Progress_Tracker SHALL use gentle, encouraging language in all feedback (e.g., "Well done, keep going!" rather than numerical scores or grades).
5. THE Progress_Tracker SHALL present progress information in a visual, non-test-like format (e.g., a garden that grows, a map that fills in).

### Requirement 10: Anxiety-Free Experience

**User Story:** As a learner who experiences test anxiety, I want the tool to feel like practice rather than a test, so that I can learn without stress.

#### Acceptance Criteria

1. THE Comprehension_Tool SHALL present no timed elements during any reading, question, or vocabulary exercise.
2. THE Comprehension_Tool SHALL allow the Learner to skip any question or exercise without negative feedback.
3. THE Comprehension_Tool SHALL avoid displaying scores, percentages, or rankings.
4. WHEN the Learner completes an exercise, THE Comprehension_Tool SHALL provide positive, supportive feedback regardless of performance.
5. THE Comprehension_Tool SHALL allow the Learner to return to any previous Passage or exercise at any time.

### Requirement 11: Difficulty Progression

**User Story:** As a learner, I want the passages and vocabulary to gradually become more challenging, so that I improve over time without being overwhelmed.

#### Acceptance Criteria

1. THE Passage_Generator SHALL support at least 3 Difficulty_Levels representing increasing vocabulary and sentence complexity.
2. WHEN the Learner first uses the Comprehension_Tool, THE Passage_Generator SHALL default to the lowest Difficulty_Level.
3. WHEN the Learner has completed 5 passages at the current Difficulty_Level with satisfactory comprehension, THE Comprehension_Tool SHALL suggest moving to the next Difficulty_Level.
4. THE Comprehension_Tool SHALL allow the Learner to manually select a Difficulty_Level at any time.
5. IF the Learner moves to a higher Difficulty_Level and struggles, THEN THE Comprehension_Tool SHALL gently suggest returning to the previous level.
