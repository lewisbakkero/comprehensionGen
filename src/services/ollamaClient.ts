// Ollama HTTP client for local LLM communication
// Requirements: 1.1, 1.7

const BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'gemma3:12b';
const TIMEOUT_MS = 300_000;

const UNAVAILABLE_MESSAGE =
  "We can't create a new passage right now. Why not revisit one you've already read?";

interface OllamaGenerateResponse {
  response: string;
}

export async function generate(prompt: string, model: string = DEFAULT_MODEL): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return UNAVAILABLE_MESSAGE;
    }

    const data: OllamaGenerateResponse = await res.json();
    return data.response;
  } catch {
    return UNAVAILABLE_MESSAGE;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function isAvailable(): Promise<boolean> {
  try {
    const res = await fetch(BASE_URL, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}
