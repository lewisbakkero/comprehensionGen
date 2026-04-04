// Unit tests for TTSControls component
// Requirements: 8.1, 8.2, 8.3, 8.4, 8.5

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TTSControls from './TTSControls';

// Mock the ttsController module
vi.mock('../services/ttsController', () => ({
  isAvailable: vi.fn(() => true),
  speak: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  stop: vi.fn(),
  setRate: vi.fn(),
  getRate: vi.fn(() => 0.85),
  onWordBoundary: vi.fn(),
}));

import {
  isAvailable,
  speak,
  pause,
  resume,
  stop,
  setRate,
  getRate,
  onWordBoundary,
} from '../services/ttsController';

const mockedIsAvailable = vi.mocked(isAvailable);
const mockedSpeak = vi.mocked(speak);
const mockedPause = vi.mocked(pause);
const mockedResume = vi.mocked(resume);
const mockedStop = vi.mocked(stop);
const mockedSetRate = vi.mocked(setRate);
const mockedGetRate = vi.mocked(getRate);
const mockedOnWordBoundary = vi.mocked(onWordBoundary);

describe('TTSControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedIsAvailable.mockReturnValue(true);
    mockedGetRate.mockReturnValue(0.85);
  });

  it('renders nothing when Web Speech API is unavailable (Req 8.5)', () => {
    mockedIsAvailable.mockReturnValue(false);
    const { container } = render(<TTSControls text="Hello world" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders controls when Web Speech API is available (Req 8.1)', () => {
    render(<TTSControls text="Hello world" />);
    expect(screen.getByTestId('tts-controls')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
  });

  it('calls speak() and shows Pause/Stop on Play click (Req 8.1)', () => {
    render(<TTSControls text="Some passage text" />);
    fireEvent.click(screen.getByRole('button', { name: /play/i }));

    expect(mockedSpeak).toHaveBeenCalledWith('Some passage text');
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
  });

  it('calls pause() and shows Resume on Pause click (Req 8.3)', () => {
    render(<TTSControls text="Text" />);
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    fireEvent.click(screen.getByRole('button', { name: /pause/i }));

    expect(mockedPause).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
  });

  it('calls resume() on Resume click (Req 8.3)', () => {
    render(<TTSControls text="Text" />);
    // Play → Pause → Resume
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    fireEvent.click(screen.getByRole('button', { name: /pause/i }));
    fireEvent.click(screen.getByRole('button', { name: /resume/i }));

    expect(mockedResume).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });

  it('calls stop() and resets to Play on Stop click (Req 8.3)', () => {
    render(<TTSControls text="Text" />);
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    fireEvent.click(screen.getByRole('button', { name: /stop/i }));

    expect(mockedStop).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /stop/i })).not.toBeInTheDocument();
  });

  it('renders speed slider with correct range (Req 8.4)', () => {
    render(<TTSControls text="Text" />);
    const slider = screen.getByRole('slider', { name: /reading speed/i });
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('min', '0.5');
    expect(slider).toHaveAttribute('max', '2');
    expect(slider).toHaveAttribute('step', '0.05');
  });

  it('calls setRate() when speed slider changes (Req 8.4)', () => {
    render(<TTSControls text="Text" />);
    const slider = screen.getByRole('slider', { name: /reading speed/i });
    fireEvent.change(slider, { target: { value: '1.5' } });

    expect(mockedSetRate).toHaveBeenCalledWith(1.5);
  });

  it('registers onWordBoundary callback for highlighting (Req 8.2)', () => {
    const highlightFn = vi.fn();
    render(<TTSControls text="Text" onWordHighlight={highlightFn} />);

    expect(mockedOnWordBoundary).toHaveBeenCalledWith(highlightFn);
  });

  it('does not register onWordBoundary when no callback provided', () => {
    render(<TTSControls text="Text" />);
    expect(mockedOnWordBoundary).not.toHaveBeenCalled();
  });

  it('calls stop() on unmount', () => {
    const { unmount } = render(<TTSControls text="Text" />);
    unmount();
    expect(mockedStop).toHaveBeenCalled();
  });

  it('has accessible role and label', () => {
    render(<TTSControls text="Text" />);
    expect(
      screen.getByRole('region', { name: /text-to-speech controls/i }),
    ).toBeInTheDocument();
  });

  it('displays current rate value', () => {
    mockedGetRate.mockReturnValue(1.2);
    render(<TTSControls text="Text" />);
    expect(screen.getByText(/1\.20×/)).toBeInTheDocument();
  });
});
