// TTSController — wraps the Web Speech API for text-to-speech
// Requirements: 8.1, 8.2, 8.3, 8.4, 8.5

let currentRate = 0.85;
let wordBoundaryCallback: ((charIndex: number) => void) | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Clamp a rate value to the valid range [0.5, 2.0].
 * Exported for testing.
 */
export function clampRate(rate: number): number {
  if (!Number.isFinite(rate)) return 0.85;
  return Math.min(2.0, Math.max(0.5, rate));
}

/** Returns true if the Web Speech API is available in this browser. */
export function isAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance !== 'undefined'
  );
}

/** Speak the given text, optionally starting from a character offset. */
export function speak(text: string, startOffset?: number): void {
  if (!isAvailable()) return;

  stop();

  const speakText =
    startOffset !== undefined && startOffset > 0
      ? text.slice(startOffset)
      : text;

  const utterance = new SpeechSynthesisUtterance(speakText);
  utterance.rate = currentRate;

  utterance.onboundary = (event: SpeechSynthesisEvent) => {
    if (event.name === 'word' && wordBoundaryCallback) {
      const adjustedIndex =
        startOffset !== undefined && startOffset > 0
          ? event.charIndex + startOffset
          : event.charIndex;
      wordBoundaryCallback(adjustedIndex);
    }
  };

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

/** Pause speech playback. */
export function pause(): void {
  if (!isAvailable()) return;
  window.speechSynthesis.pause();
}

/** Resume speech playback. */
export function resume(): void {
  if (!isAvailable()) return;
  window.speechSynthesis.resume();
}

/** Stop speech playback and clear the queue. */
export function stop(): void {
  if (!isAvailable()) return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
}

/** Set the speech rate, clamped to [0.5, 2.0]. */
export function setRate(rate: number): void {
  currentRate = clampRate(rate);
}

/** Get the current speech rate. */
export function getRate(): number {
  return currentRate;
}

/** Register a callback for word boundary events during speech. */
export function onWordBoundary(callback: (charIndex: number) => void): void {
  wordBoundaryCallback = callback;
}
