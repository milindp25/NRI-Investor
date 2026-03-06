import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import * as cheerio from 'cheerio';
import type { USCDRate } from '@/types';
import type { Browser } from 'puppeteer-core';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('./rate-store', () => ({
  mergeRates: vi.fn().mockResolvedValue({ merged: true }),
}));

vi.mock('./browser', () => ({
  fetchHtmlWithBrowser: vi.fn(),
}));

import { fetchHtmlWithBrowser } from './browser';
const mockedFetchBrowser = fetchHtmlWithBrowser as Mock;

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

function mockBrowserOk(html: string) {
  mockedFetchBrowser.mockResolvedValue(cheerio.load(html));
}

function mockBrowserFail() {
  mockedFetchBrowser.mockRejectedValue(new Error('Network error'));
}

const mockBrowser = {} as Browser;

// ---------------------------------------------------------------------------
// parseTerm unit tests
// ---------------------------------------------------------------------------

describe('parseTerm', () => {
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
    vi.clearAllMocks();
  });

  it('parses a rate table with standard CD terms', async () => {
    const html = makeCDTablePage([
      { term: '6 Months', apy: '4.00%' },
      { term: '12 Months', apy: '4.50%' },
      { term: '24 Months', apy: '4.25%' },
      { term: '36 Months', apy: '4.10%' },
      { term: '60 Months', apy: '3.80%' },
    ]);
    mockBrowserOk(html);

    const { scrapeUSCD } = await import('./us-cd-scraper');
    const result = await scrapeUSCD(mockBrowser);

    expect(result.success).toBe(true);
    expect(result.source).toBe('us-cd');
    expect(result.data.length).toBeGreaterThan(0);

    const first = result.data[0];
    expect(first.tenures).toHaveLength(5);
    expect(first.tenures[0]).toEqual({ months: 6, apy: 4.0 });
    expect(first.tenures[1]).toEqual({ months: 12, apy: 4.5 });
    expect(first.fdicInsured).toBe(true);
    expect(first.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns errors but does not throw on empty HTML', async () => {
    mockBrowserOk('<html><body></body></html>');

    const { scrapeUSCD } = await import('./us-cd-scraper');
    const result = await scrapeUSCD(mockBrowser);

    expect(result.data).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.success).toBe(false);
  });

  it('ignores rates outside the 0-15 reasonable range', async () => {
    const html = makeCDTablePage([
      { term: '12 Months', apy: '55.00%' },
      { term: '24 Months', apy: '99.99%' },
    ]);
    mockBrowserOk(html);

    const { scrapeUSCD } = await import('./us-cd-scraper');
    const result = await scrapeUSCD(mockBrowser);

    expect(result.data).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('succeeds partially when some fetches fail and others succeed', async () => {
    const goodHtml = makeCDTablePage([
      { term: '12 Months', apy: '4.50%' },
      { term: '24 Months', apy: '4.25%' },
    ]);

    mockedFetchBrowser.mockImplementation((_browser: Browser, url: string) => {
      if (
        url.includes('synchronybank.com') ||
        url.includes('breadfinancial.com') ||
        url.includes('barclaysus.com')
      ) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve(cheerio.load(goodHtml));
    });

    const { scrapeUSCD } = await import('./us-cd-scraper');
    const result = await scrapeUSCD(mockBrowser);

    expect(result.success).toBe(true);
    expect(result.data.length).toBe(4);
    expect(result.errors.length).toBe(3);
    expect(result.errors.some((e) => e.includes('Synchrony'))).toBe(true);
  });

  it('calls mergeRates with key, data, minimum, and idField', async () => {
    const html = makeCDTablePage([
      { term: '12 Months', apy: '4.50%' },
      { term: '24 Months', apy: '4.25%' },
    ]);
    mockBrowserOk(html);

    const rateStoreMod = await import('./rate-store');
    const { scrapeUSCD } = await import('./us-cd-scraper');

    await scrapeUSCD(mockBrowser);

    expect(rateStoreMod.mergeRates).toHaveBeenCalledWith(
      'rates:us-cd',
      expect.arrayContaining([
        expect.objectContaining({
          institutionId: expect.any(String),
          tenures: expect.arrayContaining([expect.objectContaining({ months: 12, apy: 4.5 })]),
        }),
      ]),
      5,
      'institutionId',
    );
  });

  it('returns all 7 institutions when every fetch succeeds', async () => {
    const html = makeCDTablePage([{ term: '12 Months', apy: '4.50%' }]);
    mockBrowserOk(html);

    const { scrapeUSCD } = await import('./us-cd-scraper');
    const result = await scrapeUSCD(mockBrowser);

    expect(result.data).toHaveLength(7);
    const ids = result.data.map((d: USCDRate) => d.institutionId);
    expect(ids).toContain('ally-bank');
    expect(ids).toContain('marcus-goldman-sachs');
    expect(ids).toContain('capital-one');
    expect(ids).toContain('discover-bank');
    expect(ids).toContain('synchrony-bank');
    expect(ids).toContain('bread-financial');
    expect(ids).toContain('barclays');
  });

  it('returns success false when all fetches fail', async () => {
    mockBrowserFail();

    const { scrapeUSCD } = await import('./us-cd-scraper');
    const result = await scrapeUSCD(mockBrowser);

    expect(result.success).toBe(false);
    expect(result.data).toHaveLength(0);
    expect(result.errors).toHaveLength(7);
  });

  it('returns error when no browser provided', async () => {
    const { scrapeUSCD } = await import('./us-cd-scraper');
    const result = await scrapeUSCD();

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('Browser instance required');
  });
});
