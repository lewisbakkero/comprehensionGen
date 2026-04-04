// Unit tests for QuestionView component
// Requirements: 3.1, 3.3, 3.4, 3.5, 3.6, 10.1, 10.2, 10.3, 10.4

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QuestionView, { ScaffoldingHints } from './QuestionView';
import type { ComprehensionQuestion } from '../types';

// Mock the evaluateAnswer function from questionGenerator
vi.mock('../services/questionGenerator', () => ({
  evaluateAnswer: vi.fn(),
}));

import { evaluateAnswer } from '../services/questionGenerator';

const mockEvaluateAnswer = vi.mocked(evaluateAnswer);

function makeQuestions(count = 3): ComprehensionQuestion[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `q-${i + 1}`,
    text: `Question ${i + 1}: What happened in the story?`,
    type: i % 2 === 0 ? 'retrieval' : 'inference',
    modelAnswer: `Model answer for question ${i + 1}`,
    hints: [`Hint 1 for Q${i + 1}`, `Hint 2 for Q${i + 1}`, `Hint 3 for Q${i + 1}`],
    relevantSection: `Relevant section for question ${i + 1}`,
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('QuestionView', () => {
  it('renders the first question', () => {
    const questions = makeQuestions();
    render(<QuestionView questions={questions} />);

    expect(screen.getByText(/Question 1 of 3/)).toBeInTheDocument();
    expect(screen.getByText(questions[0].text)).toBeInTheDocument();
  });

  it('shows one question at a time (Req 3.6)', () => {
    const questions = makeQuestions();
    render(<QuestionView questions={questions} />);

    expect(screen.getByText(questions[0].text)).toBeInTheDocument();
    expect(screen.queryByText(questions[1].text)).not.toBeInTheDocument();
  });

  it('renders answer input and submit button', () => {
    render(<QuestionView questions={makeQuestions()} />);

    expect(screen.getByLabelText(/type your answer/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit answer/i })).toBeInTheDocument();
  });

  it('disables submit when answer is empty', () => {
    render(<QuestionView questions={makeQuestions()} />);

    const submitBtn = screen.getByRole('button', { name: /submit answer/i });
    expect(submitBtn).toBeDisabled();
  });

  it('shows correct feedback with encouraging message', async () => {
    mockEvaluateAnswer.mockResolvedValue('correct');
    render(<QuestionView questions={makeQuestions()} />);

    const textarea = screen.getByLabelText(/type your answer/i);
    fireEvent.change(textarea, { target: { value: 'My answer' } });
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));

    await waitFor(() => {
      expect(screen.getByText("Well done! That's a great answer.")).toBeInTheDocument();
    });
  });

  it('shows partial feedback with encouraging message', async () => {
    mockEvaluateAnswer.mockResolvedValue('partial');
    render(<QuestionView questions={makeQuestions()} />);

    fireEvent.change(screen.getByLabelText(/type your answer/i), {
      target: { value: 'Partial answer' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));

    await waitFor(() => {
      expect(screen.getByText("Good thinking! You're on the right track.")).toBeInTheDocument();
    });
  });

  it('shows incorrect feedback with hints (Req 3.4)', async () => {
    mockEvaluateAnswer.mockResolvedValue('incorrect');
    const questions = makeQuestions(1);
    render(<QuestionView questions={questions} />);

    fireEvent.change(screen.getByLabelText(/type your answer/i), {
      target: { value: 'Wrong answer' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Not quite, but that's okay. Let's look at some hints."),
      ).toBeInTheDocument();
    });

    // All hints should be revealed on incorrect
    expect(screen.getByText('Hint 1 for Q1')).toBeInTheDocument();
    expect(screen.getByText('Hint 2 for Q1')).toBeInTheDocument();
    expect(screen.getByText('Hint 3 for Q1')).toBeInTheDocument();

    // Relevant section should be highlighted
    expect(screen.getByText('Relevant section for question 1')).toBeInTheDocument();
  });

  it('reveals hints one at a time when Show Hint is clicked (graduated hints)', () => {
    const questions = makeQuestions(1);
    render(<QuestionView questions={questions} />);

    // Initially no hints visible
    expect(screen.queryByText('Hint 1 for Q1')).not.toBeInTheDocument();

    // Click Show Hint once
    fireEvent.click(screen.getByRole('button', { name: /show hint/i }));
    expect(screen.getByText('Hint 1 for Q1')).toBeInTheDocument();
    expect(screen.queryByText('Hint 2 for Q1')).not.toBeInTheDocument();

    // Click Show Hint again
    fireEvent.click(screen.getByRole('button', { name: /show hint/i }));
    expect(screen.getByText('Hint 2 for Q1')).toBeInTheDocument();
    expect(screen.queryByText('Hint 3 for Q1')).not.toBeInTheDocument();

    // Click Show Hint a third time
    fireEvent.click(screen.getByRole('button', { name: /show hint/i }));
    expect(screen.getByText('Hint 3 for Q1')).toBeInTheDocument();
  });

  it('hides Show Hint button when all hints are revealed', () => {
    const questions = makeQuestions(1);
    render(<QuestionView questions={questions} />);

    // Reveal all 3 hints
    fireEvent.click(screen.getByRole('button', { name: /show hint/i }));
    fireEvent.click(screen.getByRole('button', { name: /show hint/i }));
    fireEvent.click(screen.getByRole('button', { name: /show hint/i }));

    expect(screen.queryByRole('button', { name: /show hint/i })).not.toBeInTheDocument();
  });

  it('shows relevant passage section when hints are revealed (Req 3.5)', () => {
    const questions = makeQuestions(1);
    render(<QuestionView questions={questions} />);

    fireEvent.click(screen.getByRole('button', { name: /show hint/i }));

    expect(
      screen.getByLabelText(/relevant passage section/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Relevant section for question 1')).toBeInTheDocument();
  });

  it('allows skipping without negative feedback (Req 10.2)', () => {
    render(<QuestionView questions={makeQuestions()} />);

    fireEvent.click(screen.getByRole('button', { name: /skip question/i }));

    expect(
      screen.getByText("No worries, let's try the next one!"),
    ).toBeInTheDocument();
  });

  it('advances to next question after feedback', async () => {
    mockEvaluateAnswer.mockResolvedValue('correct');
    const questions = makeQuestions();
    render(<QuestionView questions={questions} />);

    // Answer first question
    fireEvent.change(screen.getByLabelText(/type your answer/i), {
      target: { value: 'Answer' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /next question/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /next question/i }));

    expect(screen.getByText(/Question 2 of 3/)).toBeInTheDocument();
    expect(screen.getByText(questions[1].text)).toBeInTheDocument();
  });

  it('advances to next question after skipping', () => {
    const questions = makeQuestions();
    render(<QuestionView questions={questions} />);

    fireEvent.click(screen.getByRole('button', { name: /skip question/i }));
    fireEvent.click(screen.getByRole('button', { name: /next question/i }));

    expect(screen.getByText(/Question 2 of 3/)).toBeInTheDocument();
  });

  it('shows completion message after all questions', async () => {
    mockEvaluateAnswer.mockResolvedValue('correct');
    const questions = makeQuestions(1);
    render(<QuestionView questions={questions} />);

    fireEvent.change(screen.getByLabelText(/type your answer/i), {
      target: { value: 'Answer' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /finish questions/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /finish questions/i }));

    expect(
      screen.getByText(/great job.*finished all the questions/i),
    ).toBeInTheDocument();
  });

  it('calls onComplete when all questions are finished', async () => {
    mockEvaluateAnswer.mockResolvedValue('correct');
    const onComplete = vi.fn();
    render(<QuestionView questions={makeQuestions(1)} onComplete={onComplete} />);

    fireEvent.change(screen.getByLabelText(/type your answer/i), {
      target: { value: 'Answer' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /finish questions/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /finish questions/i }));

    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('shows empty state when no questions provided', () => {
    render(<QuestionView questions={[]} />);

    expect(screen.getByText(/no questions available/i)).toBeInTheDocument();
  });

  it('has no timers, scores, or percentages (Req 10.1, 10.3)', () => {
    const questions = makeQuestions();
    const { container } = render(<QuestionView questions={questions} />);

    const text = container.textContent ?? '';
    expect(text).not.toMatch(/\d+%/);
    expect(text).not.toMatch(/score/i);
    expect(text).not.toMatch(/timer/i);
    expect(text).not.toMatch(/time remaining/i);
  });

  it('resets answer and hints when moving to next question', async () => {
    mockEvaluateAnswer.mockResolvedValue('correct');
    const questions = makeQuestions();
    render(<QuestionView questions={questions} />);

    // Reveal a hint, type an answer, submit
    fireEvent.click(screen.getByRole('button', { name: /show hint/i }));
    fireEvent.change(screen.getByLabelText(/type your answer/i), {
      target: { value: 'Answer' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /next question/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /next question/i }));

    // Answer input should be empty, no hints visible
    const textarea = screen.getByLabelText(/type your answer/i);
    expect(textarea).toHaveValue('');
    expect(screen.queryByText('Hint 1 for Q2')).not.toBeInTheDocument();
  });

  it('calls evaluateAnswer with correct arguments', async () => {
    mockEvaluateAnswer.mockResolvedValue('correct');
    const questions = makeQuestions(1);
    render(<QuestionView questions={questions} />);

    fireEvent.change(screen.getByLabelText(/type your answer/i), {
      target: { value: 'My test answer' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));

    await waitFor(() => {
      expect(mockEvaluateAnswer).toHaveBeenCalledWith(
        'My test answer',
        questions[0].modelAnswer,
        questions[0].text,
      );
    });
  });

  it('defaults to partial feedback when evaluateAnswer throws', async () => {
    mockEvaluateAnswer.mockRejectedValue(new Error('Network error'));
    render(<QuestionView questions={makeQuestions(1)} />);

    fireEvent.change(screen.getByLabelText(/type your answer/i), {
      target: { value: 'Answer' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));

    await waitFor(() => {
      expect(screen.getByText("Good thinking! You're on the right track.")).toBeInTheDocument();
    });
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
    render(
      <ScaffoldingHints
        hints={['Hint A', 'Hint B', 'Hint C']}
        relevantSection="The relevant section"
        hintsRevealed={2}
      />,
    );

    expect(screen.getByText('Hint A')).toBeInTheDocument();
    expect(screen.getByText('Hint B')).toBeInTheDocument();
    expect(screen.queryByText('Hint C')).not.toBeInTheDocument();
  });

  it('renders the relevant passage section', () => {
    render(
      <ScaffoldingHints
        hints={['Hint 1']}
        relevantSection="The fox jumped over the fence."
        hintsRevealed={1}
      />,
    );

    expect(screen.getByText('The fox jumped over the fence.')).toBeInTheDocument();
    expect(screen.getByLabelText(/relevant passage section/i)).toBeInTheDocument();
  });
});
