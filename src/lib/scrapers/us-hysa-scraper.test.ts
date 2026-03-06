import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import * as cheerio from 'cheerio';
import type { USHYSARate } from '@/types';
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

// Partial mock of ./utils: keep parseRate / isReasonableRate / todayISO real,
// only stub fetchHtml (used by non-browser institutions).
vi.mock('./utils', async () => {
  const actual = await vi.importActual<typeof import('./utils')>('./utils');
  return {
    ...actual,
    fetchHtml: vi.fn(),
  };
});

import { fetchHtmlWithBrowser } from './browser';
import { fetchHtml } from './utils';

const mockedFetchBrowser = fetchHtmlWithBrowser as Mock;
const mockedFetchHtml = fetchHtml as Mock;

const mockBrowser = {} as Browser;

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

/** Mock both browser-based and fetch-based paths to return the same HTML. */
function mockAllSuccess(html: string) {
  mockedFetchBrowser.mockResolvedValue(cheerio.load(html));
  mockedFetchHtml.mockResolvedValue(cheerio.load(html));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

describe('scrapeUSHYSA', () => {
  it('parses a page with a clear APY value in a matching selector', async () => {
    mockAllSuccess(makeHYSAPage('4.25% APY'));

    const { scrapeUSHYSA } = await import('./us-hysa-scraper');
    const result = await scrapeUSHYSA(mockBrowser);

    expect(result.success).toBe(true);
    expect(result.source).toBe('us-hysa');
    expect(result.data.length).toBeGreaterThan(0);

    const first = result.data[0];
    expect(first.apy).toBe(4.25);
    expect(first.fdicInsured).toBe(true);
    expect(first.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns errors but does not throw on empty HTML', async () => {
    mockAllSuccess('<html><body></body></html>');

    const { scrapeUSHYSA } = await import('./us-hysa-scraper');
    const result = await scrapeUSHYSA(mockBrowser);

    expect(result.data).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.success).toBe(false);
  });

  it('ignores rates outside the 0-15 reasonable range', async () => {
    mockAllSuccess(makeHYSAPage('99.99% APY'));

    const { scrapeUSHYSA } = await import('./us-hysa-scraper');
    const result = await scrapeUSHYSA(mockBrowser);

    expect(result.data).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('succeeds partially when some fetches fail and others succeed', async () => {
    const goodHtml = makeHYSAPage('4.50% APY');
    const good$ = cheerio.load(goodHtml);

    // Browser path: Marcus succeeds, Discover fails
    mockedFetchBrowser.mockImplementation((_browser: Browser, url: string) => {
      if (url.includes('discover.com')) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve(good$);
    });

    // Fetch path: Ally, Wealthfront, SoFi succeed, Betterment fails
    mockedFetchHtml.mockImplementation((url: string) => {
      if (url.includes('betterment.com')) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve(good$);
    });

    const { scrapeUSHYSA } = await import('./us-hysa-scraper');
    const result = await scrapeUSHYSA(mockBrowser);

    // 4 out of 6 should succeed
    expect(result.success).toBe(true);
    expect(result.data.length).toBe(4);
    expect(result.errors.length).toBe(2);
    expect(result.errors.some((e) => e.includes('Discover'))).toBe(true);
    expect(result.errors.some((e) => e.includes('Betterment'))).toBe(true);
  });

  it('calls mergeRates with key, data, minimum, and idField', async () => {
    mockAllSuccess(makeHYSAPage('4.25% APY'));

    const rateStoreMod = await import('./rate-store');
    const { scrapeUSHYSA } = await import('./us-hysa-scraper');

    await scrapeUSHYSA(mockBrowser);

    expect(rateStoreMod.mergeRates).toHaveBeenCalledWith(
      'rates:us-hysa',
      expect.arrayContaining([
        expect.objectContaining({ institutionId: expect.any(String), apy: 4.25 }),
      ]),
      2,
      'institutionId',
    );
  });

  it('extracts APY via regex fallback when no CSS selector matches', async () => {
    const html = makeHYSAPageBodyText(`
      <div>
        <h1>Save More Today</h1>
        <p>Earn a competitive 3.90% APY on your savings.</p>
      </div>
    `);
    mockedFetchBrowser.mockResolvedValue(cheerio.load(html));
    mockedFetchHtml.mockResolvedValue(cheerio.load(html));

    const { scrapeUSHYSA } = await import('./us-hysa-scraper');
    const result = await scrapeUSHYSA(mockBrowser);

    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0].apy).toBe(3.9);
  });

  it('returns all 6 institutions when every fetch succeeds', async () => {
    mockAllSuccess(makeHYSAPage('4.00% APY'));

    const { scrapeUSHYSA } = await import('./us-hysa-scraper');
    const result = await scrapeUSHYSA(mockBrowser);

    expect(result.data).toHaveLength(6);
    const ids = result.data.map((d: USHYSARate) => d.institutionId);
    expect(ids).toContain('ally-bank');
    expect(ids).toContain('marcus-goldman-sachs');
    expect(ids).toContain('wealthfront');
    expect(ids).toContain('sofi');
    expect(ids).toContain('discover-bank');
    expect(ids).toContain('betterment');
  });

  it('returns success false when all fetches fail', async () => {
    mockedFetchBrowser.mockRejectedValue(new Error('Network error'));
    mockedFetchHtml.mockRejectedValue(new Error('Network error'));

    const { scrapeUSHYSA } = await import('./us-hysa-scraper');
    const result = await scrapeUSHYSA(mockBrowser);

    expect(result.success).toBe(false);
    expect(result.data).toHaveLength(0);
    expect(result.errors).toHaveLength(6);
  });
});
