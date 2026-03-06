import type { ScraperResult, ScraperType } from './types';
import { scrapeUSTreasury } from './us-treasury-scraper';
import { scrapeUSMoneyMarket } from './us-money-market-scraper';
import { scrapeUSHYSA } from './us-hysa-scraper';
import { scrapeUSCD } from './us-cd-scraper';
import { scrapeIndiaFD } from './india-fd-scraper';
import { scrapeIndiaNBFC } from './india-nbfc-scraper';
import { scrapeIndiaGovt } from './india-govt-scraper';

const SCRAPER_MAP: Record<ScraperType, () => Promise<ScraperResult<unknown>>> = {
  'us-treasury': scrapeUSTreasury,
  'us-money-market': scrapeUSMoneyMarket,
  'us-hysa': scrapeUSHYSA,
  'us-cd': scrapeUSCD,
  'india-fd': scrapeIndiaFD,
  'india-nbfc': scrapeIndiaNBFC,
  'india-govt': scrapeIndiaGovt,
};

export const VALID_SCRAPER_TYPES: ScraperType[] = Object.keys(SCRAPER_MAP) as ScraperType[];

export async function runScraper(type: ScraperType): Promise<ScraperResult<unknown>> {
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
  return scraper();
}

export async function runAllScrapers(): Promise<Record<ScraperType, ScraperResult<unknown>>> {
  const entries = Object.entries(SCRAPER_MAP) as [
    ScraperType,
    () => Promise<ScraperResult<unknown>>,
  ][];

  const results = await Promise.allSettled(
    entries.map(async ([type, scraper]) => {
      try {
        return { type, result: await scraper() };
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
