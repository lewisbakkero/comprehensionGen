// Unit tests for ProgressView component
// Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.3

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ProgressView from './ProgressView';

vi.mock('../services/progressTracker', () => ({
  getCompletedCount: vi.fn(),
  getCurrentStreak: vi.fn(),
}));

vi.mock('../services/wordBankStore', () => ({
  getAll: vi.fn(),
  getMasteredCount: vi.fn(),
}));

import * as progressTracker from '../services/progressTracker';
import * as wordBankStore from '../services/wordBankStore';

const mockedGetCompletedCount = vi.mocked(progressTracker.getCompletedCount);
const mockedGetCurrentStreak = vi.mocked(progressTracker.getCurrentStreak);
const mockedGetAll = vi.mocked(wordBankStore.getAll);
const mockedGetMasteredCount = vi.mocked(wordBankStore.getMasteredCount);

describe('ProgressView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    mockedGetCompletedCount.mockReturnValue(new Promise(() => {}));
    mockedGetCurrentStreak.mockReturnValue(new Promise(() => {}));
    mockedGetAll.mockReturnValue(new Promise(() => {}));
    mockedGetMasteredCount.mockReturnValue(new Promise(() => {}));

    render(<ProgressView />);

    expect(screen.getByLabelText(/loading progress/i)).toBeInTheDocument();
  });

  it('displays passages completed count (Req 9.1)', async () => {
    mockedGetCompletedCount.mockResolvedValue(3);
    mockedGetCurrentStreak.mockResolvedValue(1);
    mockedGetAll.mockResolvedValue([]);
    mockedGetMasteredCount.mockResolvedValue(0);

    render(<ProgressView />);

    await waitFor(() => {
      expect(screen.getByLabelText(/passages completed/i)).toHaveTextContent('3 flowers planted');
    });
  });

  it('displays current streak (Req 9.2)', async () => {
    mockedGetCompletedCount.mockResolvedValue(5);
    mockedGetCurrentStreak.mockResolvedValue(4);
    mockedGetAll.mockResolvedValue([]);
    mockedGetMasteredCount.mockResolvedValue(0);

    render(<ProgressView />);

    await waitFor(() => {
      expect(screen.getByLabelText(/current streak/i)).toHaveTextContent('4 sunshine days');
    });
  });

  it('displays words in bank count (Req 9.3)', async () => {
    const fakeWords = Array.from({ length: 7 }, (_, i) => ({ id: `w${i}` }));
    mockedGetCompletedCount.mockResolvedValue(2);
    mockedGetCurrentStreak.mockResolvedValue(1);
    mockedGetAll.mockResolvedValue(fakeWords as any);
    mockedGetMasteredCount.mockResolvedValue(0);

    render(<ProgressView />);

    await waitFor(() => {
      expect(screen.getByLabelText(/words in bank/i)).toHaveTextContent('7 seeds planted');
    });
  });

  it('displays words mastered count (Req 9.3)', async () => {
    mockedGetCompletedCount.mockResolvedValue(2);
    mockedGetCurrentStreak.mockResolvedValue(1);
    mockedGetAll.mockResolvedValue([]);
    mockedGetMasteredCount.mockResolvedValue(5);

    render(<ProgressView />);

    await waitFor(() => {
      expect(screen.getByLabelText(/words mastered/i)).toHaveTextContent('5 words bloomed');
    });
  });

  it('uses encouraging language only — no scores, percentages, or rankings (Req 9.4, 10.3)', async () => {
    mockedGetCompletedCount.mockResolvedValue(3);
    mockedGetCurrentStreak.mockResolvedValue(2);
    mockedGetAll.mockResolvedValue([{ id: 'w1' }] as any);
    mockedGetMasteredCount.mockResolvedValue(1);

    const { container } = render(<ProgressView />);

    await waitFor(() => {
      expect(screen.getByLabelText(/your progress garden/i)).toBeInTheDocument();
    });

    const text = container.textContent ?? '';
    // No percentages
    expect(text).not.toMatch(/\d+%/);
    // No score-like language
    expect(text.toLowerCase()).not.toContain('score');
    expect(text.toLowerCase()).not.toContain('ranking');
    expect(text.toLowerCase()).not.toContain('grade');
  });

  it('shows visual garden metaphor (Req 9.5)', async () => {
    mockedGetCompletedCount.mockResolvedValue(2);
    mockedGetCurrentStreak.mockResolvedValue(1);
    mockedGetAll.mockResolvedValue([]);
    mockedGetMasteredCount.mockResolvedValue(0);

    render(<ProgressView />);

    await waitFor(() => {
      expect(screen.getByLabelText(/your progress garden/i)).toBeInTheDocument();
      expect(screen.getByText(/your reading garden/i)).toBeInTheDocument();
    });
  });

  it('shows encouraging message for new learners with zero progress', async () => {
    mockedGetCompletedCount.mockResolvedValue(0);
    mockedGetCurrentStreak.mockResolvedValue(0);
    mockedGetAll.mockResolvedValue([]);
    mockedGetMasteredCount.mockResolvedValue(0);

    render(<ProgressView />);

    await waitFor(() => {
      expect(screen.getByText(/plant your first flower/i)).toBeInTheDocument();
    });
  });

  it('shows encouraging message when streak is zero', async () => {
    mockedGetCompletedCount.mockResolvedValue(3);
    mockedGetCurrentStreak.mockResolvedValue(0);
    mockedGetAll.mockResolvedValue([]);
    mockedGetMasteredCount.mockResolvedValue(0);

    render(<ProgressView />);

    await waitFor(() => {
      expect(screen.getByLabelText(/current streak/i)).toHaveTextContent('0 sunshine days');
      expect(screen.getByText(/read today to start your streak/i)).toBeInTheDocument();
    });
  });

  it('shows singular form for 1 passage', async () => {
    mockedGetCompletedCount.mockResolvedValue(1);
    mockedGetCurrentStreak.mockResolvedValue(1);
    mockedGetAll.mockResolvedValue([{ id: 'w1' }] as any);
    mockedGetMasteredCount.mockResolvedValue(1);

    render(<ProgressView />);

    await waitFor(() => {
      expect(screen.getByLabelText(/passages completed/i)).toHaveTextContent('1 flower planted');
      expect(screen.getByLabelText(/current streak/i)).toHaveTextContent('1 sunshine day');
      expect(screen.getByLabelText(/words in bank/i)).toHaveTextContent('1 seed planted');
      expect(screen.getByLabelText(/words mastered/i)).toHaveTextContent('1 word bloomed');
    });
  });

  it('shows special message for 5+ passages completed', async () => {
    mockedGetCompletedCount.mockResolvedValue(6);
    mockedGetCurrentStreak.mockResolvedValue(2);
    mockedGetAll.mockResolvedValue([]);
    mockedGetMasteredCount.mockResolvedValue(0);

    render(<ProgressView />);

    await waitFor(() => {
      expect(screen.getByText(/what a beautiful garden/i)).toBeInTheDocument();
    });
  });
});
