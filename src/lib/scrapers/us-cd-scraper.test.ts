import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { USCDRate } from '@/types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('./rate-store', () => ({
  mergeRates: vi.fn().mockResolvedValue({ merged: true }),
}));

// ---------------------------------------------------------------------------
// HTML fixtures
// ---------------------------------------------------------------------------

function makeCDTablePage(rows: Array<{ term: string; apy: string }>): string {
  const rowsHtml = rows.map((r) => `<tr><td>${r.term}</td><td>${r.apy}</td></tr>`).join('\n');

  return `
    <html>
      <body>
        <h1>Certificate of Deposit Rates</h1>
        <table>
          <tr><th>Term</th><th>APY</th></tr>
          ${rowsHtml}
        </table>
      </body>
    </html>
  `;
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
// parseTerm unit tests
// ---------------------------------------------------------------------------

describe('parseTerm', () => {
  // Import the named export for direct testing
  let parseTerm: (raw: string) => number | null;

  beforeEach(async () => {
    const mod = await import('./us-cd-scraper');
    parseTerm = mod.parseTerm;
  });

  it('maps "12 Months" to 12', () => {
    expect(parseTerm('12 Months')).toBe(12);
  });

  it('maps "1 Year" to 12', () => {
    expect(parseTerm('1 Year')).toBe(12);
  });

  it('maps "5-Year" to 60', () => {
    expect(parseTerm('5-Year')).toBe(60);
  });

  it('maps "6 Month" to 6', () => {
    expect(parseTerm('6 Month')).toBe(6);
  });

  it('maps "24 months" (lowercase) to 24', () => {
    expect(parseTerm('24 months')).toBe(24);
  });

  it('maps "3 Year CD" (extra text) to 36', () => {
    expect(parseTerm('3 Year CD')).toBe(36);
  });

  it('returns null for unrecognised text', () => {
    expect(parseTerm('hello world')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// scrapeUSCD integration tests
// ---------------------------------------------------------------------------

describe('scrapeUSCD', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Parses HTML correctly -> valid output
  it('parses a rate table with standard CD terms', async () => {
    const html = makeCDTablePage([
      { term: '6 Months', apy: '4.00%' },
      { term: '12 Months', apy: '4.50%' },
      { term: '24 Months', apy: '4.25%' },
      { term: '36 Months', apy: '4.10%' },
      { term: '60 Months', apy: '3.80%' },
    ]);
    vi.stubGlobal('fetch', mockFetchOk(html));

    const { scrapeUSCD } = await import('./us-cd-scraper');
    const result = await scrapeUSCD();

    expect(result.success).toBe(true);
    expect(result.source).toBe('us-cd');
    expect(result.data.length).toBeGreaterThan(0);

    const first = result.data[0];
    expect(first.tenures).toHaveLength(5);
    expect(first.tenures[0]).toEqual({ months: 6, apy: 4.0 });
    expect(first.tenures[1]).toEqual({ months: 12, apy: 4.5 });
    expect(first.tenures[2]).toEqual({ months: 24, apy: 4.25 });
    expect(first.tenures[3]).toEqual({ months: 36, apy: 4.1 });
    expect(first.tenures[4]).toEqual({ months: 60, apy: 3.8 });
    expect(first.fdicInsured).toBe(true);
    expect(first.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    vi.unstubAllGlobals();
  });

  // 2. Handles empty/broken HTML gracefully
  it('returns errors but does not throw on empty HTML', async () => {
    vi.stubGlobal('fetch', mockFetchOk('<html><body></body></html>'));

    const { scrapeUSCD } = await import('./us-cd-scraper');
    const result = await scrapeUSCD();

    expect(result.data).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.success).toBe(false);

    vi.unstubAllGlobals();
  });

  // 3. Rejects unreasonable rates
  it('ignores rates outside the 0-15 reasonable range', async () => {
    const html = makeCDTablePage([
      { term: '12 Months', apy: '55.00%' },
      { term: '24 Months', apy: '99.99%' },
    ]);
    vi.stubGlobal('fetch', mockFetchOk(html));

    const { scrapeUSCD } = await import('./us-cd-scraper');
    const result = await scrapeUSCD();

    // No valid tenures => all institutions fail
    expect(result.data).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);

    vi.unstubAllGlobals();
  });

  // 4. Returns partial results when some institutions fail
  it('succeeds partially when some fetches fail and others succeed', async () => {
    const goodHtml = makeCDTablePage([
      { term: '12 Months', apy: '4.50%' },
      { term: '24 Months', apy: '4.25%' },
    ]);

    const fetchImpl = vi.fn().mockImplementation((url: string) => {
      // Fail for Synchrony, Bread Financial, Barclays (3 out of 7)
      if (
        url.includes('synchronybank.com') ||
        url.includes('breadfinancial.com') ||
        url.includes('barclaysus.com')
      ) {
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

    const { scrapeUSCD } = await import('./us-cd-scraper');
    const result = await scrapeUSCD();

    // 4 out of 7 should succeed
    expect(result.success).toBe(true);
    expect(result.data.length).toBe(4);
    expect(result.errors.length).toBe(3);
    expect(result.errors.some((e) => e.includes('Synchrony'))).toBe(true);
    expect(result.errors.some((e) => e.includes('Bread Financial'))).toBe(true);
    expect(result.errors.some((e) => e.includes('Barclays'))).toBe(true);

    vi.unstubAllGlobals();
  });

  // 5. Calls mergeRates with correct args
  it('calls mergeRates with key, data, minimum, and idField', async () => {
    const html = makeCDTablePage([
      { term: '12 Months', apy: '4.50%' },
      { term: '24 Months', apy: '4.25%' },
    ]);
    vi.stubGlobal('fetch', mockFetchOk(html));

    const rateStoreMod = await import('./rate-store');
    const { scrapeUSCD } = await import('./us-cd-scraper');

    await scrapeUSCD();

    expect(rateStoreMod.mergeRates).toHaveBeenCalledWith(
      'rates:us-cd',
      expect.arrayContaining([
        expect.objectContaining({
          institutionId: expect.any(String),
          tenures: expect.arrayContaining([expect.objectContaining({ months: 12, apy: 4.5 })]),
        }),
      ]),
      5, // minimum institutions
      'institutionId',
    );

    vi.unstubAllGlobals();
  });

  // Additional: tenures are sorted by months ascending
  it('sorts tenures by months ascending', async () => {
    // Deliberately put terms out of order
    const html = makeCDTablePage([
      { term: '60 Months', apy: '3.80%' },
      { term: '6 Months', apy: '4.00%' },
      { term: '24 Months', apy: '4.25%' },
      { term: '12 Months', apy: '4.50%' },
    ]);
    vi.stubGlobal('fetch', mockFetchOk(html));

    const { scrapeUSCD } = await import('./us-cd-scraper');
    const result = await scrapeUSCD();

    expect(result.data[0].tenures[0].months).toBe(6);
    expect(result.data[0].tenures[1].months).toBe(12);
    expect(result.data[0].tenures[2].months).toBe(24);
    expect(result.data[0].tenures[3].months).toBe(60);

    vi.unstubAllGlobals();
  });

  // Additional: all 7 institutions appear when all succeed
  it('returns all 7 institutions when every fetch succeeds', async () => {
    const html = makeCDTablePage([{ term: '12 Months', apy: '4.50%' }]);
    vi.stubGlobal('fetch', mockFetchOk(html));

    const { scrapeUSCD } = await import('./us-cd-scraper');
    const result = await scrapeUSCD();

    expect(result.data).toHaveLength(7);
    const ids = result.data.map((d: USCDRate) => d.institutionId);
    expect(ids).toContain('ally-bank');
    expect(ids).toContain('marcus-goldman-sachs');
    expect(ids).toContain('capital-one');
    expect(ids).toContain('discover-bank');
    expect(ids).toContain('synchrony-bank');
    expect(ids).toContain('bread-financial');
    expect(ids).toContain('barclays');

    vi.unstubAllGlobals();
  });

  // Additional: total network failure
  it('returns success false when all fetches fail', async () => {
    vi.stubGlobal('fetch', mockFetchFail());

    const { scrapeUSCD } = await import('./us-cd-scraper');
    const result = await scrapeUSCD();

    expect(result.success).toBe(false);
    expect(result.data).toHaveLength(0);
    expect(result.errors).toHaveLength(7);

    vi.unstubAllGlobals();
  });

  // Additional: "Year" style terms are parsed correctly
  it('parses "1 Year" and "5 Year" style terms in tables', async () => {
    const html = makeCDTablePage([
      { term: '1 Year', apy: '4.50%' },
      { term: '2 Year', apy: '4.25%' },
      { term: '5 Year', apy: '3.80%' },
    ]);
    vi.stubGlobal('fetch', mockFetchOk(html));

    const { scrapeUSCD } = await import('./us-cd-scraper');
    const result = await scrapeUSCD();

    const tenures = result.data[0].tenures;
    expect(tenures).toEqual(
      expect.arrayContaining([
        { months: 12, apy: 4.5 },
        { months: 24, apy: 4.25 },
        { months: 60, apy: 3.8 },
      ]),
    );

    vi.unstubAllGlobals();
  });
});
