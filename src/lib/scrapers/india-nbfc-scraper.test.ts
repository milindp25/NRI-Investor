import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import * as cheerio from 'cheerio';
import type { Browser } from 'puppeteer-core';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('./rate-store', () => ({
  mergeRates: vi.fn().mockResolvedValue({ merged: true }),
  getRates: vi.fn().mockResolvedValue([]),
}));

vi.mock('./browser', () => ({
  fetchHtmlWithBrowser: vi.fn(),
}));

import { fetchHtmlWithBrowser } from './browser';

const mockedFetchBrowser = fetchHtmlWithBrowser as Mock;

const mockBrowser = {} as Browser;

// ---------------------------------------------------------------------------
// HTML fixtures
// ---------------------------------------------------------------------------

function makeNBFCTableHtml(rows: Array<{ tenure: string; rate: string }>): string {
  const rowsHtml = rows.map((r) => `<tr><td>${r.tenure}</td><td>${r.rate}</td></tr>`).join('\n');
  return `<html><body><table>${rowsHtml}</table></body></html>`;
}

const BAJAJ_HTML = makeNBFCTableHtml([
  { tenure: '12 months', rate: '7.40%' },
  { tenure: '24 months', rate: '7.35%' },
  { tenure: '36 months', rate: '7.25%' },
  { tenure: '60 months', rate: '7.45%' },
]);

const MAHINDRA_HTML = makeNBFCTableHtml([
  { tenure: '1 year', rate: '7.50%' },
  { tenure: '2 years', rate: '7.60%' },
  { tenure: '3 years', rate: '7.55%' },
  { tenure: '5 years', rate: '7.70%' },
]);

const SHRIRAM_HTML = makeNBFCTableHtml([
  { tenure: '12 months', rate: '7.69%' },
  { tenure: '24 months', rate: '8.14%' },
  { tenure: '36 months', rate: '8.39%' },
  { tenure: '60 months', rate: '8.49%' },
]);

function mockAllSuccess() {
  mockedFetchBrowser.mockImplementation((_browser: Browser, url: string) => {
    let html = BAJAJ_HTML;
    if (url.includes('mahindra')) html = MAHINDRA_HTML;
    if (url.includes('shriram')) html = SHRIRAM_HTML;
    return Promise.resolve(cheerio.load(html));
  });
}

function mockWithOneFailure() {
  mockedFetchBrowser.mockImplementation((_browser: Browser, url: string) => {
    if (url.includes('mahindra')) {
      return Promise.reject(new Error('Connection timeout'));
    }
    let html = BAJAJ_HTML;
    if (url.includes('shriram')) html = SHRIRAM_HTML;
    return Promise.resolve(cheerio.load(html));
  });
}

function mockAllFailure() {
  mockedFetchBrowser.mockRejectedValue(new Error('Network failure'));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('scrapeIndiaNBFC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses NBFC rate table HTML correctly', async () => {
    mockAllSuccess();

    const { scrapeIndiaNBFC } = await import('./india-nbfc-scraper');
    const result = await scrapeIndiaNBFC(mockBrowser);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(3);

    const bajaj = result.data.find((d) => d.institutionId === 'bajaj-finance');
    expect(bajaj).toBeDefined();
    expect(bajaj!.tenures).toHaveLength(4);

    const bajaj12m = bajaj!.tenures.find((t) => t.months === 12);
    expect(bajaj12m).toBeDefined();
    expect(bajaj12m!.rate).toBe(7.4);

    const bajaj60m = bajaj!.tenures.find((t) => t.months === 60);
    expect(bajaj60m).toBeDefined();
    expect(bajaj60m!.rate).toBe(7.45);

    const shriram = result.data.find((d) => d.institutionId === 'shriram-finance');
    expect(shriram).toBeDefined();
    expect(shriram!.tenures.find((t) => t.months === 24)!.rate).toBe(8.14);
  });

  it('includes static creditRating and minDeposit', async () => {
    mockAllSuccess();

    const { scrapeIndiaNBFC } = await import('./india-nbfc-scraper');
    const result = await scrapeIndiaNBFC(mockBrowser);

    const bajaj = result.data.find((d) => d.institutionId === 'bajaj-finance');
    expect(bajaj!.creditRating).toBe('AAA');
    expect(bajaj!.minDeposit).toBe(15000);

    const shriram = result.data.find((d) => d.institutionId === 'shriram-finance');
    expect(shriram!.creditRating).toBe('AA+');
    expect(shriram!.minDeposit).toBe(5000);

    const mahindra = result.data.find((d) => d.institutionId === 'mahindra-finance');
    expect(mahindra!.creditRating).toBe('AAA');
    expect(mahindra!.minDeposit).toBe(5000);
  });

  it('handles individual NBFC failure gracefully', async () => {
    mockWithOneFailure();

    const { scrapeIndiaNBFC } = await import('./india-nbfc-scraper');
    const result = await scrapeIndiaNBFC(mockBrowser);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Mahindra Finance');
  });

  it('returns partial results (2 of 3)', async () => {
    mockWithOneFailure();

    const { scrapeIndiaNBFC } = await import('./india-nbfc-scraper');
    const result = await scrapeIndiaNBFC(mockBrowser);

    expect(result.data).toHaveLength(2);
    const ids = result.data.map((d) => d.institutionId);
    expect(ids).toContain('bajaj-finance');
    expect(ids).toContain('shriram-finance');
    expect(ids).not.toContain('mahindra-finance');
  });

  it('validates rate bounds', async () => {
    const unreasonableHtml = makeNBFCTableHtml([
      { tenure: '12 months', rate: '25.00%' },
      { tenure: '24 months', rate: '7.50%' },
    ]);
    mockedFetchBrowser.mockResolvedValue(cheerio.load(unreasonableHtml));

    const { scrapeIndiaNBFC } = await import('./india-nbfc-scraper');
    const result = await scrapeIndiaNBFC(mockBrowser);

    for (const nbfc of result.data) {
      for (const tenure of nbfc.tenures) {
        expect(tenure.rate).toBeGreaterThanOrEqual(0);
        expect(tenure.rate).toBeLessThanOrEqual(20);
      }
    }
  });

  it('returns success=false when all NBFCs fail', async () => {
    mockAllFailure();

    const { scrapeIndiaNBFC } = await import('./india-nbfc-scraper');
    const result = await scrapeIndiaNBFC(mockBrowser);

    expect(result.success).toBe(false);
    expect(result.data).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.source).toBe('india-nbfc');
  });

  it('returns error when no browser provided', async () => {
    const { scrapeIndiaNBFC } = await import('./india-nbfc-scraper');
    const result = await scrapeIndiaNBFC();

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('Browser instance required');
  });
});
