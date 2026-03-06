import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scrapeUSMoneyMarket } from './us-money-market-scraper';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('./rate-store', () => ({
  getRates: vi.fn().mockResolvedValue([]),
  setRates: vi.fn().mockResolvedValue(true),
}));

import { getRates, setRates } from './rate-store';

const mockGetRates = vi.mocked(getRates);
const mockSetRates = vi.mocked(setRates);

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

function makeFundPage(yieldText: string): string {
  return `
    <html>
      <body>
        <div class="fund-info">
          <h1>Money Market Fund</h1>
          <div class="yield-section">
            <span class="label">${yieldText}</span>
          </div>
        </div>
      </body>
    </html>
  `;
}

function makePageWithoutYield(): string {
  return `
    <html>
      <body>
        <div class="fund-info">
          <h1>Money Market Fund</h1>
          <p>No yield information available on this page.</p>
        </div>
      </body>
    </html>
  `;
}

// ---------------------------------------------------------------------------
// Fetch mock setup
// ---------------------------------------------------------------------------

let fetchResponses: Map<string, { ok: boolean; text: string } | 'error'>;

function setupFetch(responses: Map<string, { ok: boolean; text: string } | 'error'>): void {
  fetchResponses = responses;

  global.fetch = vi.fn(async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input.toString();

    for (const [pattern, response] of fetchResponses) {
      if (url.includes(pattern)) {
        if (response === 'error') {
          throw new Error(`Network error fetching ${url}`);
        }
        return {
          ok: response.ok,
          status: response.ok ? 200 : 500,
          statusText: response.ok ? 'OK' : 'Internal Server Error',
          text: async () => response.text,
        } as Response;
      }
    }

    // Default: return empty page
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => makePageWithoutYield(),
    } as Response;
  }) as unknown as typeof fetch;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockGetRates.mockResolvedValue([]);
  mockSetRates.mockResolvedValue(true);
});

describe('scrapeUSMoneyMarket', () => {
  it('parses fund page with "7-Day SEC Yield: 4.24%" correctly', async () => {
    const yieldPage = makeFundPage('7-Day SEC Yield: 4.24%');
    setupFetch(
      new Map([
        ['vanguard', { ok: true, text: yieldPage }],
        ['fidelity', { ok: true, text: yieldPage }],
        ['schwab', { ok: true, text: yieldPage }],
      ]),
    );

    const result = await scrapeUSMoneyMarket();

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(3);
    expect(result.source).toBe('us-money-market');

    for (const rate of result.data) {
      expect(rate.sevenDayYield).toBe(4.24);
      expect(rate.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }

    // Verify specific fund IDs are present
    const fundIds = result.data.map((r) => r.fundId);
    expect(fundIds).toContain('VMFXX');
    expect(fundIds).toContain('SPAXX');
    expect(fundIds).toContain('SWVXX');
  });

  it('handles missing yield text gracefully', async () => {
    const noYieldPage = makePageWithoutYield();
    setupFetch(
      new Map([
        ['vanguard', { ok: true, text: noYieldPage }],
        ['fidelity', { ok: true, text: noYieldPage }],
        ['schwab', { ok: true, text: noYieldPage }],
      ]),
    );

    const result = await scrapeUSMoneyMarket();

    expect(result.success).toBe(false);
    expect(result.data).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);

    // Should have errors for each fund mentioning "Could not find"
    const yieldErrors = result.errors.filter((e) => e.includes('Could not find 7-day yield'));
    expect(yieldErrors).toHaveLength(3);
  });

  it('returns partial results when 1 of 3 fails', async () => {
    const goodPage = makeFundPage('7-Day SEC Yield: 5.10%');
    setupFetch(
      new Map([
        ['vanguard', { ok: true, text: goodPage }],
        ['fidelity', { ok: true, text: goodPage }],
        ['schwab', { ok: true, text: makePageWithoutYield() }],
      ]),
    );

    const result = await scrapeUSMoneyMarket();

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.errors.length).toBeGreaterThan(0);

    // The two successful funds should be present
    const fundIds = result.data.map((r) => r.fundId);
    expect(fundIds).toContain('VMFXX');
    expect(fundIds).toContain('SPAXX');
    expect(fundIds).not.toContain('SWVXX');

    // setRates should have been called since 2 >= 2 threshold
    expect(mockSetRates).toHaveBeenCalledWith('rates:us-money-market', expect.any(Array));
  });

  it('includes static fields (minInvestment, expenseRatio) in output', async () => {
    const yieldPage = makeFundPage('7-Day SEC Yield: 4.50%');
    setupFetch(
      new Map([
        ['vanguard', { ok: true, text: yieldPage }],
        ['fidelity', { ok: true, text: yieldPage }],
        ['schwab', { ok: true, text: yieldPage }],
      ]),
    );

    const result = await scrapeUSMoneyMarket();
    expect(result.success).toBe(true);

    const vmfxx = result.data.find((r) => r.fundId === 'VMFXX')!;
    expect(vmfxx.minInvestment).toBe(3000);
    expect(vmfxx.expenseRatio).toBe(0.11);
    expect(vmfxx.provider).toBe('Vanguard');
    expect(vmfxx.fund).toBe('Vanguard Federal Money Market Fund');

    const spaxx = result.data.find((r) => r.fundId === 'SPAXX')!;
    expect(spaxx.minInvestment).toBe(0);
    expect(spaxx.expenseRatio).toBe(0.42);
    expect(spaxx.provider).toBe('Fidelity');

    const swvxx = result.data.find((r) => r.fundId === 'SWVXX')!;
    expect(swvxx.minInvestment).toBe(0);
    expect(swvxx.expenseRatio).toBe(0.34);
    expect(swvxx.provider).toBe('Schwab');
  });

  it('handles network error (success=false)', async () => {
    setupFetch(
      new Map<string, { ok: boolean; text: string } | 'error'>([
        ['vanguard', 'error'],
        ['fidelity', 'error'],
        ['schwab', 'error'],
      ]),
    );

    const result = await scrapeUSMoneyMarket();

    expect(result.success).toBe(false);
    expect(result.data).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);

    // Should not attempt to write when all fail
    expect(mockSetRates).not.toHaveBeenCalled();
  });

  it('skips KV write when fewer than 2 funds succeed', async () => {
    const goodPage = makeFundPage('7-Day SEC Yield: 4.80%');
    setupFetch(
      new Map([
        ['vanguard', { ok: true, text: goodPage }],
        ['fidelity', { ok: true, text: makePageWithoutYield() }],
        ['schwab', { ok: true, text: makePageWithoutYield() }],
      ]),
    );

    const result = await scrapeUSMoneyMarket();

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);

    // setRates should NOT be called since only 1 < 2 threshold
    expect(mockSetRates).not.toHaveBeenCalled();

    // Should have a message about preserving existing data
    const preserveError = result.errors.find((e) => e.includes('preserving existing data'));
    expect(preserveError).toBeDefined();
  });

  it('merges new rates with existing data by fundId', async () => {
    const existingRates = [
      {
        fund: 'Vanguard Federal Money Market Fund',
        fundId: 'VMFXX',
        provider: 'Vanguard',
        sevenDayYield: 4.0,
        minInvestment: 3000,
        expenseRatio: 0.11,
        lastUpdated: '2025-12-01',
      },
      {
        fund: 'Schwab Value Advantage Money Fund',
        fundId: 'SWVXX',
        provider: 'Schwab',
        sevenDayYield: 4.2,
        minInvestment: 0,
        expenseRatio: 0.34,
        lastUpdated: '2025-12-01',
      },
    ];
    mockGetRates.mockResolvedValue(existingRates);

    const goodPage = makeFundPage('7-Day SEC Yield: 5.00%');
    setupFetch(
      new Map([
        ['vanguard', { ok: true, text: goodPage }],
        ['fidelity', { ok: true, text: goodPage }],
        ['schwab', { ok: true, text: makePageWithoutYield() }],
      ]),
    );

    const result = await scrapeUSMoneyMarket();

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2); // VMFXX and SPAXX scraped

    // setRates should merge: 2 new + 1 existing (SWVXX from existing)
    expect(mockSetRates).toHaveBeenCalledTimes(1);
    const writtenData = mockSetRates.mock.calls[0][1] as Array<{
      fundId: string;
      sevenDayYield: number;
    }>;
    expect(writtenData).toHaveLength(3);

    // New VMFXX should have updated yield
    const vmfxx = writtenData.find((r) => r.fundId === 'VMFXX')!;
    expect(vmfxx.sevenDayYield).toBe(5.0);

    // Existing SWVXX should be preserved with old yield
    const swvxx = writtenData.find((r) => r.fundId === 'SWVXX')!;
    expect(swvxx.sevenDayYield).toBe(4.2);
  });
});
