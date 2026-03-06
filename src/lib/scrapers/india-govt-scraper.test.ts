import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scrapeIndiaGovt } from './india-govt-scraper';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSetRates = vi.fn().mockResolvedValue(true);
const mockGetRates = vi.fn().mockResolvedValue([]);

vi.mock('@/lib/scrapers/rate-store', () => ({
  setRates: (...args: unknown[]) => mockSetRates(...args),
  getRates: (...args: unknown[]) => mockGetRates(...args),
}));

// ---------------------------------------------------------------------------
// Mock HTML
// ---------------------------------------------------------------------------

const GOVT_SCHEMES_HTML = `
<html><body>
<table>
<tr><th>Scheme</th><th>Rate of Interest</th></tr>
<tr><td>Post Office Fixed Deposit (1 Year)</td><td>6.90%</td></tr>
<tr><td>National Savings Certificate (NSC)</td><td>7.70%</td></tr>
<tr><td>Senior Citizens Savings Scheme (SCSS)</td><td>8.20%</td></tr>
</table>
</body></html>
`;

const PARTIAL_HTML = `
<html><body>
<table>
<tr><th>Scheme</th><th>Rate of Interest</th></tr>
<tr><td>National Savings Certificate (NSC)</td><td>7.70%</td></tr>
</table>
</body></html>
`;

function mockFetchSuccess(html = GOVT_SCHEMES_HTML) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => html,
    }),
  );
}

function mockFetchAllFailure() {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));
}

function mockFetchPartialSourceSuccess() {
  let callCount = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount <= 1) {
        // First source succeeds
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => GOVT_SCHEMES_HTML,
        });
      }
      // Second source fails
      return Promise.reject(new Error('Server error'));
    }),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('scrapeIndiaGovt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetRates.mockResolvedValue(true);
    mockGetRates.mockResolvedValue([]);
  });

  it('parses govt scheme rates from HTML table', async () => {
    mockFetchSuccess();

    const result = await scrapeIndiaGovt();

    expect(result.success).toBe(true);
    expect(result.source).toBe('india-govt');

    const postOfficeFD = result.data.find((d) => d.schemeId === 'post-office-fd');
    expect(postOfficeFD).toBeDefined();
    expect(postOfficeFD!.currentRate).toBe(6.9);

    const nsc = result.data.find((d) => d.schemeId === 'nsc');
    expect(nsc).toBeDefined();
    expect(nsc!.currentRate).toBe(7.7);

    const scss = result.data.find((d) => d.schemeId === 'scss');
    expect(scss).toBeDefined();
    expect(scss!.currentRate).toBe(8.2);
  });

  it('combines scraped rates with static defaults', async () => {
    mockFetchSuccess();

    const result = await scrapeIndiaGovt();

    const nsc = result.data.find((d) => d.schemeId === 'nsc');
    expect(nsc).toBeDefined();

    // Scraped field
    expect(nsc!.currentRate).toBe(7.7);

    // Static fields from SCHEME_DEFAULTS
    expect(nsc!.schemeName).toBe('National Savings Certificate');
    expect(nsc!.rateType).toBe('fixed');
    expect(nsc!.minTenureMonths).toBe(60);
    expect(nsc!.maxTenureMonths).toBe(60);
    expect(nsc!.minInvestment).toBe(1000);
    expect(nsc!.nriEligible).toBe(false);
    expect(nsc!.taxFree).toBe(false);
    expect(nsc!.lastUpdated).toBeDefined();

    const scss = result.data.find((d) => d.schemeId === 'scss');
    expect(scss).toBeDefined();
    expect(scss!.maxInvestment).toBe(3000000);
  });

  it('falls back to existing data when scraping fails', async () => {
    mockFetchAllFailure();

    // Simulate existing data in KV
    mockGetRates.mockResolvedValue([
      {
        schemeName: 'National Savings Certificate',
        schemeId: 'nsc',
        currentRate: 7.5,
        rateType: 'fixed',
        minTenureMonths: 60,
        maxTenureMonths: 60,
        minInvestment: 1000,
        nriEligible: false,
        taxFree: false,
        lastUpdated: '2026-03-01',
      },
    ]);

    const result = await scrapeIndiaGovt();

    // No data scraped — success should be false
    expect(result.success).toBe(false);
    expect(result.data).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  }, 15000);

  it('derives RBI bond rate from NSC rate + 0.35%', async () => {
    mockFetchSuccess();

    const result = await scrapeIndiaGovt();

    const rbiBond = result.data.find((d) => d.schemeId === 'rbi-floating-rate-bonds');
    expect(rbiBond).toBeDefined();
    // NSC rate is 7.70%, so RBI bond = 7.70 + 0.35 = 8.05
    expect(rbiBond!.currentRate).toBe(8.05);
    expect(rbiBond!.rateType).toBe('floating');
    expect(rbiBond!.minTenureMonths).toBe(84);
    expect(rbiBond!.maxTenureMonths).toBe(84);
  });

  it('validates all required fields present', async () => {
    mockFetchSuccess();

    const result = await scrapeIndiaGovt();

    for (const scheme of result.data) {
      expect(scheme.schemeName).toBeDefined();
      expect(scheme.schemeName.length).toBeGreaterThan(0);
      expect(scheme.schemeId).toBeDefined();
      expect(scheme.schemeId.length).toBeGreaterThan(0);
      expect(typeof scheme.currentRate).toBe('number');
      expect(scheme.currentRate).toBeGreaterThan(0);
      expect(scheme.currentRate).toBeLessThanOrEqual(20);
      expect(['fixed', 'floating']).toContain(scheme.rateType);
      expect(typeof scheme.minTenureMonths).toBe('number');
      expect(typeof scheme.maxTenureMonths).toBe('number');
      expect(typeof scheme.minInvestment).toBe('number');
      expect(typeof scheme.nriEligible).toBe('boolean');
      expect(typeof scheme.taxFree).toBe('boolean');
      expect(scheme.lastUpdated).toBeDefined();
    }
  });

  it('merges with existing when fewer than 3 schemes scraped', async () => {
    mockFetchSuccess(PARTIAL_HTML);

    const existingData = [
      {
        schemeName: 'Post Office Fixed Deposit',
        schemeId: 'post-office-fd',
        currentRate: 6.8,
        rateType: 'fixed' as const,
        minTenureMonths: 12,
        maxTenureMonths: 60,
        minInvestment: 1000,
        nriEligible: false,
        taxFree: false,
        lastUpdated: '2026-03-01',
      },
      {
        schemeName: 'Senior Citizens Savings Scheme',
        schemeId: 'scss',
        currentRate: 8.1,
        rateType: 'fixed' as const,
        minTenureMonths: 60,
        maxTenureMonths: 60,
        minInvestment: 1000,
        maxInvestment: 3000000,
        nriEligible: false,
        taxFree: false,
        lastUpdated: '2026-03-01',
      },
    ];
    mockGetRates.mockResolvedValue(existingData);

    await scrapeIndiaGovt();

    // Only NSC + derived RBI bond scraped (2 schemes), which is < 3
    // So it should call getRates and merge
    expect(mockGetRates).toHaveBeenCalledWith('rates:india-govt');

    // setRates should have been called with merged data
    expect(mockSetRates).toHaveBeenCalled();
    const writtenData = mockSetRates.mock.calls[0][1];

    // New scraped data + existing stale data that wasn't re-scraped
    const ids = writtenData.map((d: { schemeId: string }) => d.schemeId);
    expect(ids).toContain('nsc');
    expect(ids).toContain('rbi-floating-rate-bonds');
    expect(ids).toContain('post-office-fd');
    expect(ids).toContain('scss');
  });

  it('writes directly with setRates when 3+ schemes scraped', async () => {
    mockFetchSuccess();

    await scrapeIndiaGovt();

    // 3 scraped + 1 derived = 4, which is >= 3
    expect(mockSetRates).toHaveBeenCalledWith(
      'rates:india-govt',
      expect.arrayContaining([
        expect.objectContaining({ schemeId: 'post-office-fd' }),
        expect.objectContaining({ schemeId: 'nsc' }),
        expect.objectContaining({ schemeId: 'scss' }),
        expect.objectContaining({ schemeId: 'rbi-floating-rate-bonds' }),
      ]),
    );

    // Should NOT call getRates for merging since we have enough fresh data
    expect(mockGetRates).not.toHaveBeenCalled();
  });

  it('handles one source failing while other succeeds', async () => {
    mockFetchPartialSourceSuccess();

    const result = await scrapeIndiaGovt();

    // First source succeeded with all schemes, so data should be present
    expect(result.success).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);

    // Should have an error for the failed source
    expect(result.errors.some((e) => e.includes('Server error'))).toBe(true);
  }, 15000);
});
