import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuestionView, { ScaffoldingHints } from './QuestionView';
import type { ComprehensionQuestion } from '../types';

function makeQuestions(count = 3): ComprehensionQuestion[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `q-${i + 1}`,
    text: `Question ${i + 1}: What happened in the story?`,
    type: i % 2 === 0 ? 'retrieval' as const : 'inference' as const,
    modelAnswer: `The dragon was green and flew over the castle`,
    hints: [`Hint 1 for Q${i + 1}`, `Hint 2 for Q${i + 1}`, `Hint 3 for Q${i + 1}`],
    relevantSection: `Relevant section for question ${i + 1}`,
  }));
}

describe('QuestionView', () => {
  it('renders the first question', () => {
    render(<QuestionView questions={makeQuestions()} />);
    expect(screen.getByText(/Question 1 of 3/)).toBeInTheDocument();
    expect(screen.getByText(/Question 1:/)).toBeInTheDocument();
  });

  it('shows one question at a time', () => {
    render(<QuestionView questions={makeQuestions()} />);
    expect(screen.getByText(/Question 1:/)).toBeInTheDocument();
    expect(screen.queryByText(/Question 2:/)).not.toBeInTheDocument();
  });

  it('disables submit when answer is empty', () => {
    render(<QuestionView questions={makeQuestions()} />);
    expect(screen.getByRole('button', { name: /submit answer/i })).toBeDisabled();
  });

  it('shows feedback and model answer after submitting', () => {
    render(<QuestionView questions={makeQuestions()} />);
    fireEvent.change(screen.getByLabelText(/type your answer/i), { target: { value: 'The dragon was green' } });
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));
    // Should show model answer
    expect(screen.getByText(/The dragon was green and flew over the castle/)).toBeInTheDocument();
  });

  it('shows the student answer back to them in feedback', () => {
    render(<QuestionView questions={makeQuestions()} />);
    fireEvent.change(screen.getByLabelText(/type your answer/i), { target: { value: 'My test answer here' } });
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));
    expect(screen.getByText('My test answer here')).toBeInTheDocument();
  });

  it('shows relevant passage section in feedback', () => {
    render(<QuestionView questions={makeQuestions(1)} />);
    fireEvent.change(screen.getByLabelText(/type your answer/i), { target: { value: 'something' } });
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));
    expect(screen.getByText(/From the passage:/)).toBeInTheDocument();
    expect(screen.getByText('Relevant section for question 1')).toBeInTheDocument();
  });

  it('shows a tip for the question type when answer is not correct', () => {
    render(<QuestionView questions={makeQuestions(1)} />);
    fireEvent.change(screen.getByLabelText(/type your answer/i), { target: { value: 'completely wrong answer xyz' } });
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));
    expect(screen.getByText(/Tip for next time/)).toBeInTheDocument();
  });

  it('allows skipping and shows model answer', () => {
    render(<QuestionView questions={makeQuestions()} />);
    fireEvent.click(screen.getByRole('button', { name: /skip question/i }));
    expect(screen.getByText(/No worries/)).toBeInTheDocument();
    expect(screen.getByText(/The dragon was green and flew over the castle/)).toBeInTheDocument();
  });

  it('reveals hints one at a time', () => {
    render(<QuestionView questions={makeQuestions(1)} />);
    expect(screen.queryByText('Hint 1 for Q1')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /show hint/i }));
    expect(screen.getByText('Hint 1 for Q1')).toBeInTheDocument();
    expect(screen.queryByText('Hint 2 for Q1')).not.toBeInTheDocument();
  });

  it('advances to next question after feedback', () => {
    render(<QuestionView questions={makeQuestions()} />);
    fireEvent.change(screen.getByLabelText(/type your answer/i), { target: { value: 'answer' } });
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));
    fireEvent.click(screen.getByRole('button', { name: /next question/i }));
    expect(screen.getByText(/Question 2 of 3/)).toBeInTheDocument();
  });

  it('shows completion message after all questions', () => {
    render(<QuestionView questions={makeQuestions(1)} />);
    fireEvent.change(screen.getByLabelText(/type your answer/i), { target: { value: 'answer' } });
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));
    fireEvent.click(screen.getByRole('button', { name: /finish questions/i }));
    expect(screen.getByText(/great job/i)).toBeInTheDocument();
  });

  it('calls onComplete when finished', () => {
    const onComplete = vi.fn();
    render(<QuestionView questions={makeQuestions(1)} onComplete={onComplete} />);
    fireEvent.change(screen.getByLabelText(/type your answer/i), { target: { value: 'answer' } });
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));
    fireEvent.click(screen.getByRole('button', { name: /finish questions/i }));
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('shows empty state when no questions', () => {
    render(<QuestionView questions={[]} />);
    expect(screen.getByText(/no questions available/i)).toBeInTheDocument();
  });

  it('has no timers, scores, or percentages', () => {
    const { container } = render(<QuestionView questions={makeQuestions()} />);
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/\d+%/);
    expect(text).not.toMatch(/score/i);
    expect(text).not.toMatch(/timer/i);
  });
});

describe('ScaffoldingHints', () => {
  it('renders nothing when hintsRevealed is 0', () => {
    const { container } = render(
      <ScaffoldingHints hints={['Hint 1']} relevantSection="Section" hintsRevealed={0} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the correct number of hints', () => {
    render(<ScaffoldingHints hints={['A', 'B', 'C']} relevantSection="Section" hintsRevealed={2} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.queryByText('C')).not.toBeInTheDocument();
  });
});
