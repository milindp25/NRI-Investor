import type { ScraperResult } from './types';
import type { GovtSchemeRate } from '@/types';
import { setRates } from './rate-store';
import { todayISO } from './utils';

// ---------------------------------------------------------------------------
// Hardcoded rates — these change only quarterly (govt gazette notifications).
// Update manually when new rates are announced (typically Jan/Apr/Jul/Oct).
// Last verified: 2026-03-05
// ---------------------------------------------------------------------------

const HARDCODED_RATES: GovtSchemeRate[] = [
  {
    schemeName: 'RBI Floating Rate Savings Bonds',
    schemeId: 'rbi-floating-rate-bonds',
    currentRate: 8.05,
    rateType: 'floating',
    minTenureMonths: 84,
    maxTenureMonths: 84,
    minInvestment: 1000,
    nriEligible: false,
    taxFree: false,
    lastUpdated: '2026-03-05',
  },
  {
    schemeName: 'Post Office Fixed Deposit',
    schemeId: 'post-office-fd',
    currentRate: 7.5,
    rateType: 'fixed',
    minTenureMonths: 12,
    maxTenureMonths: 60,
    minInvestment: 1000,
    nriEligible: false,
    taxFree: false,
    lastUpdated: '2026-03-05',
  },
  {
    schemeName: 'National Savings Certificate',
    schemeId: 'nsc',
    currentRate: 7.7,
    rateType: 'fixed',
    minTenureMonths: 60,
    maxTenureMonths: 60,
    minInvestment: 1000,
    nriEligible: false,
    taxFree: false,
    lastUpdated: '2026-03-05',
  },
  {
    schemeName: 'Senior Citizens Savings Scheme',
    schemeId: 'scss',
    currentRate: 8.2,
    rateType: 'fixed',
    minTenureMonths: 60,
    maxTenureMonths: 60,
    minInvestment: 1000,
    maxInvestment: 3000000,
    nriEligible: false,
    taxFree: false,
    lastUpdated: '2026-03-05',
  },
];

// ---------------------------------------------------------------------------
// Scraper (returns hardcoded data, writes to blob)
// ---------------------------------------------------------------------------

export async function scrapeIndiaGovt(): Promise<ScraperResult<GovtSchemeRate>> {
  const today = todayISO();
  const data = HARDCODED_RATES.map((r) => ({ ...r, lastUpdated: today }));

  await setRates('rates:india-govt', data);

  return {
    success: true,
    data,
    errors: [],
    scrapedAt: new Date().toISOString(),
    source: 'india-govt',
  };
}
