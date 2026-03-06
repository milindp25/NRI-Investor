import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { USHYSARate } from '@/types';

// ---------------------------------------------------------------------------
// Mocks — must be set up before importing the module under test
// ---------------------------------------------------------------------------

vi.mock('./rate-store', () => ({
  mergeRates: vi.fn().mockResolvedValue({ merged: true }),
}));

// We do NOT mock ./utils so that parseRate / isReasonableRate / todayISO run
// for real. We only stub global fetch to control the HTML returned by fetchHtml.

// ---------------------------------------------------------------------------
// HTML fixtures
// ---------------------------------------------------------------------------

function makeHYSAPage(apyText: string): string {
  return `
    <html>
      <body>
        <div class="hero">
          <h1>High-Yield Online Savings Account</h1>
          <div class="apy-rate">${apyText}</div>
          <p>Annual Percentage Yield (APY) is accurate as of today.</p>
        </div>
      </body>
    </html>
  `;
}

function makeHYSAPageBodyText(bodyContent: string): string {
  return `<html><body>${bodyContent}</body></html>`;
}

function mockFetchOk(html: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: () => Promise.resolve(html),
  });
}

function mockFetchFail() {
  return vi.fn().mockRejectedValue(new Error('Network error'));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('scrapeUSHYSA', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Parses HTML correctly -> valid output
  it('parses a page with a clear APY value in a matching selector', async () => {
    vi.stubGlobal('fetch', mockFetchOk(makeHYSAPage('4.25% APY')));

    const { scrapeUSHYSA } = await import('./us-hysa-scraper');
    const result = await scrapeUSHYSA();

    expect(result.success).toBe(true);
    expect(result.source).toBe('us-hysa');
    expect(result.data.length).toBeGreaterThan(0);

    const first = result.data[0];
    expect(first.apy).toBe(4.25);
    expect(first.fdicInsured).toBe(true);
    expect(first.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    vi.unstubAllGlobals();
  });

  // 2. Handles empty/broken HTML gracefully
  it('returns errors but does not throw on empty HTML', async () => {
    vi.stubGlobal('fetch', mockFetchOk('<html><body></body></html>'));

    const { scrapeUSHYSA } = await import('./us-hysa-scraper');
    const result = await scrapeUSHYSA();

    // All institutions should fail to find an APY
    expect(result.data).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.success).toBe(false);

    vi.unstubAllGlobals();
  });

  // 3. Rejects unreasonable rates
  it('ignores rates outside the 0-15 reasonable range', async () => {
    // A page that displays 99.99% — should be rejected
    vi.stubGlobal('fetch', mockFetchOk(makeHYSAPage('99.99% APY')));

    const { scrapeUSHYSA } = await import('./us-hysa-scraper');
    const result = await scrapeUSHYSA();

    expect(result.data).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);

    vi.unstubAllGlobals();
  });

  // 4. Returns partial results when some institutions fail
  it('succeeds partially when some fetches fail and others succeed', async () => {
    const goodHtml = makeHYSAPage('4.50% APY');

    // First 4 URLs succeed, last 2 fail (network error)
    const fetchImpl = vi.fn().mockImplementation((url: string) => {
      // Simulate failure for the last two institutions (Discover, Betterment)
      if (url.includes('discover.com') || url.includes('betterment.com')) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve(goodHtml),
      });
    });
    vi.stubGlobal('fetch', fetchImpl);

    const { scrapeUSHYSA } = await import('./us-hysa-scraper');
    const result = await scrapeUSHYSA();

    // 4 out of 6 should succeed
    expect(result.success).toBe(true);
    expect(result.data.length).toBe(4);
    expect(result.errors.length).toBe(2);
    expect(result.errors.some((e) => e.includes('Discover'))).toBe(true);
    expect(result.errors.some((e) => e.includes('Betterment'))).toBe(true);

    vi.unstubAllGlobals();
  });

  // 5. Calls mergeRates with correct args
  it('calls mergeRates with key, data, minimum, and idField', async () => {
    vi.stubGlobal('fetch', mockFetchOk(makeHYSAPage('4.25% APY')));

    // Re-import to pick up the fresh mock
    const rateStoreMod = await import('./rate-store');
    const { scrapeUSHYSA } = await import('./us-hysa-scraper');

    await scrapeUSHYSA();

    expect(rateStoreMod.mergeRates).toHaveBeenCalledWith(
      'rates:us-hysa',
      expect.arrayContaining([
        expect.objectContaining({ institutionId: expect.any(String), apy: 4.25 }),
      ]),
      4, // minimum institutions
      'institutionId',
    );

    vi.unstubAllGlobals();
  });

  // Additional: parses APY from body text regex fallback
  it('extracts APY via regex fallback when no CSS selector matches', async () => {
    const html = makeHYSAPageBodyText(`
      <div>
        <h1>Save More Today</h1>
        <p>Earn a competitive 3.90% APY on your savings.</p>
      </div>
    `);
    vi.stubGlobal('fetch', mockFetchOk(html));

    const { scrapeUSHYSA } = await import('./us-hysa-scraper');
    const result = await scrapeUSHYSA();

    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0].apy).toBe(3.9);

    vi.unstubAllGlobals();
  });

  // Additional: all institutions appear in data when all succeed
  it('returns all 6 institutions when every fetch succeeds', async () => {
    vi.stubGlobal('fetch', mockFetchOk(makeHYSAPage('4.00% APY')));

    const { scrapeUSHYSA } = await import('./us-hysa-scraper');
    const result = await scrapeUSHYSA();

    expect(result.data).toHaveLength(6);
    const ids = result.data.map((d: USHYSARate) => d.institutionId);
    expect(ids).toContain('ally-bank');
    expect(ids).toContain('marcus-goldman-sachs');
    expect(ids).toContain('wealthfront');
    expect(ids).toContain('sofi');
    expect(ids).toContain('discover-bank');
    expect(ids).toContain('betterment');

    vi.unstubAllGlobals();
  });

  // Additional: total network failure
  it('returns success false when all fetches fail', async () => {
    vi.stubGlobal('fetch', mockFetchFail());

    const { scrapeUSHYSA } = await import('./us-hysa-scraper');
    const result = await scrapeUSHYSA();

    expect(result.success).toBe(false);
    expect(result.data).toHaveLength(0);
    expect(result.errors).toHaveLength(6);

    vi.unstubAllGlobals();
  });
});
