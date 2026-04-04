// Unit tests for WordExerciseView component
// Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.1, 10.2

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WordExerciseView from './WordExerciseView';
import type { TaggedWord } from '../types';

function makeWord(overrides?: Partial<TaggedWord>): TaggedWord {
  return {
    word: 'ancient',
    definition: 'Very old; belonging to the distant past.',
    passageContext: 'The ancient ruins stood tall against the sky.',
    isCurriculumWord: true,
    ...overrides,
  };
}

function typeAndSubmit(value: string) {
  const input = screen.getByLabelText(/type the word/i) ?? screen.getByLabelText(/type your sentence/i);
  fireEvent.change(input, { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: /submit/i }));
}

function typeWordAndSubmit(value: string) {
  const input = screen.getByLabelText(/type the word/i);
  fireEvent.change(input, { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: /submit/i }));
}

function typeSentenceAndSubmit(value: string) {
  const input = screen.getByLabelText(/type your sentence/i);
  fireEvent.change(input, { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: /submit/i }));
}

describe('WordExerciseView', () => {
  it('renders the type-three-times step initially (Req 4.1)', () => {
    render(<WordExerciseView word={makeWord()} />);

    expect(screen.getByText(/type the word/i)).toBeInTheDocument();
    expect(screen.getByText(/"ancient"/)).toBeInTheDocument();
    expect(screen.getByText(/0 of 3/)).toBeInTheDocument();
  });

  it('shows progress indicator during type-three-times step', () => {
    render(<WordExerciseView word={makeWord()} />);

    expect(screen.getByLabelText(/typing progress/i)).toBeInTheDocument();
    expect(screen.getByText(/0 of 3/)).toBeInTheDocument();
  });

  it('has a text input and submit button', () => {
    render(<WordExerciseView word={makeWord()} />);

    expect(screen.getByLabelText(/type the word/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('disables submit when input is empty', () => {
    render(<WordExerciseView word={makeWord()} />);

    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
  });

  it('advances typing count on correct input (Req 4.1)', () => {
    render(<WordExerciseView word={makeWord()} />);

    typeWordAndSubmit('ancient');
    expect(screen.getByLabelText(/typing progress/i).textContent).toContain('1 of 3');
  });

  it('transitions to use-in-sentence after 3 correct typings (Req 4.2)', () => {
    render(<WordExerciseView word={makeWord()} />);

    typeWordAndSubmit('ancient');
    typeWordAndSubmit('ancient');
    typeWordAndSubmit('ancient');

    expect(screen.getByText(/use the word in a sentence/i)).toBeInTheDocument();
  });

  it('transitions to type-from-memory after valid sentence (Req 4.3)', () => {
    render(<WordExerciseView word={makeWord()} />);

    // Complete type-three-times
    typeWordAndSubmit('ancient');
    typeWordAndSubmit('ancient');
    typeWordAndSubmit('ancient');

    // Submit sentence containing the word
    typeSentenceAndSubmit('The ancient castle was beautiful.');

    expect(screen.getByText(/can you type the word from memory/i)).toBeInTheDocument();
  });

  it('completes exercise and reveals definition + context (Req 4.4)', () => {
    const word = makeWord();
    render(<WordExerciseView word={word} />);

    // Complete all steps
    typeWordAndSubmit('ancient');
    typeWordAndSubmit('ancient');
    typeWordAndSubmit('ancient');
    typeSentenceAndSubmit('The ancient castle was beautiful.');
    typeWordAndSubmit('ancient');

    // Completion state
    expect(screen.getByText(/well done/i)).toBeInTheDocument();
    expect(screen.getByText(word.definition)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(word.passageContext))).toBeInTheDocument();
  });

  it('calls onComplete when exercise finishes', () => {
    const onComplete = vi.fn();
    render(<WordExerciseView word={makeWord()} onComplete={onComplete} />);

    typeWordAndSubmit('ancient');
    typeWordAndSubmit('ancient');
    typeWordAndSubmit('ancient');
    typeSentenceAndSubmit('The ancient castle was beautiful.');
    typeWordAndSubmit('ancient');

    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('shows gentle error on incorrect typing without penalty (Req 4.5)', () => {
    render(<WordExerciseView word={makeWord()} />);

    typeWordAndSubmit('wrong');

    // Should show encouraging feedback
    expect(screen.getByRole('status')).toBeInTheDocument();
    // Should still be on type-three-times step at 0/3
    expect(screen.getByLabelText(/typing progress/i).textContent).toContain('0 of 3');
  });

  it('allows retry after incorrect input — stays at same step', () => {
    render(<WordExerciseView word={makeWord()} />);

    typeWordAndSubmit('wrong');
    expect(screen.getByLabelText(/typing progress/i).textContent).toContain('0 of 3');

    // Retry with correct input
    typeWordAndSubmit('ancient');
    expect(screen.getByLabelText(/typing progress/i).textContent).toContain('1 of 3');
  });

  it('shows gentle error on sentence without target word', () => {
    render(<WordExerciseView word={makeWord()} />);

    typeWordAndSubmit('ancient');
    typeWordAndSubmit('ancient');
    typeWordAndSubmit('ancient');

    // Submit sentence without the word
    typeSentenceAndSubmit('The castle was beautiful.');

    expect(screen.getByRole('status')).toBeInTheDocument();
    // Should still be on use-in-sentence step
    expect(screen.getByText(/use the word in a sentence/i)).toBeInTheDocument();
  });

  it('shows gentle error on incorrect memory recall', () => {
    render(<WordExerciseView word={makeWord()} />);

    typeWordAndSubmit('ancient');
    typeWordAndSubmit('ancient');
    typeWordAndSubmit('ancient');
    typeSentenceAndSubmit('The ancient castle was beautiful.');

    // Wrong recall
    typeWordAndSubmit('ancent');

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/can you type the word from memory/i)).toBeInTheDocument();
  });

  it('is case-insensitive for typing', () => {
    render(<WordExerciseView word={makeWord()} />);

    typeWordAndSubmit('ANCIENT');
    expect(screen.getByLabelText(/typing progress/i).textContent).toContain('1 of 3');

    typeWordAndSubmit('Ancient');
    expect(screen.getByLabelText(/typing progress/i).textContent).toContain('2 of 3');
  });

  it('has a skip button at every step (Req 10.2)', () => {
    render(<WordExerciseView word={makeWord()} />);

    // type-three-times step
    expect(screen.getByRole('button', { name: /skip exercise/i })).toBeInTheDocument();

    // Advance to use-in-sentence
    typeWordAndSubmit('ancient');
    typeWordAndSubmit('ancient');
    typeWordAndSubmit('ancient');
    expect(screen.getByRole('button', { name: /skip exercise/i })).toBeInTheDocument();

    // Advance to type-from-memory
    typeSentenceAndSubmit('The ancient castle was beautiful.');
    expect(screen.getByRole('button', { name: /skip exercise/i })).toBeInTheDocument();
  });

  it('calls onSkip when skip button is clicked', () => {
    const onSkip = vi.fn();
    render(<WordExerciseView word={makeWord()} onSkip={onSkip} />);

    fireEvent.click(screen.getByRole('button', { name: /skip exercise/i }));

    expect(onSkip).toHaveBeenCalledOnce();
  });

  it('has no timers, scores, or percentages (Req 10.1)', () => {
    const { container } = render(<WordExerciseView word={makeWord()} />);

    const text = container.textContent ?? '';
    expect(text).not.toMatch(/\d+%/);
    expect(text).not.toMatch(/score/i);
    expect(text).not.toMatch(/timer/i);
    expect(text).not.toMatch(/time remaining/i);
  });

  it('submits on Enter key press in typing steps', () => {
    render(<WordExerciseView word={makeWord()} />);

    const input = screen.getByLabelText(/type the word/i);
    fireEvent.change(input, { target: { value: 'ancient' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByLabelText(/typing progress/i).textContent).toContain('1 of 3');
  });

  it('shows error feedback styling on incorrect input', () => {
    render(<WordExerciseView word={makeWord()} />);

    typeWordAndSubmit('wrong');

    // Feedback area should have error background
    const feedback = screen.getByRole('status');
    expect(feedback).toHaveStyle({ background: '#fce4e4' });
  });
});
