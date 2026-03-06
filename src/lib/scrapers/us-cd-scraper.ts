import * as cheerio from 'cheerio';

import type { ScraperResult } from './types';
import type { USCDRate } from '@/types';
import { parseRate, isReasonableRate, todayISO } from './utils';
import { mergeRates } from './rate-store';
import type { Browser } from './browser';
import { fetchHtmlWithBrowser } from './browser';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

interface CDConfig {
  institution: string;
  institutionId: string;
  url: string;
  fdicInsured: boolean;
  tableSelectors: string[]; // CSS selectors to try for the rate table/container
}

const STANDARD_TENURES_MONTHS = [6, 12, 24, 36, 60] as const;

/**
 * Maps common term labels found on bank CD pages to a month value.
 */
const TERM_MAP: Record<string, number> = {
  '6 month': 6,
  '6 months': 6,
  '6-month': 6,
  '6mo': 6,
  '9 month': 9,
  '9 months': 9,
  '9-month': 9,
  '1 year': 12,
  '1-year': 12,
  '12 month': 12,
  '12 months': 12,
  '12-month': 12,
  '13 month': 13,
  '13 months': 13,
  '13-month': 13,
  '18 month': 18,
  '18 months': 18,
  '18-month': 18,
  '2 year': 24,
  '2-year': 24,
  '24 month': 24,
  '24 months': 24,
  '24-month': 24,
  '3 year': 36,
  '3-year': 36,
  '36 month': 36,
  '36 months': 36,
  '36-month': 36,
  '4 year': 48,
  '4-year': 48,
  '48 month': 48,
  '48 months': 48,
  '48-month': 48,
  '5 year': 60,
  '5-year': 60,
  '60 month': 60,
  '60 months': 60,
  '60-month': 60,
};

const CD_CONFIGS: CDConfig[] = [
  {
    institution: 'Ally Bank',
    institutionId: 'ally-bank',
    url: 'https://www.ally.com/bank/cd-rates/',
    fdicInsured: true,
    tableSelectors: ['.rates-table', '.cd-rates', 'table', '[data-rates]', '.rate-card'],
  },
  {
    institution: 'Marcus by Goldman Sachs',
    institutionId: 'marcus-goldman-sachs',
    url: 'https://www.marcus.com/us/en/savings/high-yield-cds',
    fdicInsured: true,
    tableSelectors: ['.rate-table', '.cd-rates', 'table', '.rates-container', '.rate-card'],
  },
  {
    institution: 'Capital One',
    institutionId: 'capital-one',
    url: 'https://www.capitalone.com/bank/cds/',
    fdicInsured: true,
    tableSelectors: ['.rates-table', '.cd-rate-table', 'table', '[data-rates]', '.product-card'],
  },
  {
    institution: 'Discover Bank',
    institutionId: 'discover-bank',
    url: 'https://www.discover.com/online-banking/cd/',
    fdicInsured: true,
    tableSelectors: ['.rate-table', '.cd-rates', 'table', '.rates-grid', '.rate-card'],
  },
  {
    institution: 'Synchrony Bank',
    institutionId: 'synchrony-bank',
    url: 'https://www.synchronybank.com/banking/cd/',
    fdicInsured: true,
    tableSelectors: ['.rates-table', '.cd-rates', 'table', '[data-cd-rates]', '.rate-card'],
  },
  {
    institution: 'Bread Financial',
    institutionId: 'bread-financial',
    url: 'https://www.breadfinancial.com/en/savings/cd.html',
    fdicInsured: true,
    tableSelectors: ['.rate-table', '.cd-rates', 'table', '.rates-container', '.rate-card'],
  },
  {
    institution: 'Barclays',
    institutionId: 'barclays',
    url: 'https://www.barclaysus.com/online-cd.html',
    fdicInsured: true,
    tableSelectors: ['.rates-table', '.cd-rate-table', 'table', '[data-rates]', '.rate-card'],
  },
];

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/**
 * Normalise a term string to months. Returns null if unrecognised.
 */
export function parseTerm(raw: string): number | null {
  const normalised = raw.trim().toLowerCase();

  // Direct lookup
  if (TERM_MAP[normalised] !== undefined) return TERM_MAP[normalised];

  // Partial match: look for a known key inside the string
  for (const [key, months] of Object.entries(TERM_MAP)) {
    if (normalised.includes(key)) return months;
  }

  // Regex fallback: "N month(s)" or "N year(s)"
  const monthMatch = normalised.match(/(\d+)\s*month/);
  if (monthMatch) return parseInt(monthMatch[1], 10);

  const yearMatch = normalised.match(/(\d+)\s*year/);
  if (yearMatch) return parseInt(yearMatch[1], 10) * 12;

  return null;
}

/**
 * Extract CD tenure/APY pairs from a cheerio-loaded page.
 * Tries structured tables first, then falls back to regex scanning.
 */
function extractCDRates(
  $: cheerio.CheerioAPI,
  tableSelectors: string[],
): Array<{ months: number; apy: number }> {
  const tenures: Array<{ months: number; apy: number }> = [];
  const seen = new Set<number>();

  // Strategy 1: Parse HTML table rows (term in one cell, APY in another)
  for (const selector of tableSelectors) {
    const container = $(selector).first();
    if (!container.length) continue;

    container.find('tr').each((_, row) => {
      const cells = $(row).find('td, th');
      if (cells.length < 2) return;

      // Try to find a term cell and an APY cell
      let termMonths: number | null = null;
      let apy: number | null = null;

      cells.each((__, cell) => {
        const text = $(cell).text().trim();

        // Try as term
        if (termMonths === null) {
          const parsed = parseTerm(text);
          if (parsed !== null) termMonths = parsed;
        }

        // Try as rate (contains %)
        if (apy === null && text.includes('%')) {
          const rate = parseRate(text);
          if (isReasonableRate(rate, 0, 15)) apy = rate;
        }
      });

      if (termMonths !== null && apy !== null && !seen.has(termMonths)) {
        seen.add(termMonths);
        tenures.push({ months: termMonths, apy });
      }
    });

    if (tenures.length > 0) return tenures;
  }

  // Strategy 2: Scan for rate cards / list items with term + APY
  for (const selector of tableSelectors) {
    $(selector).each((_, el) => {
      const text = $(el).text().trim();
      const termMonths = parseTerm(text);
      if (termMonths === null) return;

      const rateMatch = text.match(/(\d+\.\d+)\s*%/);
      if (!rateMatch) return;

      const apy = parseFloat(rateMatch[1]);
      if (isReasonableRate(apy, 0, 15) && !seen.has(termMonths)) {
        seen.add(termMonths);
        tenures.push({ months: termMonths, apy });
      }
    });

    if (tenures.length > 0) return tenures;
  }

  // Strategy 3: Regex fallback on full page text
  const bodyText = $('body').text();

  for (const targetMonths of STANDARD_TENURES_MONTHS) {
    if (seen.has(targetMonths)) continue;

    // Build term labels for this tenure
    const labels: string[] = [];
    if (targetMonths < 12) {
      labels.push(`${targetMonths} Month`, `${targetMonths}-Month`);
    } else if (targetMonths % 12 === 0) {
      const years = targetMonths / 12;
      labels.push(
        `${years} Year`,
        `${years}-Year`,
        `${targetMonths} Month`,
        `${targetMonths}-Month`,
      );
    } else {
      labels.push(`${targetMonths} Month`, `${targetMonths}-Month`);
    }

    for (const label of labels) {
      // Look for "label ... N.NN%" within 200 chars
      const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`${escapedLabel}s?[\\s\\S]{0,200}?(\\d+\\.\\d+)\\s*%`, 'i');
      const match = bodyText.match(pattern);
      if (match) {
        const apy = parseFloat(match[1]);
        if (isReasonableRate(apy, 0, 15)) {
          seen.add(targetMonths);
          tenures.push({ months: targetMonths, apy });
          break;
        }
      }
    }
  }

  return tenures;
}

// ---------------------------------------------------------------------------
// Scraper
// ---------------------------------------------------------------------------

async function scrapeOne(config: CDConfig, browser: Browser): Promise<USCDRate> {
  const $ = await fetchHtmlWithBrowser(browser, config.url, {
    waitMs: 4000,
  });
  const tenures = extractCDRates($, config.tableSelectors);

  if (tenures.length === 0) {
    throw new Error(`Could not find any CD rates on ${config.institution} page (${config.url})`);
  }

  // Sort by term ascending
  tenures.sort((a, b) => a.months - b.months);

  return {
    institution: config.institution,
    institutionId: config.institutionId,
    tenures,
    fdicInsured: config.fdicInsured,
    lastUpdated: todayISO(),
  };
}

export async function scrapeUSCD(browser?: Browser | null): Promise<ScraperResult<USCDRate>> {
  if (!browser) {
    return {
      success: false,
      data: [],
      errors: ['Browser instance required for US CD scraper (all banks are SPAs)'],
      scrapedAt: new Date().toISOString(),
      source: 'us-cd',
    };
  }

  const errors: string[] = [];
  const data: USCDRate[] = [];

  const results = await Promise.allSettled(CD_CONFIGS.map((config) => scrapeOne(config, browser)));

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      data.push(result.value);
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      errors.push(`${CD_CONFIGS[i].institution}: ${reason}`);
    }
  }

  // Merge into KV (minimum 5 institutions to accept the batch)
  if (data.length > 0) {
    const mergeResult = await mergeRates(
      'rates:us-cd',
      data as unknown as Record<string, unknown>[],
      5,
      'institutionId',
    );
    if (!mergeResult.merged && mergeResult.reason) {
      errors.push(`Merge skipped: ${mergeResult.reason}`);
    }
  }

  return {
    success: data.length > 0,
    data,
    errors,
    scrapedAt: new Date().toISOString(),
    source: 'us-cd',
  };
}
