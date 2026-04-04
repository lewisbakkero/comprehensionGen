import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PassageView from './PassageView';

vi.mock('../services/displayPreferences', () => ({
  getPreferences: vi.fn(() => Promise.resolve({
    fontSize: 18, lineSpacing: 1.5, backgroundColor: '#FFF8E7',
    fontFamily: 'OpenDyslexic', readingRulerEnabled: true, ttsSpeed: 0.85,
  })),
}));

vi.mock('../services/passageGenerator', () => ({
  generatePassage: vi.fn(),
}));

vi.mock('../services/wordTagger', () => ({
  tagWords: vi.fn(() => []),
}));

vi.mock('../services/questionGenerator', () => ({
  generateQuestions: vi.fn(() => Promise.resolve([])),
  evaluateAnswer: vi.fn(() => Promise.resolve('correct')),
}));

describe('PassageView', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders initial empty state with prompt message', async () => {
    render(<PassageView />);
    expect(screen.getByText(/choose a genre and level/i)).toBeInTheDocument();
  });

  it('renders genre selector with all four genres', () => {
    render(<PassageView />);
    const select = screen.getByLabelText(/select passage genre/i);
    expect(select).toBeInTheDocument();
    const options = select.querySelectorAll('option');
    const values = Array.from(options).map((o) => o.value);
    expect(values).toEqual(['fiction', 'non-fiction', 'poetry', 'persuasive']);
  });

  it('renders difficulty level buttons', () => {
    render(<PassageView />);
    for (const level of [1, 2, 3]) {
      expect(screen.getByRole('button', { name: new RegExp(`difficulty level ${level}`, 'i') })).toBeInTheDocument();
    }
  });

  it('loads a seed passage when New Passage is clicked', async () => {
    render(<PassageView />);
    fireEvent.click(screen.getByRole('button', { name: /generate a new passage/i }));
    await waitFor(() => {
      expect(screen.getByRole('article')).toBeInTheDocument();
    });
  });

  it('shows comprehension questions after loading a passage', async () => {
    render(<PassageView />);
    fireEvent.click(screen.getByRole('button', { name: /generate a new passage/i }));
    await waitFor(() => {
      expect(screen.getByText(/question 1 of/i)).toBeInTheDocument();
    });
  });
});
