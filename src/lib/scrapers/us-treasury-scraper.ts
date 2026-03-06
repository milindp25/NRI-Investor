import type { ScraperResult } from './types';
import type { USTreasuryRate } from '@/types';
import { fetchWithRetry, isReasonableRate, todayISO } from './utils';
import { setRates } from './rate-store';

// ---------------------------------------------------------------------------
// Term mapping: API security_term -> { type, term }
// ---------------------------------------------------------------------------

interface TermMapping {
  type: USTreasuryRate['type'];
  term: string;
  useYield: boolean; // true = high_yield, false = high_discount_rate
}

const TERM_MAP: Record<string, TermMapping> = {
  '4-Week': { type: 'T-Bill', term: '4-week', useYield: false },
  '13-Week': { type: 'T-Bill', term: '13-week', useYield: false },
  '26-Week': { type: 'T-Bill', term: '26-week', useYield: false },
  '52-Week': { type: 'T-Bill', term: '52-week', useYield: false },
  '2-Year': { type: 'T-Note', term: '2-year', useYield: true },
  '5-Year': { type: 'T-Note', term: '5-year', useYield: true },
  '10-Year': { type: 'T-Note', term: '10-year', useYield: true },
  '20-Year': { type: 'T-Bond', term: '20-year', useYield: true },
  '30-Year': { type: 'T-Bond', term: '30-year', useYield: true },
};

// ---------------------------------------------------------------------------
// API response shape
// ---------------------------------------------------------------------------

interface AuctionRecord {
  security_type: string;
  security_term: string;
  auction_date: string;
  high_discount_rate: string | null;
  high_yield: string | null;
}

interface AuctionApiResponse {
  data: AuctionRecord[];
}

// ---------------------------------------------------------------------------
// Main scraper
// ---------------------------------------------------------------------------

export async function scrapeUSTreasury(): Promise<ScraperResult<USTreasuryRate>> {
  const errors: string[] = [];
  const today = todayISO();

  try {
    const baseUrl =
      process.env.TREASURY_API_URL ??
      'https://api.fiscaldata.treasury.gov/services/api/fiscal_service';

    // 90 days ago in YYYY-MM-DD
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const filterDate = ninetyDaysAgo.toISOString().split('T')[0];

    const url = `${baseUrl}/v1/accounting/od/auctions_query?sort=-auction_date&page[size]=50&format=json&filter=auction_date:gte:${filterDate}`;

    const res = await fetchWithRetry(url);
    if (!res.ok) {
      throw new Error(`Treasury API returned HTTP ${res.status}`);
    }

    const json = (await res.json()) as AuctionApiResponse;
    const records = json.data ?? [];

    // For each term, take the first (most recent) matching record
    const seen = new Set<string>();
    const rates: USTreasuryRate[] = [];

    for (const record of records) {
      const mapping = TERM_MAP[record.security_term];
      if (!mapping) continue;
      if (seen.has(mapping.term)) continue;

      const rawRate = mapping.useYield ? record.high_yield : record.high_discount_rate;

      if (rawRate == null) continue;

      const yieldValue = parseFloat(rawRate);

      if (!isReasonableRate(yieldValue, 0, 15)) {
        errors.push(`Unreasonable yield ${yieldValue}% for ${record.security_term} — skipped`);
        continue;
      }

      seen.add(mapping.term);
      rates.push({
        type: mapping.type,
        term: mapping.term,
        yield: yieldValue,
        lastAuctionDate: record.auction_date,
        lastUpdated: today,
      });
    }

    // Hardcoded I-Bond entry
    rates.push({
      type: 'I-Bond',
      term: 'composite',
      yield: 3.11,
      lastUpdated: today,
    });

    // Hardcoded TIPS entry
    rates.push({
      type: 'TIPS',
      term: '5-year',
      yield: 2.12,
      lastUpdated: today,
    });

    // Persist to KV
    await setRates('rates:us-treasury', rates);

    return {
      success: true,
      data: rates,
      errors,
      scrapedAt: new Date().toISOString(),
      source: 'us-treasury',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(message);

    return {
      success: false,
      data: [],
      errors,
      scrapedAt: new Date().toISOString(),
      source: 'us-treasury',
    };
  }
}
