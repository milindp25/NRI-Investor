import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import * as cheerio from 'cheerio';

import {
  parseTenureText,
  mapToStandardTenure,
  parseGenericRateTable,
  scrapeIndiaFD,
} from './india-fd-scraper';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('./rate-store', () => ({
  mergeRates: vi.fn().mockResolvedValue({ merged: true }),
}));

// Mock fetchHtml from utils — we control the HTML each bank "returns"
vi.mock('./utils', async () => {
  const actual = await vi.importActual<typeof import('./utils')>('./utils');
  return {
    ...actual,
    fetchHtml: vi.fn(),
  };
});

import { fetchHtml } from './utils';
import { mergeRates } from './rate-store';

const mockedFetchHtml = fetchHtml as Mock;
const mockedMergeRates = mergeRates as Mock;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_RATE_TABLE_HTML = `
<html><body>
<table>
  <tr><th>Period</th><th>General Public</th></tr>
  <tr><td>1 Year to 2 Years</td><td>6.80%</td></tr>
  <tr><td>2 Years to 3 Years</td><td>7.00%</td></tr>
  <tr><td>3 Years to 5 Years</td><td>6.50%</td></tr>
  <tr><td>5 Years to 10 Years</td><td>6.50%</td></tr>
</table>
</body></html>
`;

function loadCheerio(html: string): cheerio.CheerioAPI {
  return cheerio.load(html);
}

/** Make fetchHtml resolve with a cheerio-loaded HTML string for every call. */
function mockAllBanksSuccess(html: string = VALID_RATE_TABLE_HTML): void {
  mockedFetchHtml.mockResolvedValue(loadCheerio(html));
}

/** Make fetchHtml fail for `failCount` banks, succeed for the rest. */
function mockPartialFailure(failCount: number, html: string = VALID_RATE_TABLE_HTML): void {
  let callIndex = 0;
  mockedFetchHtml.mockImplementation(() => {
    callIndex++;
    if (callIndex <= failCount) {
      return Promise.reject(new Error(`Bank ${callIndex} fetch failed`));
    }
    return Promise.resolve(loadCheerio(html));
  });
}

// ---------------------------------------------------------------------------
// Tests: parseTenureText
// ---------------------------------------------------------------------------

describe('parseTenureText', () => {
  it('parses "1 Year to 2 Years" -> 12 months', () => {
    expect(parseTenureText('1 Year to 2 Years')).toBe(12);
  });

  it('parses "2 Years to 3 Years" -> 24 months', () => {
    expect(parseTenureText('2 Years to 3 Years')).toBe(24);
  });

  it('parses "3 Years to 5 Years" -> 36 months', () => {
    expect(parseTenureText('3 Years to 5 Years')).toBe(36);
  });

  it('parses "5 Years to 10 Years" -> 60 months', () => {
    expect(parseTenureText('5 Years to 10 Years')).toBe(60);
  });

  it('parses "1 Year to less than 2 Years" -> 12 months', () => {
    expect(parseTenureText('1 Year to less than 2 Years')).toBe(12);
  });

  it('parses standalone "1 year" -> 12', () => {
    expect(parseTenureText('1 year')).toBe(12);
  });

  it('parses standalone "5 years" -> 60', () => {
    expect(parseTenureText('5 years')).toBe(60);
  });

  it('parses "12 months" -> 12', () => {
    expect(parseTenureText('12 months')).toBe(12);
  });

  it('parses "6 months to 12 months" -> 6', () => {
    expect(parseTenureText('6 months to 12 months')).toBe(6);
  });

  it('returns null for sub-year day tenures like "90 days"', () => {
    expect(parseTenureText('90 days')).toBeNull();
  });

  it('returns null for unparseable text', () => {
    expect(parseTenureText('General Public')).toBeNull();
    expect(parseTenureText('Interest Rate')).toBeNull();
    expect(parseTenureText('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests: mapToStandardTenure
// ---------------------------------------------------------------------------

describe('mapToStandardTenure', () => {
  it('maps exact standard tenures directly', () => {
    expect(mapToStandardTenure(12)).toBe(12);
    expect(mapToStandardTenure(24)).toBe(24);
    expect(mapToStandardTenure(36)).toBe(36);
    expect(mapToStandardTenure(60)).toBe(60);
  });

  it('maps 6 months -> 12 (nearest standard bucket)', () => {
    expect(mapToStandardTenure(6)).toBe(12);
  });

  it('maps 18 months -> 12', () => {
    expect(mapToStandardTenure(18)).toBe(12);
  });

  it('maps 30 months -> 24', () => {
    expect(mapToStandardTenure(30)).toBe(24);
  });

  it('maps 48 months -> 36', () => {
    expect(mapToStandardTenure(48)).toBe(36);
  });

  it('maps 120 months -> 60', () => {
    expect(mapToStandardTenure(120)).toBe(60);
  });

  it('returns null for out-of-range months', () => {
    expect(mapToStandardTenure(0)).toBeNull();
    expect(mapToStandardTenure(150)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests: parseGenericRateTable
// ---------------------------------------------------------------------------

describe('parseGenericRateTable', () => {
  it('parses a well-formed rate table into standard tenures', () => {
    const $ = loadCheerio(VALID_RATE_TABLE_HTML);
    const rates = parseGenericRateTable($);

    expect(rates).toEqual([
      { months: 12, rate: 6.8 },
      { months: 24, rate: 7.0 },
      { months: 36, rate: 6.5 },
      { months: 60, rate: 6.5 },
    ]);
  });

  it('keeps first rate when multiple rows map to the same standard tenure', () => {
    const html = `
    <table>
      <tr><td>1 Year to 2 Years</td><td>6.80%</td></tr>
      <tr><td>15 months</td><td>7.10%</td></tr>
    </table>`;
    const $ = loadCheerio(html);
    const rates = parseGenericRateTable($);

    // Both map to 12 months; first one wins
    expect(rates).toEqual([{ months: 12, rate: 6.8 }]);
  });

  it('returns empty array for HTML with no tables', () => {
    const $ = loadCheerio('<html><body><p>No tables here</p></body></html>');
    const rates = parseGenericRateTable($);
    expect(rates).toEqual([]);
  });

  it('returns empty array for table with no parseable rates', () => {
    const html = `
    <table>
      <tr><th>Feature</th><th>Description</th></tr>
      <tr><td>Online Banking</td><td>Yes</td></tr>
    </table>`;
    const $ = loadCheerio(html);
    const rates = parseGenericRateTable($);
    expect(rates).toEqual([]);
  });

  it('rejects rates outside the 0-20% range', () => {
    const html = `
    <table>
      <tr><td>1 Year to 2 Years</td><td>25.00%</td></tr>
      <tr><td>2 Years to 3 Years</td><td>7.00%</td></tr>
    </table>`;
    const $ = loadCheerio(html);
    const rates = parseGenericRateTable($);

    // 25% is unreasonable, so only the 7% row should parse
    expect(rates).toEqual([{ months: 24, rate: 7.0 }]);
  });

  it('handles rates without % sign', () => {
    const html = `
    <table>
      <tr><td>1 Year to 2 Years</td><td>6.80</td></tr>
    </table>`;
    const $ = loadCheerio(html);
    const rates = parseGenericRateTable($);
    expect(rates).toEqual([{ months: 12, rate: 6.8 }]);
  });
});

// ---------------------------------------------------------------------------
// Tests: scrapeIndiaFD (integration-level)
// ---------------------------------------------------------------------------

describe('scrapeIndiaFD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedMergeRates.mockResolvedValue({ merged: true });
  });

  it('generates both NRE and NRO entries per bank', async () => {
    mockAllBanksSuccess();

    const result = await scrapeIndiaFD();

    expect(result.success).toBe(true);
    // 10 banks x 2 account types = 20 records
    expect(result.data).toHaveLength(20);

    // Check that each bank has both NRE and NRO
    const sbiEntries = result.data.filter((r) => r.institutionId === 'sbi');
    expect(sbiEntries).toHaveLength(2);
    expect(sbiEntries.map((r) => r.accountType).sort()).toEqual(['NRE', 'NRO']);
  });

  it('populates institution, institutionId, and lastUpdated fields', async () => {
    mockAllBanksSuccess();

    const result = await scrapeIndiaFD();
    const sbiNRE = result.data.find((r) => r.institutionId === 'sbi' && r.accountType === 'NRE');

    expect(sbiNRE).toBeDefined();
    expect(sbiNRE!.institution).toBe('State Bank of India');
    expect(sbiNRE!.institutionId).toBe('sbi');
    expect(sbiNRE!.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('includes correct tenure data from parsed HTML', async () => {
    mockAllBanksSuccess();

    const result = await scrapeIndiaFD();
    const entry = result.data[0];

    expect(entry.tenures).toEqual([
      { months: 12, rate: 6.8 },
      { months: 24, rate: 7.0 },
      { months: 36, rate: 6.5 },
      { months: 60, rate: 6.5 },
    ]);
  });

  it('handles partial failures gracefully (7/10 banks succeed)', async () => {
    mockPartialFailure(3);

    const result = await scrapeIndiaFD();

    expect(result.success).toBe(true);
    // 7 successful banks x 2 account types = 14 records
    expect(result.data).toHaveLength(14);
    expect(result.errors).toHaveLength(3);
    expect(result.errors[0]).toContain('fetch failed');
  });

  it('returns success:false when all banks fail', async () => {
    mockedFetchHtml.mockRejectedValue(new Error('Network down'));

    const result = await scrapeIndiaFD();

    expect(result.success).toBe(false);
    expect(result.data).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('handles banks returning HTML with no rate tables', async () => {
    mockedFetchHtml.mockResolvedValue(loadCheerio('<html><body><p>Coming soon</p></body></html>'));

    const result = await scrapeIndiaFD();

    // All banks parsed but found no data -> errors for each bank
    expect(result.data).toHaveLength(0);
    expect(result.errors.length).toBe(10);
    result.errors.forEach((err) => {
      expect(err).toContain('No rate data found in HTML');
    });
  });

  it('calls mergeRates with correct key and minRecords', async () => {
    mockAllBanksSuccess();

    await scrapeIndiaFD();

    expect(mockedMergeRates).toHaveBeenCalledTimes(1);
    expect(mockedMergeRates).toHaveBeenCalledWith(
      'rates:india-fd',
      expect.any(Array),
      10,
      'institutionId',
    );

    // Verify the data passed to mergeRates is the full 20 records
    const mergeData = mockedMergeRates.mock.calls[0][1];
    expect(mergeData).toHaveLength(20);
  });

  it('reports mergeRates failure reason in errors', async () => {
    mockAllBanksSuccess();
    mockedMergeRates.mockResolvedValue({
      merged: false,
      reason: 'Only 4 records (minimum: 10). Preserving existing data.',
    });

    const result = await scrapeIndiaFD();

    expect(result.errors).toContain('Only 4 records (minimum: 10). Preserving existing data.');
  });

  it('sets source to "india-fd" and includes scrapedAt timestamp', async () => {
    mockAllBanksSuccess();

    const result = await scrapeIndiaFD();

    expect(result.source).toBe('india-fd');
    expect(result.scrapedAt).toBeTruthy();
    // scrapedAt should be a valid ISO string
    expect(() => new Date(result.scrapedAt)).not.toThrow();
  });
});
