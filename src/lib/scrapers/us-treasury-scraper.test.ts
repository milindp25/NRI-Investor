import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scrapeUSTreasury } from './us-treasury-scraper';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/scrapers/rate-store', () => ({
  setRates: vi.fn().mockResolvedValue(true),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBillRecord(term: string, auctionDate: string, highDiscountRate: string) {
  return {
    security_type: 'Bill',
    security_term: term,
    auction_date: auctionDate,
    high_discount_rate: highDiscountRate,
    high_yield: null,
  };
}

function makeNoteRecord(term: string, auctionDate: string, highYield: string) {
  return {
    security_type: 'Note',
    security_term: term,
    auction_date: auctionDate,
    high_discount_rate: null,
    high_yield: highYield,
  };
}

function makeBondRecord(term: string, auctionDate: string, highYield: string) {
  return {
    security_type: 'Bond',
    security_term: term,
    auction_date: auctionDate,
    high_discount_rate: null,
    high_yield: highYield,
  };
}

function mockFetchOk(data: unknown[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data }),
    }),
  );
}

function mockFetchError() {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('scrapeUSTreasury', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('parses auction API response correctly for Bills and Notes', async () => {
    mockFetchOk([
      makeBillRecord('4-Week', '2026-03-03', '4.220'),
      makeBillRecord('13-Week', '2026-03-02', '4.300'),
      makeBillRecord('26-Week', '2026-02-28', '4.150'),
      makeBillRecord('52-Week', '2026-02-20', '4.050'),
      makeNoteRecord('2-Year', '2026-02-24', '3.455'),
      makeNoteRecord('5-Year', '2026-02-20', '3.600'),
      makeNoteRecord('10-Year', '2026-02-18', '3.950'),
      makeBondRecord('30-Year', '2026-02-15', '4.250'),
    ]);

    const result = await scrapeUSTreasury();

    expect(result.success).toBe(true);

    // 8 from API + I-Bond + TIPS = 10
    expect(result.data).toHaveLength(10);

    const bill4w = result.data.find((r) => r.term === '4-week');
    expect(bill4w).toBeDefined();
    expect(bill4w!.type).toBe('T-Bill');
    expect(bill4w!.yield).toBe(4.22);
    expect(bill4w!.lastAuctionDate).toBe('2026-03-03');

    const note2y = result.data.find((r) => r.term === '2-year');
    expect(note2y).toBeDefined();
    expect(note2y!.type).toBe('T-Note');
    expect(note2y!.yield).toBe(3.455);

    const bond30y = result.data.find((r) => r.term === '30-year');
    expect(bond30y).toBeDefined();
    expect(bond30y!.type).toBe('T-Bond');
    expect(bond30y!.yield).toBe(4.25);
  });

  it('handles empty API response gracefully', async () => {
    mockFetchOk([]);

    const result = await scrapeUSTreasury();

    expect(result.success).toBe(true);
    // Should still contain hardcoded I-Bond and TIPS
    expect(result.data).toHaveLength(2);
    expect(result.data.map((r) => r.type)).toEqual(expect.arrayContaining(['I-Bond', 'TIPS']));
  });

  it('rejects unreasonable yields', async () => {
    mockFetchOk([
      makeBillRecord('4-Week', '2026-03-03', '99.000'),
      makeBillRecord('13-Week', '2026-03-02', '4.300'),
    ]);

    const result = await scrapeUSTreasury();

    expect(result.success).toBe(true);
    // 99% yield should be skipped: only 13-Week + I-Bond + TIPS = 3
    expect(result.data).toHaveLength(3);
    expect(result.data.find((r) => r.term === '4-week')).toBeUndefined();
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('Unreasonable yield 99%')]),
    );
  });

  it('includes hardcoded I-Bond and TIPS entries', async () => {
    mockFetchOk([]);

    const result = await scrapeUSTreasury();

    const iBond = result.data.find((r) => r.type === 'I-Bond');
    expect(iBond).toBeDefined();
    expect(iBond!.term).toBe('composite');
    expect(iBond!.yield).toBe(3.11);

    const tips = result.data.find((r) => r.type === 'TIPS');
    expect(tips).toBeDefined();
    expect(tips!.term).toBe('5-year');
    expect(tips!.yield).toBe(2.12);
  });

  it('returns success=true with valid data', async () => {
    mockFetchOk([
      makeBillRecord('4-Week', '2026-03-03', '4.220'),
      makeNoteRecord('10-Year', '2026-02-18', '3.950'),
    ]);

    const result = await scrapeUSTreasury();

    expect(result.success).toBe(true);
    expect(result.source).toBe('us-treasury');
    expect(result.scrapedAt).toBeDefined();
    expect(result.data.length).toBeGreaterThan(0);

    // Verify every entry has required fields
    for (const entry of result.data) {
      expect(entry.type).toBeDefined();
      expect(entry.term).toBeDefined();
      expect(typeof entry.yield).toBe('number');
      expect(entry.lastUpdated).toBeDefined();
    }
  });

  it('handles network error gracefully', async () => {
    mockFetchError();

    const result = await scrapeUSTreasury();

    expect(result.success).toBe(false);
    expect(result.data).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Network failure');
  });

  it('takes only the most recent auction per term', async () => {
    mockFetchOk([
      // Two 4-Week auctions, sorted by -auction_date
      makeBillRecord('4-Week', '2026-03-03', '4.220'),
      makeBillRecord('4-Week', '2026-02-24', '4.100'),
    ]);

    const result = await scrapeUSTreasury();

    const bill4wEntries = result.data.filter((r) => r.term === '4-week');
    expect(bill4wEntries).toHaveLength(1);
    expect(bill4wEntries[0].yield).toBe(4.22);
    expect(bill4wEntries[0].lastAuctionDate).toBe('2026-03-03');
  });
});
