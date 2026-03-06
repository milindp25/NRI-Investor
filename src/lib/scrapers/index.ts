import type { ScraperResult, ScraperType } from './types';
import type { Browser } from './browser';
import { scrapeUSTreasury } from './us-treasury-scraper';
import { scrapeUSMoneyMarket } from './us-money-market-scraper';
import { scrapeUSHYSA } from './us-hysa-scraper';
import { scrapeUSCD } from './us-cd-scraper';
import { scrapeIndiaFD } from './india-fd-scraper';
import { scrapeIndiaNBFC } from './india-nbfc-scraper';
import { scrapeIndiaGovt } from './india-govt-scraper';

type ScraperFn = (browser?: Browser | null) => Promise<ScraperResult<unknown>>;

const SCRAPER_MAP: Record<ScraperType, ScraperFn> = {
  'us-treasury': scrapeUSTreasury as ScraperFn,
  'us-money-market': scrapeUSMoneyMarket as ScraperFn,
  'us-hysa': scrapeUSHYSA as ScraperFn,
  'us-cd': scrapeUSCD as ScraperFn,
  'india-fd': scrapeIndiaFD as ScraperFn,
  'india-nbfc': scrapeIndiaNBFC as ScraperFn,
  'india-govt': scrapeIndiaGovt as ScraperFn,
};

export const VALID_SCRAPER_TYPES: ScraperType[] = Object.keys(SCRAPER_MAP) as ScraperType[];

export async function runScraper(
  type: ScraperType,
  browser?: Browser | null,
): Promise<ScraperResult<unknown>> {
  const scraper = SCRAPER_MAP[type];
  if (!scraper) {
    return {
      success: false,
      data: [],
      errors: [`Unknown scraper type: ${type}`],
      scrapedAt: new Date().toISOString(),
      source: type,
    };
  }
  return scraper(browser);
}

export async function runAllScrapers(
  browser?: Browser | null,
): Promise<Record<ScraperType, ScraperResult<unknown>>> {
  const entries = Object.entries(SCRAPER_MAP) as [ScraperType, ScraperFn][];

  const results = await Promise.allSettled(
    entries.map(async ([type, scraper]) => {
      try {
        return { type, result: await scraper(browser) };
      } catch (err) {
        return {
          type,
          result: {
            success: false,
            data: [],
            errors: [err instanceof Error ? err.message : String(err)],
            scrapedAt: new Date().toISOString(),
            source: type,
          } satisfies ScraperResult<unknown>,
        };
      }
    }),
  );

  const out = {} as Record<ScraperType, ScraperResult<unknown>>;
  for (const r of results) {
    if (r.status === 'fulfilled') {
      out[r.value.type] = r.value.result;
    }
  }
  return out;
}
