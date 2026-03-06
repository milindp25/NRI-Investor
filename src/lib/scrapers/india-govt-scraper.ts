import * as cheerio from 'cheerio';
import type { ScraperResult } from './types';
import type { GovtSchemeRate } from '@/types';
import { fetchHtml, parseRate, isReasonableRate, todayISO } from './utils';
import { setRates, getRates } from './rate-store';

// ---------------------------------------------------------------------------
// Static scheme metadata (changes only via legislation)
// ---------------------------------------------------------------------------

const SCHEME_DEFAULTS: Omit<GovtSchemeRate, 'currentRate' | 'lastUpdated'>[] = [
  {
    schemeName: 'RBI Floating Rate Savings Bonds',
    schemeId: 'rbi-floating-rate-bonds',
    rateType: 'floating',
    minTenureMonths: 84,
    maxTenureMonths: 84,
    minInvestment: 1000,
    nriEligible: false,
    taxFree: false,
  },
  {
    schemeName: 'Post Office Fixed Deposit',
    schemeId: 'post-office-fd',
    rateType: 'fixed',
    minTenureMonths: 12,
    maxTenureMonths: 60,
    minInvestment: 1000,
    nriEligible: false,
    taxFree: false,
  },
  {
    schemeName: 'National Savings Certificate',
    schemeId: 'nsc',
    rateType: 'fixed',
    minTenureMonths: 60,
    maxTenureMonths: 60,
    minInvestment: 1000,
    nriEligible: false,
    taxFree: false,
  },
  {
    schemeName: 'Senior Citizens Savings Scheme',
    schemeId: 'scss',
    rateType: 'fixed',
    minTenureMonths: 60,
    maxTenureMonths: 60,
    minInvestment: 1000,
    maxInvestment: 3000000,
    nriEligible: false,
    taxFree: false,
  },
];

// ---------------------------------------------------------------------------
// Source URLs
// ---------------------------------------------------------------------------

const SOURCES = [
  'https://www.indiapost.gov.in/Financial/pages/content/post-office-saving-schemes.aspx',
  'https://www.nsiindia.gov.in/InternalPage.aspx?Id_Pk=89',
];

// ---------------------------------------------------------------------------
// Scheme name matching patterns
// ---------------------------------------------------------------------------

const SCHEME_MATCHERS: Record<string, RegExp> = {
  'post-office-fd': /post\s*office\s*(fixed\s*deposit|fd|time\s*deposit)/i,
  nsc: /national\s*savings?\s*certificate|nsc/i,
  scss: /senior\s*citizen|scss/i,
};

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Extract scheme rates from an HTML page.
 * Returns a map of schemeId -> rate.
 */
function extractSchemeRates($: cheerio.CheerioAPI): Map<string, number> {
  const rates = new Map<string, number>();

  // Scan table rows for scheme name + rate pairs
  $('table tr').each((_i, row) => {
    const cells = $(row).find('td, th');
    if (cells.length < 2) return;

    const rowText = $(row).text();

    for (const [schemeId, pattern] of Object.entries(SCHEME_MATCHERS)) {
      if (!pattern.test(rowText)) continue;
      if (rates.has(schemeId)) continue;

      // Look for a percentage value in the row cells
      cells.each((_j, cell) => {
        if (rates.has(schemeId)) return;

        const cellText = $(cell).text().trim();
        const rate = parseRate(cellText);
        if (isReasonableRate(rate, 0, 20)) {
          rates.set(schemeId, rate);
        }
      });
    }
  });

  return rates;
}

// ---------------------------------------------------------------------------
// Scraper
// ---------------------------------------------------------------------------

export async function scrapeIndiaGovt(): Promise<ScraperResult<GovtSchemeRate>> {
  const errors: string[] = [];
  const scrapedRates = new Map<string, number>();
  const today = todayISO();

  // Try each source URL — accumulate rates from all sources
  for (const url of SOURCES) {
    try {
      const $ = await fetchHtml(url);
      const rates = extractSchemeRates($);

      for (const [schemeId, rate] of rates) {
        if (!scrapedRates.has(schemeId)) {
          scrapedRates.set(schemeId, rate);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Failed to fetch ${url}: ${message}`);
    }
  }

  // Derive RBI bond rate = NSC rate + 0.35%
  const nscRate = scrapedRates.get('nsc');
  if (nscRate !== undefined && !scrapedRates.has('rbi-floating-rate-bonds')) {
    const rbiRate = Math.round((nscRate + 0.35) * 100) / 100;
    if (isReasonableRate(rbiRate, 0, 20)) {
      scrapedRates.set('rbi-floating-rate-bonds', rbiRate);
    }
  }

  // Build full records by combining scraped rates with static defaults
  const data: GovtSchemeRate[] = [];

  for (const defaults of SCHEME_DEFAULTS) {
    const rate = scrapedRates.get(defaults.schemeId);
    if (rate !== undefined) {
      data.push({
        ...defaults,
        currentRate: rate,
        lastUpdated: today,
      });
    }
  }

  // Persistence strategy:
  // If at least 3 of 4 schemes have rates, write directly.
  // If fewer than 3, merge with existing data to preserve stale-but-valid rates.
  if (data.length >= 3) {
    const written = await setRates('rates:india-govt', data);
    if (!written) {
      errors.push('Failed to write rates to KV');
    }
  } else if (data.length > 0) {
    const existing = await getRates<GovtSchemeRate>('rates:india-govt');
    const newIds = new Set(data.map((d) => d.schemeId));
    const merged = [...data, ...existing.filter((e) => !newIds.has(e.schemeId))];
    const written = await setRates('rates:india-govt', merged);
    if (!written) {
      errors.push('Failed to write merged rates to KV');
    }
  }

  return {
    success: data.length > 0,
    data,
    errors,
    scrapedAt: new Date().toISOString(),
    source: 'india-govt',
  };
}
