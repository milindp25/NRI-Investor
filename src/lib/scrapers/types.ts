export interface ScraperResult<T> {
  success: boolean;
  data: T[];
  errors: string[];
  scrapedAt: string;
  source: string;
}

export type ScraperType =
  | 'india-fd'
  | 'india-nbfc'
  | 'india-govt'
  | 'us-cd'
  | 'us-hysa'
  | 'us-treasury'
  | 'us-money-market';

export type RateKVKey =
  | 'rates:india-fd'
  | 'rates:india-nbfc'
  | 'rates:india-govt'
  | 'rates:us-cd'
  | 'rates:us-hysa'
  | 'rates:us-treasury'
  | 'rates:us-money-market';

export const SCRAPER_KV_MAP: Record<ScraperType, RateKVKey> = {
  'india-fd': 'rates:india-fd',
  'india-nbfc': 'rates:india-nbfc',
  'india-govt': 'rates:india-govt',
  'us-cd': 'rates:us-cd',
  'us-hysa': 'rates:us-hysa',
  'us-treasury': 'rates:us-treasury',
  'us-money-market': 'rates:us-money-market',
};
