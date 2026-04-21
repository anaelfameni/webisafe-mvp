import type { PageSnapshot } from '../types.ts';

export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 10_000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
      redirect: init.redirect || 'follow',
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchJsonWithTimeout<T>(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 10_000) {
  const response = await fetchWithTimeout(input, init, timeoutMs);
  return {
    response,
    data: (await response.json()) as T,
  };
}

export async function fetchTextWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 10_000) {
  const response = await fetchWithTimeout(input, init, timeoutMs);
  return {
    response,
    text: await response.text(),
  };
}

export function headersToObject(headers: Headers): Record<string, string> {
  return Object.fromEntries(Array.from(headers.entries()).map(([key, value]) => [key.toLowerCase(), value]));
}

export async function capturePageSnapshot(url: string, timeoutMs = 8_000): Promise<PageSnapshot | null> {
  try {
    const startedAt = performance.now();
    const { response, text } = await fetchTextWithTimeout(
      url,
      {
        headers: {
          'user-agent': 'WebisafeBot/1.0 (+https://webisafe.ci)',
          accept: 'text/html,application/xhtml+xml',
        },
      },
      timeoutMs
    );
    const ttfbMs = performance.now() - startedAt;
    const htmlBytes = new TextEncoder().encode(text).length;
    const externalResourceCount = (text.match(/<(img|script|link|iframe|source)\b/gi) || []).length;

    return {
      finalUrl: response.url || url,
      status: response.status,
      ok: response.ok,
      headers: headersToObject(response.headers),
      html: text,
      htmlBytes,
      ttfbMs: Math.round(ttfbMs),
      externalResourceCount,
    };
  } catch {
    return null;
  }
}

export async function settle<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}
