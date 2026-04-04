import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generate, isAvailable } from './ollamaClient';

const UNAVAILABLE_MESSAGE =
  "We can't create a new passage right now. Why not revisit one you've already read?";

describe('OllamaClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generate', () => {
    it('sends POST to /api/generate and returns response text', async () => {
      const mockResponse = { response: 'Once upon a time...' };
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await generate('Write a story');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'gemma3:12b', prompt: 'Write a story', stream: false }),
        }),
      );
      expect(result).toBe('Once upon a time...');
    });

    it('uses a custom model when provided', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ response: 'ok' }),
      });

      await generate('hello', 'llama3');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          body: JSON.stringify({ model: 'llama3', prompt: 'hello', stream: false }),
        }),
      );
    });

    it('returns friendly message on non-ok response', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 500 });

      const result = await generate('test');
      expect(result).toBe(UNAVAILABLE_MESSAGE);
    });

    it('returns friendly message on network error', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new TypeError('Failed to fetch'));

      const result = await generate('test');
      expect(result).toBe(UNAVAILABLE_MESSAGE);
    });

    it('returns friendly message on abort (timeout)', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new DOMException('Aborted', 'AbortError'));

      const result = await generate('test');
      expect(result).toBe(UNAVAILABLE_MESSAGE);
    });
  });

  describe('isAvailable', () => {
    it('returns true when Ollama responds ok', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

      expect(await isAvailable()).toBe(true);
    });

    it('returns false when Ollama responds with error', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });

      expect(await isAvailable()).toBe(false);
    });

    it('returns false on network error', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new TypeError('Failed to fetch'));

      expect(await isAvailable()).toBe(false);
    });
  });
});
