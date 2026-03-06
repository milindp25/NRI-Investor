import * as cheerio from 'cheerio';

import type { ScraperResult } from './types';
import type { USHYSARate } from '@/types';
import { fetchHtml, parseRate, isReasonableRate, todayISO } from './utils';
import { mergeRates } from './rate-store';
import type { Browser } from './browser';
import { fetchHtmlWithBrowser } from './browser';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

interface HYSAConfig {
  institution: string;
  institutionId: string;
  url: string;
  minBalance: number;
  fdicInsured: boolean;
  selectors: string[]; // CSS selectors to try for APY value
  usesBrowser: boolean; // true = needs headless Chrome (SPA/bot-blocked)
}

const HYSA_CONFIGS: HYSAConfig[] = [
  {
    institution: 'Ally Bank',
    institutionId: 'ally-bank',
    url: 'https://www.ally.com/bank/online-savings-account/',
    minBalance: 0,
    fdicInsured: true,
    selectors: ['[data-apy]', '.apy-rate', '.rate-value', '.savings-rate', '.apy'],
    usesBrowser: false,
  },
  {
    institution: 'Marcus by Goldman Sachs',
    institutionId: 'marcus-goldman-sachs',
    url: 'https://www.marcus.com/us/en/savings/high-yield-savings',
    minBalance: 0,
    fdicInsured: true,
    selectors: ['.rate-value', '.apy-value', '[data-rate]', '.hero-rate', '.savings-apy'],
    usesBrowser: true, // 403 with plain fetch
  },
  {
    institution: 'Wealthfront',
    institutionId: 'wealthfront',
    url: 'https://www.wealthfront.com/cash',
    minBalance: 0,
    fdicInsured: true,
    selectors: ['.apy', '.rate', '[data-apy]', '.cash-rate', '.yield-value'],
    usesBrowser: false,
  },
  {
    institution: 'SoFi',
    institutionId: 'sofi',
    url: 'https://www.sofi.com/banking/savings-account/',
    minBalance: 0,
    fdicInsured: true,
    selectors: ['.rate-value', '.apy-rate', '[data-apy]', '.savings-rate', '.apy'],
    usesBrowser: false,
  },
  {
    institution: 'Discover Bank',
    institutionId: 'discover-bank',
    url: 'https://www.discover.com/online-banking/savings/',
    minBalance: 0,
    fdicInsured: true,
    selectors: ['.rate-apy', '.apy-value', '[data-rate]', '.savings-rate', '.rate'],
    usesBrowser: true, // SPA
  },
  {
    institution: 'Betterment',
    institutionId: 'betterment',
    url: 'https://www.betterment.com/cash-reserve',
    minBalance: 0,
    fdicInsured: true,
    selectors: ['.apy', '.rate-value', '[data-apy]', '.cash-apy', '.yield'],
    usesBrowser: false,
  },
];

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/**
 * Extract APY from a cheerio-loaded page by trying CSS selectors first,
 * then falling back to a regex scan of the full page text.
 */
function extractAPY($: cheerio.CheerioAPI, selectors: string[]): number | null {
  // Strategy 1: Try each CSS selector
  for (const selector of selectors) {
    const el = $(selector).first();
    if (el.length) {
      const text = el.text().trim();
      const rate = parseRate(text);
      if (isReasonableRate(rate, 0, 15)) return rate;

      // Check for a data-apy or data-rate attribute
      const attrRate = el.attr('data-apy') ?? el.attr('data-rate');
      if (attrRate) {
        const parsed = parseRate(attrRate);
        if (isReasonableRate(parsed, 0, 15)) return parsed;
      }
    }
  }

  // Strategy 2: Find elements containing "%" and "APY" nearby
  const candidates: string[] = [];
  $('*').each((_, el) => {
    const text = $(el).text().trim();
    if (text.includes('%') && text.toLowerCase().includes('apy')) {
      candidates.push(text);
    }
  });

  for (const text of candidates) {
    const match = text.match(/(\d+\.\d+)\s*%/);
    if (match) {
      const rate = parseFloat(match[1]);
      if (isReasonableRate(rate, 0, 15)) return rate;
    }
  }

  // Strategy 3: Regex fallback on entire page text
  const bodyText = $('body').text();
  const apyPattern = /(\d+\.\d+)\s*%\s*APY/gi;
  let match: RegExpExecArray | null;
  while ((match = apyPattern.exec(bodyText)) !== null) {
    const rate = parseFloat(match[1]);
    if (isReasonableRate(rate, 0, 15)) return rate;
  }

  // Strategy 4: Broader pattern — just a percentage near "apy" keyword
  const broadPattern = /(\d+\.\d+)\s*%/g;
  const apyMentionIndex = bodyText.toLowerCase().indexOf('apy');
  if (apyMentionIndex !== -1) {
    // Search within 200 chars around the first "apy" mention
    const regionStart = Math.max(0, apyMentionIndex - 200);
    const regionEnd = Math.min(bodyText.length, apyMentionIndex + 200);
    const region = bodyText.slice(regionStart, regionEnd);

    let broadMatch: RegExpExecArray | null;
    while ((broadMatch = broadPattern.exec(region)) !== null) {
      const rate = parseFloat(broadMatch[1]);
      if (isReasonableRate(rate, 0, 15)) return rate;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Scraper
// ---------------------------------------------------------------------------

async function scrapeOne(config: HYSAConfig, browser: Browser | null): Promise<USHYSARate> {
  let $: cheerio.CheerioAPI;

  if (config.usesBrowser && browser) {
    $ = await fetchHtmlWithBrowser(browser, config.url, { waitMs: 4000 });
  } else {
    $ = await fetchHtml(config.url);
  }

  const apy = extractAPY($, config.selectors);

  if (apy === null) {
    throw new Error(`Could not find APY on ${config.institution} page (${config.url})`);
  }

  return {
    institution: config.institution,
    institutionId: config.institutionId,
    apy,
    minBalance: config.minBalance,
    fdicInsured: config.fdicInsured,
    lastUpdated: todayISO(),
  };
}

export async function scrapeUSHYSA(browser?: Browser | null): Promise<ScraperResult<USHYSARate>> {
  const errors: string[] = [];
  const data: USHYSARate[] = [];

  const results = await Promise.allSettled(
    HYSA_CONFIGS.map((config) => scrapeOne(config, browser ?? null)),
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      data.push(result.value);
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      errors.push(`${HYSA_CONFIGS[i].institution}: ${reason}`);
    }
  }

  // Merge into KV (minimum 4 institutions to accept the batch)
  if (data.length > 0) {
    const mergeResult = await mergeRates(
      'rates:us-hysa',
      data as unknown as Record<string, unknown>[],
      4,
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
    source: 'us-hysa',
  };
}
