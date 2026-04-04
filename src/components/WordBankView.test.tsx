// Unit tests for WordBankView component
// Requirements: 5.3, 5.4, 5.5

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import WordBankView from './WordBankView';
import type { WordBankEntry } from '../types';

vi.mock('../services/wordBankStore', () => ({
  getAll: vi.fn(),
  getMasteredCount: vi.fn(),
}));

import * as wordBankStore from '../services/wordBankStore';

const mockedGetAll = vi.mocked(wordBankStore.getAll);
const mockedGetMasteredCount = vi.mocked(wordBankStore.getMasteredCount);

function makeEntry(overrides?: Partial<WordBankEntry>): WordBankEntry {
  return {
    id: 'w1',
    word: 'ancient',
    definition: 'Very old; belonging to the distant past.',
    passageContext: 'The ancient ruins stood tall.',
    addedDate: new Date('2024-01-01'),
    nextReviewDate: new Date('2024-01-02'),
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
    mastered: false,
    ...overrides,
  };
}

describe('WordBankView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state when word bank has no entries', async () => {
    mockedGetAll.mockResolvedValue([]);
    mockedGetMasteredCount.mockResolvedValue(0);

    render(<WordBankView />);

    await waitFor(() => {
      expect(screen.getByText(/your word bank is empty/i)).toBeInTheDocument();
    });
  });

  it('displays mastered counter (Req 5.5)', async () => {
    mockedGetAll.mockResolvedValue([
      makeEntry({ id: 'w1', mastered: true }),
      makeEntry({ id: 'w2', mastered: false }),
    ]);
    mockedGetMasteredCount.mockResolvedValue(1);

    render(<WordBankView />);

    await waitFor(() => {
      expect(screen.getByLabelText(/words mastered/i)).toHaveTextContent('1');
    });
  });

  it('displays all saved words with word and definition', async () => {
    mockedGetAll.mockResolvedValue([
      makeEntry({ id: 'w1', word: 'ancient', definition: 'Very old.' }),
      makeEntry({ id: 'w2', word: 'bargain', definition: 'A good deal.' }),
    ]);
    mockedGetMasteredCount.mockResolvedValue(0);

    render(<WordBankView />);

    await waitFor(() => {
      expect(screen.getByText('ancient')).toBeInTheDocument();
      expect(screen.getByText('Very old.')).toBeInTheDocument();
      expect(screen.getByText('bargain')).toBeInTheDocument();
      expect(screen.getByText('A good deal.')).toBeInTheDocument();
    });
  });

  it('shows mastered status on mastered words', async () => {
    mockedGetAll.mockResolvedValue([
      makeEntry({ id: 'w1', word: 'ancient', mastered: true }),
    ]);
    mockedGetMasteredCount.mockResolvedValue(1);

    render(<WordBankView />);

    await waitFor(() => {
      expect(screen.getByLabelText('Mastered')).toBeInTheDocument();
    });
  });

  it('highlights due words with a Review button (Req 5.3, 5.4)', async () => {
    const pastDate = new Date(Date.now() - 86400000); // yesterday
    const futureDate = new Date(Date.now() + 86400000 * 7); // next week

    mockedGetAll.mockResolvedValue([
      makeEntry({ id: 'w1', word: 'ancient', nextReviewDate: pastDate }),
      makeEntry({ id: 'w2', word: 'bargain', nextReviewDate: futureDate }),
    ]);
    mockedGetMasteredCount.mockResolvedValue(0);

    const onReviewWord = vi.fn();
    render(<WordBankView onReviewWord={onReviewWord} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Review ancient')).toBeInTheDocument();
    });

    // Future word should not have a review button
    expect(screen.queryByLabelText('Review bargain')).not.toBeInTheDocument();
  });

  it('calls onReviewWord with TaggedWord when Review is clicked', async () => {
    const pastDate = new Date(Date.now() - 86400000);
    const entry = makeEntry({
      id: 'w1',
      word: 'ancient',
      definition: 'Very old.',
      passageContext: 'The ancient ruins.',
      nextReviewDate: pastDate,
    });

    mockedGetAll.mockResolvedValue([entry]);
    mockedGetMasteredCount.mockResolvedValue(0);

    const onReviewWord = vi.fn();
    render(<WordBankView onReviewWord={onReviewWord} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Review ancient')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Review ancient'));

    expect(onReviewWord).toHaveBeenCalledOnce();
    expect(onReviewWord).toHaveBeenCalledWith({
      word: 'ancient',
      definition: 'Very old.',
      passageContext: 'The ancient ruins.',
      isCurriculumWord: false,
    });
  });

  it('does not show Review buttons when onReviewWord is not provided', async () => {
    const pastDate = new Date(Date.now() - 86400000);
    mockedGetAll.mockResolvedValue([
      makeEntry({ id: 'w1', word: 'ancient', nextReviewDate: pastDate }),
    ]);
    mockedGetMasteredCount.mockResolvedValue(0);

    render(<WordBankView />);

    await waitFor(() => {
      expect(screen.getByText('ancient')).toBeInTheDocument();
    });

    expect(screen.queryByLabelText('Review ancient')).not.toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    mockedGetAll.mockReturnValue(new Promise(() => {})); // never resolves
    mockedGetMasteredCount.mockReturnValue(new Promise(() => {}));

    render(<WordBankView />);

    expect(screen.getByLabelText(/loading word bank/i)).toBeInTheDocument();
  });

  it('shows encouraging empty state message', async () => {
    mockedGetAll.mockResolvedValue([]);
    mockedGetMasteredCount.mockResolvedValue(0);

    render(<WordBankView />);

    await waitFor(() => {
      expect(
        screen.getByText(/start reading passages to collect new words/i),
      ).toBeInTheDocument();
    });
  });
});
