import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSetRates = vi.fn().mockResolvedValue(true);

vi.mock('@/lib/scrapers/rate-store', () => ({
  setRates: (...args: unknown[]) => mockSetRates(...args),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('scrapeIndiaGovt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetRates.mockResolvedValue(true);
  });

  it('returns all 4 hardcoded govt scheme rates', async () => {
    const { scrapeIndiaGovt } = await import('./india-govt-scraper');
    const result = await scrapeIndiaGovt();

    expect(result.success).toBe(true);
    expect(result.source).toBe('india-govt');
    expect(result.data).toHaveLength(4);

    const schemeIds = result.data.map((d) => d.schemeId);
    expect(schemeIds).toContain('rbi-floating-rate-bonds');
    expect(schemeIds).toContain('post-office-fd');
    expect(schemeIds).toContain('nsc');
    expect(schemeIds).toContain('scss');
  });

  it('has correct rates for each scheme', async () => {
    const { scrapeIndiaGovt } = await import('./india-govt-scraper');
    const result = await scrapeIndiaGovt();

    const rbiBond = result.data.find((d) => d.schemeId === 'rbi-floating-rate-bonds');
    expect(rbiBond!.currentRate).toBe(8.05);
    expect(rbiBond!.rateType).toBe('floating');
    expect(rbiBond!.minTenureMonths).toBe(84);

    const postOfficeFD = result.data.find((d) => d.schemeId === 'post-office-fd');
    expect(postOfficeFD!.currentRate).toBe(7.5);

    const nsc = result.data.find((d) => d.schemeId === 'nsc');
    expect(nsc!.currentRate).toBe(7.7);

    const scss = result.data.find((d) => d.schemeId === 'scss');
    expect(scss!.currentRate).toBe(8.2);
    expect(scss!.maxInvestment).toBe(3000000);
  });

  it('writes hardcoded rates to blob via setRates', async () => {
    const { scrapeIndiaGovt } = await import('./india-govt-scraper');
    await scrapeIndiaGovt();

    expect(mockSetRates).toHaveBeenCalledWith(
      'rates:india-govt',
      expect.arrayContaining([
        expect.objectContaining({ schemeId: 'rbi-floating-rate-bonds' }),
        expect.objectContaining({ schemeId: 'post-office-fd' }),
        expect.objectContaining({ schemeId: 'nsc' }),
        expect.objectContaining({ schemeId: 'scss' }),
      ]),
    );
  });

  it('validates all required fields present', async () => {
    const { scrapeIndiaGovt } = await import('./india-govt-scraper');
    const result = await scrapeIndiaGovt();

    for (const scheme of result.data) {
      expect(scheme.schemeName).toBeDefined();
      expect(scheme.schemeName.length).toBeGreaterThan(0);
      expect(scheme.schemeId).toBeDefined();
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

  it('returns no errors', async () => {
    const { scrapeIndiaGovt } = await import('./india-govt-scraper');
    const result = await scrapeIndiaGovt();

    expect(result.errors).toHaveLength(0);
  });

  it('sets lastUpdated to today', async () => {
    const { scrapeIndiaGovt } = await import('./india-govt-scraper');
    const result = await scrapeIndiaGovt();

    for (const scheme of result.data) {
      expect(scheme.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
