import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import type { UserPreferences } from './types';

const DEFAULT_PREFS: UserPreferences = {
  fontSize: 18, lineSpacing: 1.5, backgroundColor: '#FFF8E7',
  fontFamily: 'OpenDyslexic', readingRulerEnabled: true, ttsSpeed: 0.85,
};

vi.mock('./services/displayPreferences', () => ({
  getPreferences: vi.fn(() => Promise.resolve({ ...DEFAULT_PREFS })),
}));

vi.mock('./components/PassageView', () => ({
  default: () => <div data-testid="passage-view">PassageView</div>,
}));
vi.mock('./components/WordBankView', () => ({
  default: () => <div data-testid="wordbank-view">WordBank</div>,
}));
vi.mock('./components/HistoryView', () => ({
  default: () => <div data-testid="history-view">History</div>,
}));
vi.mock('./components/ProgressView', () => ({
  default: () => <div data-testid="progress-view">Progress</div>,
}));
vi.mock('./components/SettingsPanel', () => ({
  default: () => <div data-testid="settings-panel">Settings</div>,
}));
vi.mock('./components/WordExerciseView', () => ({
  default: () => <div data-testid="word-exercise-view">Exercise</div>,
}));

describe('App shell', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders all four navigation tabs', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /read/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /history/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /words/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /progress/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /settings/i })).toBeInTheDocument();
    });
  });

  it('defaults to the Read tab', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /read/i })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('passage-view')).toBeInTheDocument();
    });
  });

  it('switches tabs when clicked', async () => {
    render(<App />);
    await waitFor(() => screen.getByTestId('passage-view'));
    fireEvent.click(screen.getByRole('tab', { name: /words/i }));
    expect(screen.getByTestId('wordbank-view')).toBeInTheDocument();
  });

  it('applies dyslexia-friendly styles from preferences', async () => {
    render(<App />);
    await waitFor(() => {
      const container = screen.getByTestId('app-container');
      expect(container.style.fontFamily).toBe('OpenDyslexic');
      expect(container.style.fontSize).toBe('18px');
    });
  });
});
