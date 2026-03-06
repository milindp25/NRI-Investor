import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import * as cheerio from 'cheerio';
import type { Browser } from 'puppeteer-core';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('./rate-store', () => ({
  getRates: vi.fn().mockResolvedValue([]),
  setRates: vi.fn().mockResolvedValue(true),
}));

vi.mock('./browser', () => ({
  fetchHtmlWithBrowser: vi.fn(),
}));

import { getRates, setRates } from './rate-store';
import { fetchHtmlWithBrowser } from './browser';

const mockGetRates = vi.mocked(getRates);
const mockSetRates = vi.mocked(setRates);
const mockedFetchBrowser = fetchHtmlWithBrowser as Mock;

const mockBrowser = {} as Browser;

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

function makeFundPage(yieldText: string): string {
  return `
    <html>
      <body>
        <div class="fund-info">
          <h1>Money Market Fund</h1>
          <div class="yield-section">
            <span class="label">${yieldText}</span>
          </div>
        </div>
      </body>
    </html>
  `;
}

function makePageWithoutYield(): string {
  return `
    <html>
      <body>
        <div class="fund-info">
          <h1>Money Market Fund</h1>
          <p>No yield information available on this page.</p>
        </div>
      </body>
    </html>
  `;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockGetRates.mockResolvedValue([]);
  mockSetRates.mockResolvedValue(true);
});

describe('scrapeUSMoneyMarket', () => {
  it('parses fund page with "7-Day SEC Yield: 4.24%" correctly', async () => {
    const yieldPage = makeFundPage('7-Day SEC Yield: 4.24%');
    mockedFetchBrowser.mockResolvedValue(cheerio.load(yieldPage));

    const { scrapeUSMoneyMarket } = await import('./us-money-market-scraper');
    const result = await scrapeUSMoneyMarket(mockBrowser);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(3);
    expect(result.source).toBe('us-money-market');

    for (const rate of result.data) {
      expect(rate.sevenDayYield).toBe(4.24);
      expect(rate.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }

    const fundIds = result.data.map((r) => r.fundId);
    expect(fundIds).toContain('VMFXX');
    expect(fundIds).toContain('SPAXX');
    expect(fundIds).toContain('SWVXX');
  });

  it('handles missing yield text gracefully', async () => {
    const noYieldPage = makePageWithoutYield();
    mockedFetchBrowser.mockResolvedValue(cheerio.load(noYieldPage));

    const { scrapeUSMoneyMarket } = await import('./us-money-market-scraper');
    const result = await scrapeUSMoneyMarket(mockBrowser);

    expect(result.success).toBe(false);
    expect(result.data).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);

    const yieldErrors = result.errors.filter((e) => e.includes('Could not find 7-day yield'));
    expect(yieldErrors).toHaveLength(3);
  });

  it('returns partial results when 1 of 3 fails', async () => {
    const goodPage = makeFundPage('7-Day SEC Yield: 5.10%');

    mockedFetchBrowser.mockImplementation((_browser: Browser, url: string) => {
      if (url.includes('schwab')) {
        return Promise.resolve(cheerio.load(makePageWithoutYield()));
      }
      return Promise.resolve(cheerio.load(goodPage));
    });

    const { scrapeUSMoneyMarket } = await import('./us-money-market-scraper');
    const result = await scrapeUSMoneyMarket(mockBrowser);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.errors.length).toBeGreaterThan(0);

    const fundIds = result.data.map((r) => r.fundId);
    expect(fundIds).toContain('VMFXX');
    expect(fundIds).toContain('SPAXX');
    expect(fundIds).not.toContain('SWVXX');

    expect(mockSetRates).toHaveBeenCalledWith('rates:us-money-market', expect.any(Array));
  });

  it('includes static fields (minInvestment, expenseRatio) in output', async () => {
    const yieldPage = makeFundPage('7-Day SEC Yield: 4.50%');
    mockedFetchBrowser.mockResolvedValue(cheerio.load(yieldPage));

    const { scrapeUSMoneyMarket } = await import('./us-money-market-scraper');
    const result = await scrapeUSMoneyMarket(mockBrowser);
    expect(result.success).toBe(true);

    const vmfxx = result.data.find((r) => r.fundId === 'VMFXX')!;
    expect(vmfxx.minInvestment).toBe(3000);
    expect(vmfxx.expenseRatio).toBe(0.11);
    expect(vmfxx.provider).toBe('Vanguard');

    const spaxx = result.data.find((r) => r.fundId === 'SPAXX')!;
    expect(spaxx.minInvestment).toBe(0);
    expect(spaxx.expenseRatio).toBe(0.42);
    expect(spaxx.provider).toBe('Fidelity');
  });

  it('handles network error (success=false)', async () => {
    mockedFetchBrowser.mockRejectedValue(new Error('Network error'));

    const { scrapeUSMoneyMarket } = await import('./us-money-market-scraper');
    const result = await scrapeUSMoneyMarket(mockBrowser);

    expect(result.success).toBe(false);
    expect(result.data).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);

    expect(mockSetRates).not.toHaveBeenCalled();
  });

  it('skips KV write when fewer than 2 funds succeed', async () => {
    const goodPage = makeFundPage('7-Day SEC Yield: 4.80%');

    mockedFetchBrowser.mockImplementation((_browser: Browser, url: string) => {
      if (url.includes('vanguard')) {
        return Promise.resolve(cheerio.load(goodPage));
      }
      return Promise.resolve(cheerio.load(makePageWithoutYield()));
    });

    const { scrapeUSMoneyMarket } = await import('./us-money-market-scraper');
    const result = await scrapeUSMoneyMarket(mockBrowser);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);

    expect(mockSetRates).not.toHaveBeenCalled();

    const preserveError = result.errors.find((e) => e.includes('preserving existing data'));
    expect(preserveError).toBeDefined();
  });

  it('returns error when no browser provided', async () => {
    const { scrapeUSMoneyMarket } = await import('./us-money-market-scraper');
    const result = await scrapeUSMoneyMarket();

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('Browser instance required');
  });
});
