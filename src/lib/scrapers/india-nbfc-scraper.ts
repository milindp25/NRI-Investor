import * as cheerio from 'cheerio';
import type { ScraperResult } from './types';
import type { NBFCRate } from '@/types';
import { parseRate, isReasonableRate, todayISO } from './utils';
import { mergeRates } from './rate-store';
import type { Browser } from './browser';
import { fetchHtmlWithBrowser } from './browser';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

interface NBFCConfig {
  institution: string;
  institutionId: string;
  url: string;
  creditRating: string;
  minDeposit: number;
}

const NBFC_CONFIGS: NBFCConfig[] = [
  {
    institution: 'Bajaj Finance',
    institutionId: 'bajaj-finance',
    url: 'https://www.bajajfinserv.in/fixed-deposit-interest-rate',
    creditRating: 'AAA',
    minDeposit: 15000,
  },
  {
    institution: 'Mahindra Finance',
    institutionId: 'mahindra-finance',
    url: 'https://www.mahindrafinance.com/fixed-deposit/fd-interest-rates',
    creditRating: 'AAA',
    minDeposit: 5000,
  },
  {
    institution: 'Shriram Finance',
    institutionId: 'shriram-finance',
    url: 'https://www.shriramfinance.in/fixed-deposit/fd-interest-rates',
    creditRating: 'AA+',
    minDeposit: 5000,
  },
];

// Standard tenures we want to capture (months)
const STANDARD_TENURES = [12, 24, 36, 60];

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

const TENURE_PATTERNS: Array<{ pattern: RegExp; months: number }> = [
  { pattern: /\b1\s*year\b/i, months: 12 },
  { pattern: /\b12\s*months?\b/i, months: 12 },
  { pattern: /\b2\s*years?\b/i, months: 24 },
  { pattern: /\b24\s*months?\b/i, months: 24 },
  { pattern: /\b3\s*years?\b/i, months: 36 },
  { pattern: /\b36\s*months?\b/i, months: 36 },
  { pattern: /\b5\s*years?\b/i, months: 60 },
  { pattern: /\b60\s*months?\b/i, months: 60 },
];

function parseTenure(text: string): number | null {
  for (const { pattern, months } of TENURE_PATTERNS) {
    if (pattern.test(text)) return months;
  }

  const raw = parseInt(text.replace(/\D/g, ''), 10);
  if (!isNaN(raw) && STANDARD_TENURES.includes(raw)) return raw;

  return null;
}

function parseRateTable($: cheerio.CheerioAPI): Array<{ months: number; rate: number }> {
  const found = new Map<number, number>();

  $('table tr').each((_i, row) => {
    const cells = $(row).find('td, th');
    if (cells.length < 2) return;

    let tenureMonths: number | null = null;
    let bestRate: number | null = null;

    cells.each((_j, cell) => {
      const text = $(cell).text().trim();

      const tenure = parseTenure(text);
      if (tenure !== null) {
        tenureMonths = tenure;
      }

      const rate = parseRate(text);
      if (isReasonableRate(rate, 0, 20)) {
        bestRate = rate;
      }
    });

    if (tenureMonths !== null && bestRate !== null && !found.has(tenureMonths)) {
      found.set(tenureMonths, bestRate);
    }
  });

  return STANDARD_TENURES.filter((m) => found.has(m)).map((m) => ({
    months: m,
    rate: found.get(m)!,
  }));
}

// ---------------------------------------------------------------------------
// Scraper
// ---------------------------------------------------------------------------

async function scrapeOne(config: NBFCConfig, browser: Browser): Promise<NBFCRate> {
  const $ = await fetchHtmlWithBrowser(browser, config.url, {
    waitMs: 2000,
  });
  const tenures = parseRateTable($);

  if (tenures.length === 0) {
    throw new Error(`Could not find any rate table on ${config.institution} page (${config.url})`);
  }

  return {
    institution: config.institution,
    institutionId: config.institutionId,
    tenures,
    creditRating: config.creditRating,
    minDeposit: config.minDeposit,
    lastUpdated: todayISO(),
  };
}

export async function scrapeIndiaNBFC(browser?: Browser | null): Promise<ScraperResult<NBFCRate>> {
  if (!browser) {
    return {
      success: false,
      data: [],
      errors: ['Browser instance required for India NBFC scraper (all sites are SPAs/blocked)'],
      scrapedAt: new Date().toISOString(),
      source: 'india-nbfc',
    };
  }

  const errors: string[] = [];
  const data: NBFCRate[] = [];

  const results = await Promise.allSettled(
    NBFC_CONFIGS.map((config) => scrapeOne(config, browser)),
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      data.push(result.value);
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      errors.push(`${NBFC_CONFIGS[i].institution}: ${reason}`);
    }
  }

  // Merge into KV (minimum 2 of 3 institutions to accept the batch)
  if (data.length > 0) {
    const mergeResult = await mergeRates('rates:india-nbfc', data, 1, 'institutionId');
    if (!mergeResult.merged && mergeResult.reason) {
      errors.push(`Merge skipped: ${mergeResult.reason}`);
    }
  }

  return {
    success: data.length > 0,
    data,
    errors,
    scrapedAt: new Date().toISOString(),
    source: 'india-nbfc',
  };
}
