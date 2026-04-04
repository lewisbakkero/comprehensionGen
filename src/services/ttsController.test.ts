import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  clampRate,
  isAvailable,
  speak,
  pause,
  resume,
  stop,
  setRate,
  getRate,
  onWordBoundary,
} from './ttsController';

// --- Mock helpers ---

function createMockSpeechSynthesis() {
  return {
    speak: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    cancel: vi.fn(),
  };
}

let capturedUtterance: SpeechSynthesisUtterance | null = null;

function installSpeechMocks() {
  const synth = createMockSpeechSynthesis();
  synth.speak.mockImplementation((utt: SpeechSynthesisUtterance) => {
    capturedUtterance = utt;
  });

  Object.defineProperty(window, 'speechSynthesis', {
    value: synth,
    writable: true,
    configurable: true,
  });

  // Minimal SpeechSynthesisUtterance mock
  class MockUtterance {
    text: string;
    rate = 1;
    onboundary: ((ev: unknown) => void) | null = null;
    constructor(text: string) {
      this.text = text;
    }
  }

  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    value: MockUtterance,
    writable: true,
    configurable: true,
  });

  return synth;
}

function removeSpeechMocks() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).speechSynthesis;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).SpeechSynthesisUtterance;
  capturedUtterance = null;
}

// --- Tests ---

describe('ttsController', () => {
  beforeEach(() => {
    // Reset rate to default before each test
    setRate(0.85);
    removeSpeechMocks();
  });

  describe('clampRate', () => {
    it('returns the value when within range', () => {
      expect(clampRate(1.0)).toBe(1.0);
      expect(clampRate(0.85)).toBe(0.85);
      expect(clampRate(1.5)).toBe(1.5);
    });

    it('clamps to 0.5 when below minimum', () => {
      expect(clampRate(0.1)).toBe(0.5);
      expect(clampRate(0)).toBe(0.5);
      expect(clampRate(-5)).toBe(0.5);
    });

    it('clamps to 2.0 when above maximum', () => {
      expect(clampRate(2.5)).toBe(2.0);
      expect(clampRate(100)).toBe(2.0);
    });

    it('returns exact boundary values', () => {
      expect(clampRate(0.5)).toBe(0.5);
      expect(clampRate(2.0)).toBe(2.0);
    });

    it('returns default for non-finite values', () => {
      expect(clampRate(NaN)).toBe(0.85);
      expect(clampRate(Infinity)).toBe(0.85);
      expect(clampRate(-Infinity)).toBe(0.85);
    });
  });

  describe('isAvailable', () => {
    it('returns false when speechSynthesis is not present', () => {
      removeSpeechMocks();
      expect(isAvailable()).toBe(false);
    });

    it('returns true when speechSynthesis and SpeechSynthesisUtterance exist', () => {
      installSpeechMocks();
      expect(isAvailable()).toBe(true);
    });
  });

  describe('setRate / getRate', () => {
    it('stores and retrieves the rate', () => {
      setRate(1.2);
      expect(getRate()).toBe(1.2);
    });

    it('clamps rate below minimum', () => {
      setRate(0.1);
      expect(getRate()).toBe(0.5);
    });

    it('clamps rate above maximum', () => {
      setRate(3.0);
      expect(getRate()).toBe(2.0);
    });
  });

  describe('speak', () => {
    it('does nothing when speech API is unavailable', () => {
      removeSpeechMocks();
      // Should not throw
      expect(() => speak('hello')).not.toThrow();
    });

    it('calls speechSynthesis.speak with an utterance', () => {
      const synth = installSpeechMocks();
      speak('Hello world');
      expect(synth.speak).toHaveBeenCalledTimes(1);
    });

    it('sets the rate on the utterance', () => {
      installSpeechMocks();
      setRate(1.5);
      speak('Hello world');
      expect(capturedUtterance).not.toBeNull();
      expect((capturedUtterance as unknown as { rate: number }).rate).toBe(1.5);
    });

    it('slices text when startOffset is provided', () => {
      installSpeechMocks();
      speak('Hello world', 6);
      expect(capturedUtterance).not.toBeNull();
      expect((capturedUtterance as unknown as { text: string }).text).toBe('world');
    });

    it('cancels previous speech before starting new one', () => {
      const synth = installSpeechMocks();
      speak('First');
      speak('Second');
      // cancel called once for the initial stop() in second speak, plus once for the first speak's stop
      expect(synth.cancel).toHaveBeenCalled();
    });
  });

  describe('pause / resume / stop', () => {
    it('delegates pause to speechSynthesis', () => {
      const synth = installSpeechMocks();
      pause();
      expect(synth.pause).toHaveBeenCalledTimes(1);
    });

    it('delegates resume to speechSynthesis', () => {
      const synth = installSpeechMocks();
      resume();
      expect(synth.resume).toHaveBeenCalledTimes(1);
    });

    it('delegates stop to speechSynthesis.cancel', () => {
      const synth = installSpeechMocks();
      stop();
      expect(synth.cancel).toHaveBeenCalledTimes(1);
    });

    it('does nothing when API is unavailable', () => {
      removeSpeechMocks();
      expect(() => pause()).not.toThrow();
      expect(() => resume()).not.toThrow();
      expect(() => stop()).not.toThrow();
    });
  });

  describe('onWordBoundary', () => {
    it('fires callback with charIndex on word boundary event', () => {
      installSpeechMocks();
      const cb = vi.fn();
      onWordBoundary(cb);

      speak('Hello world');

      // Simulate a word boundary event
      if (capturedUtterance && (capturedUtterance as unknown as { onboundary: (ev: unknown) => void }).onboundary) {
        (capturedUtterance as unknown as { onboundary: (ev: unknown) => void }).onboundary({
          name: 'word',
          charIndex: 6,
        });
      }

      expect(cb).toHaveBeenCalledWith(6);
    });

    it('adjusts charIndex by startOffset', () => {
      installSpeechMocks();
      const cb = vi.fn();
      onWordBoundary(cb);

      speak('Hello world foo', 6);

      if (capturedUtterance && (capturedUtterance as unknown as { onboundary: (ev: unknown) => void }).onboundary) {
        (capturedUtterance as unknown as { onboundary: (ev: unknown) => void }).onboundary({
          name: 'word',
          charIndex: 0,
        });
      }

      // charIndex 0 in sliced text + offset 6 = 6
      expect(cb).toHaveBeenCalledWith(6);
    });

    it('ignores non-word boundary events', () => {
      installSpeechMocks();
      const cb = vi.fn();
      onWordBoundary(cb);

      speak('Hello world');

      if (capturedUtterance && (capturedUtterance as unknown as { onboundary: (ev: unknown) => void }).onboundary) {
        (capturedUtterance as unknown as { onboundary: (ev: unknown) => void }).onboundary({
          name: 'sentence',
          charIndex: 0,
        });
      }

      expect(cb).not.toHaveBeenCalled();
    });
  });
});
