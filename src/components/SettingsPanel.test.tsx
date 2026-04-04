// Unit tests for SettingsPanel component
// Requirements: 6.4, 6.5, 7.4, 7.5, 8.4, 11.4

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsPanel from './SettingsPanel';
import type { UserPreferences } from '../types';

const DEFAULT_PREFS: UserPreferences = {
  fontSize: 18,
  lineSpacing: 1.5,
  backgroundColor: '#FFF8E7',
  fontFamily: 'OpenDyslexic',
  readingRulerEnabled: true,
  ttsSpeed: 0.85,
};

let mockPrefs: UserPreferences;

vi.mock('../services/displayPreferences', () => ({
  getPreferences: vi.fn(() => Promise.resolve({ ...mockPrefs })),
  updatePreferences: vi.fn(async (partial: Partial<UserPreferences>) => {
    mockPrefs = { ...mockPrefs, ...partial };
  }),
}));

vi.mock('../services/difficultyManager', () => ({
  getCurrentLevel: vi.fn(() => 1),
  setLevel: vi.fn(),
}));

import { getPreferences, updatePreferences } from '../services/displayPreferences';
import { getCurrentLevel, setLevel } from '../services/difficultyManager';

const mockedGetPreferences = vi.mocked(getPreferences);
const mockedUpdatePreferences = vi.mocked(updatePreferences);
const mockedGetCurrentLevel = vi.mocked(getCurrentLevel);
const mockedSetLevel = vi.mocked(setLevel);

describe('SettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrefs = { ...DEFAULT_PREFS };
    mockedGetPreferences.mockImplementation(() => Promise.resolve({ ...mockPrefs }));
    mockedUpdatePreferences.mockImplementation(async (partial) => {
      mockPrefs = { ...mockPrefs, ...partial };
    });
    mockedGetCurrentLevel.mockReturnValue(1);
  });

  it('shows loading state then renders settings', async () => {
    render(<SettingsPanel />);
    await waitFor(() => {
      expect(screen.getByTestId('settings-panel')).toBeInTheDocument();
    });
  });

  it('loads preferences on mount', async () => {
    render(<SettingsPanel />);
    await waitFor(() => {
      expect(mockedGetPreferences).toHaveBeenCalled();
    });
  });

  it('loads current difficulty level on mount', async () => {
    mockedGetCurrentLevel.mockReturnValue(2);
    render(<SettingsPanel />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /difficulty level 2/i })).toHaveAttribute('aria-pressed', 'true');
    });
  });

  // Font size (Req 6.4)
  it('renders font size slider with correct range', async () => {
    render(<SettingsPanel />);
    await waitFor(() => {
      const slider = screen.getByRole('slider', { name: /font size/i });
      expect(slider).toHaveAttribute('min', '12');
      expect(slider).toHaveAttribute('max', '36');
      expect(slider).toHaveAttribute('step', '1');
    });
  });

  it('displays current font size value', async () => {
    render(<SettingsPanel />);
    await waitFor(() => {
      expect(screen.getByText(/18px/)).toBeInTheDocument();
    });
  });

  it('calls updatePreferences when font size changes (Req 6.5)', async () => {
    render(<SettingsPanel />);
    await waitFor(() => screen.getByTestId('settings-panel'));

    const slider = screen.getByRole('slider', { name: /font size/i });
    fireEvent.change(slider, { target: { value: '24' } });

    await waitFor(() => {
      expect(mockedUpdatePreferences).toHaveBeenCalledWith({ fontSize: 24 });
    });
  });

  // Line spacing (Req 6.4)
  it('renders line spacing slider with correct range', async () => {
    render(<SettingsPanel />);
    await waitFor(() => {
      const slider = screen.getByRole('slider', { name: /line spacing/i });
      expect(slider).toHaveAttribute('min', '1');
      expect(slider).toHaveAttribute('max', '3');
      expect(slider).toHaveAttribute('step', '0.1');
    });
  });

  it('calls updatePreferences when line spacing changes (Req 6.5)', async () => {
    render(<SettingsPanel />);
    await waitFor(() => screen.getByTestId('settings-panel'));

    const slider = screen.getByRole('slider', { name: /line spacing/i });
    fireEvent.change(slider, { target: { value: '2.0' } });

    await waitFor(() => {
      expect(mockedUpdatePreferences).toHaveBeenCalledWith({ lineSpacing: 2.0 });
    });
  });

  // Background colour (Req 6.4)
  it('renders background colour buttons', async () => {
    render(<SettingsPanel />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cream background/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /light blue background/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /light green background/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /white background/i })).toBeInTheDocument();
    });
  });

  it('marks current background colour as pressed', async () => {
    render(<SettingsPanel />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cream background/i })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: /light blue background/i })).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('calls updatePreferences when background colour changes (Req 6.5)', async () => {
    render(<SettingsPanel />);
    await waitFor(() => screen.getByTestId('settings-panel'));

    fireEvent.click(screen.getByRole('button', { name: /light blue background/i }));

    await waitFor(() => {
      expect(mockedUpdatePreferences).toHaveBeenCalledWith({ backgroundColor: '#E0F0FF' });
    });
  });

  // Reading ruler toggle (Req 7.4, 7.5)
  it('renders reading ruler checkbox', async () => {
    render(<SettingsPanel />);
    await waitFor(() => {
      const checkbox = screen.getByRole('checkbox', { name: /reading ruler/i });
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toBeChecked();
    });
  });

  it('calls updatePreferences when reading ruler is toggled (Req 7.5)', async () => {
    render(<SettingsPanel />);
    await waitFor(() => screen.getByTestId('settings-panel'));

    const checkbox = screen.getByRole('checkbox', { name: /reading ruler/i });
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(mockedUpdatePreferences).toHaveBeenCalledWith({ readingRulerEnabled: false });
    });
  });

  // TTS speed (Req 8.4)
  it('renders TTS speed slider with correct range', async () => {
    render(<SettingsPanel />);
    await waitFor(() => {
      const slider = screen.getByRole('slider', { name: /tts speed/i });
      expect(slider).toHaveAttribute('min', '0.5');
      expect(slider).toHaveAttribute('max', '2');
      expect(slider).toHaveAttribute('step', '0.05');
    });
  });

  it('displays current TTS speed value', async () => {
    render(<SettingsPanel />);
    await waitFor(() => {
      expect(screen.getByText(/0\.85×/)).toBeInTheDocument();
    });
  });

  it('calls updatePreferences when TTS speed changes (Req 8.4)', async () => {
    render(<SettingsPanel />);
    await waitFor(() => screen.getByTestId('settings-panel'));

    const slider = screen.getByRole('slider', { name: /tts speed/i });
    fireEvent.change(slider, { target: { value: '1.5' } });

    await waitFor(() => {
      expect(mockedUpdatePreferences).toHaveBeenCalledWith({ ttsSpeed: 1.5 });
    });
  });

  // Difficulty level (Req 11.4)
  it('renders difficulty level buttons', async () => {
    render(<SettingsPanel />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /difficulty level 1/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /difficulty level 2/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /difficulty level 3/i })).toBeInTheDocument();
    });
  });

  it('marks current difficulty level as pressed', async () => {
    render(<SettingsPanel />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /difficulty level 1/i })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: /difficulty level 2/i })).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('calls setLevel when difficulty changes (Req 11.4)', async () => {
    render(<SettingsPanel />);
    await waitFor(() => screen.getByTestId('settings-panel'));

    fireEvent.click(screen.getByRole('button', { name: /difficulty level 3/i }));

    expect(mockedSetLevel).toHaveBeenCalledWith(3);
  });

  // onPreferencesChange callback
  it('calls onPreferencesChange after preference update', async () => {
    const onChange = vi.fn();
    render(<SettingsPanel onPreferencesChange={onChange} />);
    await waitFor(() => screen.getByTestId('settings-panel'));

    const slider = screen.getByRole('slider', { name: /font size/i });
    fireEvent.change(slider, { target: { value: '20' } });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });
  });

  it('calls onPreferencesChange after difficulty change', async () => {
    const onChange = vi.fn();
    render(<SettingsPanel onPreferencesChange={onChange} />);
    await waitFor(() => screen.getByTestId('settings-panel'));

    fireEvent.click(screen.getByRole('button', { name: /difficulty level 2/i }));

    expect(onChange).toHaveBeenCalled();
  });

  // Accessibility
  it('has accessible role and label', async () => {
    render(<SettingsPanel />);
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /settings/i })).toBeInTheDocument();
    });
  });
});
