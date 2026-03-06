import type { ScraperResult } from './types';
import type { USMoneyMarketRate } from '@/types';
import { fetchHtml, parseRate, isReasonableRate, todayISO } from './utils';
import { setRates, getRates } from './rate-store';

// ---------------------------------------------------------------------------
// Fund configuration
// ---------------------------------------------------------------------------

interface MoneyMarketConfig {
  fund: string;
  fundId: string;
  provider: string;
  url: string;
  minInvestment: number;
  expenseRatio: number;
}

const FUND_CONFIGS: MoneyMarketConfig[] = [
  {
    fund: 'Vanguard Federal Money Market Fund',
    fundId: 'VMFXX',
    provider: 'Vanguard',
    url: 'https://investor.vanguard.com/investment-products/mutual-funds/profile/vmfxx',
    minInvestment: 3000,
    expenseRatio: 0.11,
  },
  {
    fund: 'Fidelity Government Money Market Fund',
    fundId: 'SPAXX',
    provider: 'Fidelity',
    url: 'https://fundresearch.fidelity.com/mutual-funds/summary/31617H102',
    minInvestment: 0,
    expenseRatio: 0.42,
  },
  {
    fund: 'Schwab Value Advantage Money Fund',
    fundId: 'SWVXX',
    provider: 'Schwab',
    url: 'https://www.schwabassetmanagement.com/products/swvxx',
    minInvestment: 0,
    expenseRatio: 0.34,
  },
];

// ---------------------------------------------------------------------------
// Yield extraction
// ---------------------------------------------------------------------------

/**
 * Extract the 7-day yield from a fund page.
 *
 * Strategy:
 * 1. Look for text containing "7-day" or "7-Day" and extract the nearby percentage.
 * 2. Fallback: scan all text for a percentage pattern near "7-day" or "yield".
 */
function extract7DayYield($: ReturnType<typeof import('cheerio').load>): number | null {
  const bodyText = $('body').text();

  // Strategy 1: Find "7-day" or "7-Day" near a percentage value
  const sevenDayPattern = /7[- ]?[Dd]ay\s+(?:SEC\s+)?[Yy]ield[^%\d]{0,40}(\d+\.\d+)\s*%/;
  const match1 = bodyText.match(sevenDayPattern);
  if (match1) {
    const rate = parseRate(match1[1]);
    if (!isNaN(rate)) return rate;
  }

  // Strategy 2: Percentage before "7-day" text
  const reversePattern = /(\d+\.\d+)\s*%\s{0,20}7[- ]?[Dd]ay/;
  const match2 = bodyText.match(reversePattern);
  if (match2) {
    const rate = parseRate(match2[1]);
    if (!isNaN(rate)) return rate;
  }

  // Strategy 3: Broader search - find lines containing both "7-day" and a percentage
  const lines = bodyText.split(/\n/);
  for (const line of lines) {
    if (/7[- ]?[Dd]ay/i.test(line)) {
      const pctMatch = line.match(/(\d+\.\d+)\s*%/);
      if (pctMatch) {
        const rate = parseRate(pctMatch[1]);
        if (!isNaN(rate)) return rate;
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Single fund scraper
// ---------------------------------------------------------------------------

interface FundScrapeResult {
  rate: USMoneyMarketRate | null;
  error: string | null;
}

async function scrapeFund(config: MoneyMarketConfig): Promise<FundScrapeResult> {
  try {
    const $ = await fetchHtml(config.url);
    const yieldValue = extract7DayYield($);

    if (yieldValue === null) {
      return {
        rate: null,
        error: `${config.fundId}: Could not find 7-day yield on page`,
      };
    }

    if (!isReasonableRate(yieldValue, 0, 15)) {
      return {
        rate: null,
        error: `${config.fundId}: Unreasonable 7-day yield ${yieldValue}%`,
      };
    }

    return {
      rate: {
        fund: config.fund,
        fundId: config.fundId,
        provider: config.provider,
        sevenDayYield: yieldValue,
        minInvestment: config.minInvestment,
        expenseRatio: config.expenseRatio,
        lastUpdated: todayISO(),
      },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      rate: null,
      error: `${config.fundId}: ${message}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Main scraper
// ---------------------------------------------------------------------------

export async function scrapeUSMoneyMarket(): Promise<ScraperResult<USMoneyMarketRate>> {
  const errors: string[] = [];

  const results = await Promise.allSettled(FUND_CONFIGS.map((config) => scrapeFund(config)));

  const rates: USMoneyMarketRate[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { rate, error } = result.value;
      if (rate) {
        rates.push(rate);
      }
      if (error) {
        errors.push(error);
      }
    } else {
      errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
    }
  }

  // Merge with existing data if at least 2 of 3 funds succeeded
  if (rates.length >= 2) {
    const existing = await getRates<USMoneyMarketRate>('rates:us-money-market');
    const newIds = new Set(rates.map((r) => r.fundId));
    const merged = [...rates, ...existing.filter((r) => !newIds.has(r.fundId))];
    await setRates('rates:us-money-market', merged);
  } else {
    errors.push(
      `Only ${rates.length} of ${FUND_CONFIGS.length} funds scraped successfully — preserving existing data`,
    );
  }

  return {
    success: rates.length > 0,
    data: rates,
    errors,
    scrapedAt: new Date().toISOString(),
    source: 'us-money-market',
  };
}
