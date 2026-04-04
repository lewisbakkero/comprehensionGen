// TTSControls — play/pause/resume/stop buttons and speed slider for TTS
// Requirements: 8.1, 8.2, 8.3, 8.4, 8.5

import { useState, useEffect, useCallback } from 'react';
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

export interface TTSControlsProps {
  text: string;
  onWordHighlight?: (charIndex: number) => void;
}

export default function TTSControls({ text, onWordHighlight }: TTSControlsProps) {
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRateState] = useState(getRate);

  // Register word boundary callback for highlighting (Req 8.2)
  useEffect(() => {
    if (onWordHighlight) {
      onWordBoundary(onWordHighlight);
    }
  }, [onWordHighlight]);

  // Stop playback when component unmounts or text changes
  useEffect(() => {
    return () => {
      stop();
    };
  }, [text]);

  const handlePlay = useCallback(() => {
    speak(text);
    setPlaying(true);
    setPaused(false);
  }, [text]);

  const handlePause = useCallback(() => {
    pause();
    setPaused(true);
  }, []);

  const handleResume = useCallback(() => {
    resume();
    setPaused(false);
  }, []);

  const handleStop = useCallback(() => {
    stop();
    setPlaying(false);
    setPaused(false);
  }, []);

  const handleRateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newRate = parseFloat(e.target.value);
    setRate(newRate);
    setRateState(newRate);
  }, []);

  // Hide entirely if Web Speech API unavailable (Req 8.5)
  if (!isAvailable()) {
    return null;
  }

  return (
    <div data-testid="tts-controls" role="region" aria-label="Text-to-speech controls">
      <div>
        {!playing ? (
          <button onClick={handlePlay} aria-label="Play">
            Play
          </button>
        ) : paused ? (
          <button onClick={handleResume} aria-label="Resume">
            Resume
          </button>
        ) : (
          <button onClick={handlePause} aria-label="Pause">
            Pause
          </button>
        )}
        {playing && (
          <button onClick={handleStop} aria-label="Stop">
            Stop
          </button>
        )}
      </div>

      <div>
        <label htmlFor="tts-speed-slider">
          Speed: {rate.toFixed(2)}×
        </label>
        <input
          id="tts-speed-slider"
          type="range"
          min={0.5}
          max={2.0}
          step={0.05}
          value={rate}
          onChange={handleRateChange}
          aria-label="Reading speed"
        />
      </div>
    </div>
  );
}
