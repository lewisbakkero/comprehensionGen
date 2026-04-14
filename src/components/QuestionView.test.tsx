import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import QuestionView, { ScaffoldingHints } from './QuestionView';
import type { ComprehensionQuestion } from '../types';

function makeQuestions(count = 3): ComprehensionQuestion[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `q-${i + 1}`,
    text: `Question ${i + 1}: What happened?`,
    type: i % 2 === 0 ? 'retrieval' as const : 'inference' as const,
    modelAnswer: `The dragon was green and flew over the castle`,
    hints: [`Hint 1 for Q${i + 1}`, `Hint 2 for Q${i + 1}`],
    relevantSection: `Relevant section for Q${i + 1}`,
  }));
}

describe('QuestionView', () => {
  it('renders the first question', () => {
    render(<QuestionView questions={makeQuestions()} />);
    expect(screen.getByText(/Question 1 of 3/)).toBeInTheDocument();
  });

  it('shows feedback with correct answer after submit', () => {
    render(<QuestionView questions={makeQuestions(1)} />);
    fireEvent.change(screen.getByLabelText(/type your answer/i), { target: { value: 'The dragon was green' } });
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));
    expect(screen.getByText(/Correct answer:/)).toBeInTheDocument();
    expect(screen.getByText(/The dragon was green and flew over the castle/)).toBeInTheDocument();
  });

  it('shows student answer in feedback', () => {
    render(<QuestionView questions={makeQuestions(1)} />);
    fireEvent.change(screen.getByLabelText(/type your answer/i), { target: { value: 'My answer here' } });
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));
    expect(screen.getByText('My answer here')).toBeInTheDocument();
  });

  it('shows correct answer when skipping', () => {
    render(<QuestionView questions={makeQuestions(1)} />);
    fireEvent.click(screen.getByRole('button', { name: /skip question/i }));
    expect(screen.getByText(/Correct answer:/)).toBeInTheDocument();
    expect(screen.getByText(/The dragon was green and flew over the castle/)).toBeInTheDocument();
  });

  it('shows passage evidence in feedback', () => {
    render(<QuestionView questions={makeQuestions(1)} />);
    fireEvent.change(screen.getByLabelText(/type your answer/i), { target: { value: 'answer' } });
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));
    expect(screen.getByText(/From the passage:/)).toBeInTheDocument();
  });

  it('shows cumulative score after first answer', () => {
    render(<QuestionView questions={makeQuestions(3)} />);
    fireEvent.change(screen.getByLabelText(/type your answer/i), { target: { value: 'The dragon was green and flew over the castle' } });
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));
    fireEvent.click(screen.getByRole('button', { name: /next question/i }));
    expect(screen.getByText(/correct so far/)).toBeInTheDocument();
  });

  it('shows review summary after all questions', async () => {
    render(<QuestionView questions={makeQuestions(1)} />);
    await act(async () => {
      fireEvent.change(screen.getByLabelText(/type your answer/i), { target: { value: 'answer' } });
      fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));
    });
    // Find the "See My Results" button by text
    const btn = screen.getByText('See My Results');
    fireEvent.click(btn);
    expect(screen.getByText(/Your Answers/)).toBeInTheDocument();
  });

  it('review shows both student and correct answers', async () => {
    render(<QuestionView questions={makeQuestions(1)} />);
    await act(async () => {
      fireEvent.change(screen.getByLabelText(/type your answer/i), { target: { value: 'My specific answer' } });
      fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));
    });
    fireEvent.click(screen.getByText('See My Results'));
    expect(screen.getByText('My specific answer')).toBeInTheDocument();
    expect(screen.getByText(/The dragon was green and flew over the castle/)).toBeInTheDocument();
  });

  it('calls onComplete with results', async () => {
    const onComplete = vi.fn();
    render(<QuestionView questions={makeQuestions(1)} onComplete={onComplete} />);
    await act(async () => {
      fireEvent.change(screen.getByLabelText(/type your answer/i), { target: { value: 'answer' } });
      fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByText('See My Results'));
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
    expect(onComplete.mock.calls[0][0]).toHaveLength(1);
  });

  it('shows empty state when no questions', () => {
    render(<QuestionView questions={[]} />);
    expect(screen.getByText(/no questions available/i)).toBeInTheDocument();
  });
});

describe('ScaffoldingHints', () => {
  it('renders nothing when hintsRevealed is 0', () => {
    const { container } = render(<ScaffoldingHints hints={['H1']} relevantSection="S" hintsRevealed={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders correct number of hints', () => {
    render(<ScaffoldingHints hints={['A', 'B', 'C']} relevantSection="S" hintsRevealed={2} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.queryByText('C')).not.toBeInTheDocument();
  });
});
