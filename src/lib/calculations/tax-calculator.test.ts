import { describe, it, expect } from 'vitest';
import { getDTAARate, calculateTax, compareNROvsNRE } from './tax-calculator';
import type { TaxCalculationInput } from '@/types';

function makeTaxInput(overrides: Partial<TaxCalculationInput> = {}): TaxCalculationInput {
  return {
    residenceCountry: 'US',
    incomeType: 'interest',
    grossIncome: 100_000,
    applyDTAA: true,
    hasTRC: true,
    accountType: 'NRO',
    ...overrides,
  };
}

describe('getDTAARate', () => {
  it('returns DTAA rate for US interest income', () => {
    const result = getDTAARate('US', 'interest', true);
    expect(result.rate).toBe(15);
    expect(result.dtaaBenefit).toBe(15); // 30 - 15
  });

  it('returns default rate when DTAA not applied', () => {
    const result = getDTAARate('US', 'interest', false);
    expect(result.rate).toBe(30);
    expect(result.dtaaBenefit).toBe(0);
  });

  it('returns Germany interest rate at 10%', () => {
    const result = getDTAARate('DE', 'interest', true);
    expect(result.rate).toBe(10);
    expect(result.dtaaBenefit).toBe(20); // 30 - 10
  });

  it('returns UAE interest rate at 12.5%', () => {
    const result = getDTAARate('AE', 'interest', true);
    expect(result.rate).toBe(12.5);
    expect(result.dtaaBenefit).toBe(17.5); // 30 - 12.5
  });

  it('returns default rate for dividends (US DTAA is higher)', () => {
    // US dividend DTAA rate is 25%, default is 20%, so default is better
    const result = getDTAARate('US', 'dividend', true);
    expect(result.rate).toBe(20); // min(25, 20) = 20
    expect(result.dtaaBenefit).toBe(0);
  });

  it('returns UK dividend DTAA rate of 15%', () => {
    const result = getDTAARate('UK', 'dividend', true);
    expect(result.rate).toBe(15);
    expect(result.dtaaBenefit).toBe(5); // 20 - 15
  });

  it('returns same rate for capital gains (no DTAA benefit)', () => {
    const result = getDTAARate('US', 'capital-gains-st', true);
    expect(result.rate).toBe(30);
    expect(result.dtaaBenefit).toBe(0);
  });

  it('returns default for salary (no DTAA TDS reduction)', () => {
    const result = getDTAARate('US', 'salary', true);
    expect(result.rate).toBe(30);
    expect(result.dtaaBenefit).toBe(0);
  });

  it('returns default rate for rental income (no DTAA benefit)', () => {
    const result = getDTAARate('US', 'rental', true);
    expect(result.rate).toBe(30);
    expect(result.dtaaBenefit).toBe(0);
  });
});

describe('calculateTax', () => {
  it('calculates NRE interest as tax-free', () => {
    const result = calculateTax(makeTaxInput({ accountType: 'NRE' }));
    expect(result.tdsInIndia).toBe(0);
    expect(result.tdsRate).toBe(0);
    expect(result.effectiveTaxRate).toBe(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('calculates NRO interest with DTAA for US resident', () => {
    const result = calculateTax(
      makeTaxInput({
        grossIncome: 100_000,
        accountType: 'NRO',
      }),
    );
    expect(result.tdsRate).toBe(15); // US DTAA rate
    expect(result.tdsInIndia).toBe(15_000); // 15% of 100,000
    expect(result.dtaaBenefit).toBe(15_000); // saved 15% (30-15)
  });

  it('calculates NRO interest without DTAA', () => {
    const result = calculateTax(
      makeTaxInput({
        applyDTAA: false,
        grossIncome: 100_000,
      }),
    );
    expect(result.tdsRate).toBe(30); // default rate
    expect(result.tdsInIndia).toBe(30_000);
    expect(result.dtaaBenefit).toBe(0);
  });

  it('does not apply DTAA without TRC', () => {
    const result = calculateTax(
      makeTaxInput({
        hasTRC: false,
        grossIncome: 100_000,
      }),
    );
    expect(result.tdsRate).toBe(30); // no DTAA without TRC
    expect(result.tdsInIndia).toBe(30_000);
  });

  it('calculates foreign tax credit correctly for US', () => {
    const result = calculateTax(
      makeTaxInput({
        grossIncome: 100_000,
      }),
    );
    // India TDS: 15,000 (15%)
    // US tax estimate: 24,000 (24%)
    // FTC: min(15000, 24000) = 15000
    expect(result.foreignTaxCredit).toBe(15_000);
    // Total effective: max(15000, 24000) = 24000
    expect(result.totalEffectiveTax).toBe(24_000);
    expect(result.effectiveTaxRate).toBe(24);
  });

  it('handles UAE with zero abroad tax', () => {
    const result = calculateTax(
      makeTaxInput({
        residenceCountry: 'AE',
        grossIncome: 100_000,
      }),
    );
    // AE DTAA rate: 12.5%
    expect(result.tdsRate).toBe(12.5);
    expect(result.tdsInIndia).toBe(12_500);
    // UAE has 0% tax
    expect(result.estimatedTaxAbroad).toBe(0);
    expect(result.foreignTaxCredit).toBe(0); // min(12500, 0) = 0
    // Total effective: max(12500, 0) = 12500
    expect(result.totalEffectiveTax).toBe(12_500);
  });

  it('handles Germany interest (10% DTAA)', () => {
    const result = calculateTax(
      makeTaxInput({
        residenceCountry: 'DE',
        grossIncome: 50_000,
      }),
    );
    expect(result.tdsRate).toBe(10);
    expect(result.tdsInIndia).toBe(5_000);
    expect(result.dtaaBenefit).toBe(10_000); // saved 20% of 50k
  });

  it('handles zero income', () => {
    const result = calculateTax(makeTaxInput({ grossIncome: 0 }));
    expect(result.tdsInIndia).toBe(0);
    expect(result.effectiveTaxRate).toBe(0);
  });

  it('generates recommendations for NRO with DTAA', () => {
    const result = calculateTax(makeTaxInput());
    expect(result.recommendations.some((r) => r.includes('DTAA'))).toBe(true);
  });

  it('recommends TRC when DTAA applied but no TRC', () => {
    const result = calculateTax(
      makeTaxInput({
        applyDTAA: true,
        hasTRC: false,
      }),
    );
    expect(result.recommendations.some((r) => r.includes('TRC'))).toBe(true);
  });
});

describe('compareNROvsNRE', () => {
  it('recommends NRE for US resident with significant rate difference', () => {
    const result = compareNROvsNRE('US', 70_000, 7, 12);
    expect(result.nreEffectiveReturn).toBe(7);
    // NRO: 7 * (1 - 0.15) = 5.95
    expect(result.nroEffectiveReturn).toBeCloseTo(5.95, 2);
    expect(result.recommendation).toBe('NRE');
  });

  it('shows correct effective returns for Germany', () => {
    const result = compareNROvsNRE('DE', 50_000, 7, 12);
    expect(result.nreEffectiveReturn).toBe(7);
    // NRO: 7 * (1 - 0.10) = 6.3
    expect(result.nroEffectiveReturn).toBeCloseTo(6.3, 2);
  });

  it('includes both advantages lists', () => {
    const result = compareNROvsNRE('US', 100_000, 7, 12);
    expect(result.nreAdvantages.length).toBeGreaterThan(0);
    expect(result.nroAdvantages.length).toBeGreaterThan(0);
  });

  it('generates scenario description', () => {
    const result = compareNROvsNRE('US', 100_000, 7.5, 24);
    expect(result.scenario).toContain('7.5%');
    expect(result.scenario).toContain('24 months');
    expect(result.scenario).toContain('US');
  });
});
