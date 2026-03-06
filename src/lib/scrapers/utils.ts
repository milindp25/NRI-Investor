import * as cheerio from 'cheerio';

/**
 * Fetch with retry on 5xx or network errors.
 */
export async function fetchWithRetry(
  url: string,
  opts?: RequestInit,
  retries = 2,
  delayMs = 1000,
): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...opts,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/json',
          ...opts?.headers,
        },
      });

      if (res.ok || res.status < 500) return res;

      lastError = new Error(`HTTP ${res.status}: ${res.statusText}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }

    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    }
  }

  throw lastError ?? new Error(`Failed to fetch ${url}`);
}

/**
 * Fetch a URL and return a cheerio-loaded document.
 */
export async function fetchHtml(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetchWithRetry(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const html = await res.text();
  return cheerio.load(html);
}

/**
 * Parse a rate string like "6.80%", "4.22", " 3,50 %" into a number.
 */
export function parseRate(text: string): number {
  const cleaned = text.replace(/[%,\s]/g, '');
  return parseFloat(cleaned);
}

/**
 * Check if a rate is within reasonable bounds.
 */
export function isReasonableRate(rate: number, min = 0, max = 20): boolean {
  return !isNaN(rate) && isFinite(rate) && rate >= min && rate <= max;
}

/**
 * Today's date as YYYY-MM-DD.
 */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}
