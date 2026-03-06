import * as cheerio from 'cheerio';

import type { ScraperResult } from './types';
import type { BankFDRate } from '@/types';
import { fetchHtml, parseRate, isReasonableRate, todayISO } from './utils';
import { mergeRates } from './rate-store';
import type { Browser } from './browser';
import { fetchHtmlWithBrowser } from './browser';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BankConfig {
  institution: string;
  institutionId: string;
  url: string;
  parseRates: ($: cheerio.CheerioAPI) => { months: number; rate: number }[];
  usesBrowser: boolean;
}

// ---------------------------------------------------------------------------
// Tenure parsing helpers
// ---------------------------------------------------------------------------

const STANDARD_TENURES = [12, 24, 36, 60] as const;

export function parseTenureText(text: string): number | null {
  const normalized = text.toLowerCase().trim();

  const rangeYears = normalized.match(/(\d+)\s*year(?:s)?\s*(?:to|-)(?:\s*less\s*than)?\s*(\d+)/);
  if (rangeYears) {
    return parseInt(rangeYears[1], 10) * 12;
  }

  const rangeMonths = normalized.match(/(\d+)\s*month(?:s)?\s*(?:to|-)\s*(\d+)\s*month/);
  if (rangeMonths) {
    return parseInt(rangeMonths[1], 10);
  }

  const singleYear = normalized.match(/^(\d+)\s*year(?:s)?$/);
  if (singleYear) {
    return parseInt(singleYear[1], 10) * 12;
  }

  const singleMonth = normalized.match(/^(\d+)\s*month(?:s)?$/);
  if (singleMonth) {
    return parseInt(singleMonth[1], 10);
  }

  const days = normalized.match(/(\d+)\s*day/);
  if (days) {
    const d = parseInt(days[1], 10);
    if (d >= 365) return Math.round(d / 30);
    return null;
  }

  return null;
}

export function mapToStandardTenure(months: number): number | null {
  if ((STANDARD_TENURES as readonly number[]).includes(months)) return months;

  if (months >= 1 && months <= 18) return 12;
  if (months >= 19 && months <= 30) return 24;
  if (months >= 31 && months <= 48) return 36;
  if (months >= 49 && months <= 120) return 60;

  return null;
}

// ---------------------------------------------------------------------------
// Generic table parser
// ---------------------------------------------------------------------------

export function parseGenericRateTable($: cheerio.CheerioAPI): { months: number; rate: number }[] {
  const ratesByTenure = new Map<number, number>();

  $('table').each((_, table) => {
    const rows = $(table).find('tr');

    rows.each((_, row) => {
      const cells = $(row).find('td, th');
      if (cells.length < 2) return;

      const cellTexts: string[] = [];
      cells.each((__, cell) => {
        cellTexts.push($(cell).text().trim());
      });

      let tenureMonths: number | null = null;
      let rateValue: number | null = null;

      for (const cellText of cellTexts) {
        if (tenureMonths === null) {
          const parsed = parseTenureText(cellText);
          if (parsed !== null) {
            tenureMonths = parsed;
            continue;
          }
        }

        if (rateValue === null && /\d/.test(cellText)) {
          const candidate = parseRate(cellText);
          if (!isNaN(candidate) && isReasonableRate(candidate)) {
            rateValue = candidate;
          }
        }
      }

      if (tenureMonths !== null && rateValue !== null) {
        const standard = mapToStandardTenure(tenureMonths);
        if (standard !== null) {
          if (!ratesByTenure.has(standard)) {
            ratesByTenure.set(standard, rateValue);
          }
        }
      }
    });
  });

  return Array.from(ratesByTenure.entries())
    .sort(([a], [b]) => a - b)
    .map(([months, rate]) => ({ months, rate }));
}

// ---------------------------------------------------------------------------
// Bank configurations
// ---------------------------------------------------------------------------

const BANK_CONFIGS: BankConfig[] = [
  {
    institution: 'State Bank of India',
    institutionId: 'sbi',
    url: 'https://sbi.co.in/web/interest-rates/deposit-rates/retail-domestic-term-deposits',
    parseRates: parseGenericRateTable,
    usesBrowser: false,
  },
  {
    institution: 'HDFC Bank',
    institutionId: 'hdfc-bank',
    url: 'https://www.hdfcbank.com/personal/resources/learning-centre/save/fixed-deposit-interest-rate',
    parseRates: parseGenericRateTable,
    usesBrowser: true,
  },
  {
    institution: 'ICICI Bank',
    institutionId: 'icici-bank',
    url: 'https://www.icicibank.com/personal-banking/deposits/fixed-deposit/fd-interest-rates',
    parseRates: parseGenericRateTable,
    usesBrowser: true,
  },
  {
    institution: 'Axis Bank',
    institutionId: 'axis-bank',
    url: 'https://www.axisbank.com/fixed-deposit-interest-rate',
    parseRates: parseGenericRateTable,
    usesBrowser: true,
  },
  {
    institution: 'Kotak Mahindra Bank',
    institutionId: 'kotak-mahindra-bank',
    url: 'https://www.kotak.com/en/rates/fixed-deposit-rates.html',
    parseRates: parseGenericRateTable,
    usesBrowser: true,
  },
  {
    institution: 'Punjab National Bank',
    institutionId: 'pnb',
    url: 'https://www.pnbindia.in/interest-rates-deposits.html',
    parseRates: parseGenericRateTable,
    usesBrowser: false,
  },
  {
    institution: 'Bank of Baroda',
    institutionId: 'bank-of-baroda',
    url: 'https://www.bankofbaroda.in/interest-rate-and-service-charges/deposits-interest-rates',
    parseRates: parseGenericRateTable,
    usesBrowser: false,
  },
  {
    institution: 'Canara Bank',
    institutionId: 'canara-bank',
    url: 'https://canarabank.com/interest-rates',
    parseRates: parseGenericRateTable,
    usesBrowser: false,
  },
  {
    institution: 'IndusInd Bank',
    institutionId: 'indusind-bank',
    url: 'https://www.indusind.com/in/en/personal/rates.html',
    parseRates: parseGenericRateTable,
    usesBrowser: false,
  },
  {
    institution: 'Yes Bank',
    institutionId: 'yes-bank',
    url: 'https://www.yesbank.in/personal-banking/yes-individual/deposits/fixed-deposit',
    parseRates: parseGenericRateTable,
    usesBrowser: false,
  },
];

// ---------------------------------------------------------------------------
// Per-bank scraping
// ---------------------------------------------------------------------------

async function scrapeBank(
  config: BankConfig,
  today: string,
  browser: Browser | null,
): Promise<{ data: BankFDRate[]; error?: string }> {
  try {
    let $: cheerio.CheerioAPI;

    if (config.usesBrowser && browser) {
      $ = await fetchHtmlWithBrowser(browser, config.url, { waitMs: 4000 });
    } else {
      $ = await fetchHtml(config.url);
    }

    const tenures = config.parseRates($);

    if (tenures.length === 0) {
      return {
        data: [],
        error: `${config.institution}: No rate data found in HTML`,
      };
    }

    const accountTypes: Array<'NRE' | 'NRO'> = ['NRE', 'NRO'];
    const records: BankFDRate[] = accountTypes.map((accountType) => ({
      institution: config.institution,
      institutionId: config.institutionId,
      accountType,
      tenures,
      lastUpdated: today,
    }));

    return { data: records };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      data: [],
      error: `${config.institution}: ${message}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Main scraper
// ---------------------------------------------------------------------------

export async function scrapeIndiaFD(browser?: Browser | null): Promise<ScraperResult<BankFDRate>> {
  const today = todayISO();
  const errors: string[] = [];

  const results = await Promise.allSettled(
    BANK_CONFIGS.map((config) => scrapeBank(config, today, browser ?? null)),
  );

  const allRates: BankFDRate[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      if (result.value.error) {
        errors.push(result.value.error);
      }
      allRates.push(...result.value.data);
    } else {
      errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
    }
  }

  // Merge into KV store (minimum 10 records = 5 banks x 2 account types)
  const mergeResult = await mergeRates(
    'rates:india-fd',
    allRates as unknown as Record<string, unknown>[],
    10,
    'institutionId',
  );

  if (!mergeResult.merged && mergeResult.reason) {
    errors.push(mergeResult.reason);
  }

  return {
    success: allRates.length > 0,
    data: allRates,
    errors,
    scrapedAt: new Date().toISOString(),
    source: 'india-fd',
  };
}
