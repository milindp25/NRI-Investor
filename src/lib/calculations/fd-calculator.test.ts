import { describe, it, expect } from 'vitest';
import {
  calculateFDMaturity,
  calculateAfterTaxReturn,
  adjustForForex,
  calculateFDResult,
} from './fd-calculator';
import type { FixedDepositInput, ExchangeRate, ForexAssumption } from '@/types';

// ---------------------------------------------------------------------------
// Helpers to build inputs concisely
// ---------------------------------------------------------------------------

function makeInput(overrides: Partial<FixedDepositInput> = {}): FixedDepositInput {
  return {
    region: 'india',
    principal: 1000000,
    interestRateAnnual: 7,
    tenureMonths: 12,
    compoundingFrequency: 'quarterly',
    accountType: 'NRE',
    ...overrides,
  };
}

function makeExchangeRate(rate = 83): ExchangeRate {
  return {
    baseCurrency: 'USD',
    targetCurrency: 'INR',
    rate,
    date: '2025-01-01',
    source: 'manual',
  };
}

function makeForex(overrides: Partial<ForexAssumption> = {}): ForexAssumption {
  return {
    annualAppreciationRate: 0,
    hedgingCostPercent: 0,
    useHistoricalAverage: false,
    ...overrides,
  };
}

// ===========================================================================
// 1. Basic Compound Interest (calculateFDMaturity)
// ===========================================================================

describe('calculateFDMaturity – basic compound interest', () => {
  it('₹10,00,000 at 7% for 12 months, quarterly compounding', () => {
    const input = makeInput({
      principal: 1000000,
      interestRateAnnual: 7,
      tenureMonths: 12,
      compoundingFrequency: 'quarterly',
    });
    const result = calculateFDMaturity(input);

    // A = 10,00,000 * (1 + 0.07/4)^(4*1) = 10,00,000 * (1.0175)^4
    // (1.0175)^4 = 1.071859... → A ≈ 10,71,859
    expect(result.maturityAmount).toBeCloseTo(1071859.0, -1);
    expect(result.totalInterest).toBeCloseTo(71859.0, -1);
  });

  it('₹5,00,000 at 6.5% for 24 months, monthly compounding', () => {
    const input = makeInput({
      principal: 500000,
      interestRateAnnual: 6.5,
      tenureMonths: 24,
      compoundingFrequency: 'monthly',
    });
    const result = calculateFDMaturity(input);

    // A = 5,00,000 * (1 + 0.065/12)^(12*2)
    const expected = 500000 * Math.pow(1 + 0.065 / 12, 24);
    expect(result.maturityAmount).toBeCloseTo(expected, 2);
    expect(result.totalInterest).toBeCloseTo(expected - 500000, 2);
  });

  it('₹1,00,000 at 8% for 60 months, yearly compounding', () => {
    const input = makeInput({
      principal: 100000,
      interestRateAnnual: 8,
      tenureMonths: 60,
      compoundingFrequency: 'yearly',
    });
    const result = calculateFDMaturity(input);

    // A = 1,00,000 * (1.08)^5
    const expected = 100000 * Math.pow(1.08, 5);
    expect(result.maturityAmount).toBeCloseTo(expected, 2);
    expect(result.totalInterest).toBeCloseTo(expected - 100000, 2);
  });

  it('half-yearly compounding ₹2,00,000 at 7.5% for 36 months', () => {
    const input = makeInput({
      principal: 200000,
      interestRateAnnual: 7.5,
      tenureMonths: 36,
      compoundingFrequency: 'half-yearly',
    });
    const result = calculateFDMaturity(input);

    // A = 2,00,000 * (1 + 0.075/2)^(2*3) = 200000 * (1.0375)^6
    const expected = 200000 * Math.pow(1 + 0.075 / 2, 6);
    expect(result.maturityAmount).toBeCloseTo(expected, 2);
  });
});

// ===========================================================================
// 2. NRE vs NRO Tax Treatment (calculateAfterTaxReturn)
// ===========================================================================

describe('calculateAfterTaxReturn – NRE vs NRO tax treatment', () => {
  it('NRE FD: zero tax deducted, full interest returned', () => {
    const input = makeInput({
      accountType: 'NRE',
      principal: 1000000,
      interestRateAnnual: 7,
      tenureMonths: 12,
      compoundingFrequency: 'quarterly',
    });
    const maturity = calculateFDMaturity(input);
    const afterTax = calculateAfterTaxReturn(input, maturity);

    expect(afterTax.taxDeducted).toBe(0);
    expect(afterTax.tdsRate).toBe(0);
    expect(afterTax.dtaaBenefit).toBe(0);
    expect(afterTax.netInterest).toBeCloseTo(maturity.totalInterest, 2);
    expect(afterTax.netMaturityAmount).toBeCloseTo(maturity.maturityAmount, 2);
    // effectiveYield for 1-year tenure should match the nominal rate approximately
    expect(afterTax.effectiveYield).toBeGreaterThan(0);
  });

  it('NRO FD: 30% TDS applied on interest', () => {
    const input = makeInput({
      accountType: 'NRO',
      principal: 1000000,
      interestRateAnnual: 7,
      tenureMonths: 12,
      compoundingFrequency: 'quarterly',
    });
    const maturity = calculateFDMaturity(input);
    const afterTax = calculateAfterTaxReturn(input, maturity);

    const expectedTax = maturity.totalInterest * 0.3;
    const expectedNetInterest = maturity.totalInterest - expectedTax;

    expect(afterTax.tdsRate).toBe(30);
    expect(afterTax.taxDeducted).toBeCloseTo(expectedTax, 2);
    expect(afterTax.netInterest).toBeCloseTo(expectedNetInterest, 2);
    expect(afterTax.netMaturityAmount).toBeCloseTo(1000000 + expectedNetInterest, 2);
    expect(afterTax.dtaaBenefit).toBe(0);
  });

  it('NRO FD with DTAA rate 15%: reduced TDS and DTAA benefit', () => {
    const input = makeInput({
      accountType: 'NRO',
      principal: 1000000,
      interestRateAnnual: 7,
      tenureMonths: 12,
      compoundingFrequency: 'quarterly',
    });
    const maturity = calculateFDMaturity(input);
    const dtaaRate = 15;
    const afterTax = calculateAfterTaxReturn(input, maturity, dtaaRate);

    const expectedTax = maturity.totalInterest * 0.15;
    const expectedBenefit = maturity.totalInterest * (0.3 - 0.15);
    const expectedNetInterest = maturity.totalInterest - expectedTax;

    expect(afterTax.tdsRate).toBe(15);
    expect(afterTax.taxDeducted).toBeCloseTo(expectedTax, 2);
    expect(afterTax.dtaaBenefit).toBeCloseTo(expectedBenefit, 2);
    expect(afterTax.netInterest).toBeCloseTo(expectedNetInterest, 2);
    expect(afterTax.netMaturityAmount).toBeCloseTo(1000000 + expectedNetInterest, 2);
  });

  it('isTaxFree flag overrides NRO to tax-free', () => {
    const input = makeInput({
      accountType: 'NRO',
      isTaxFree: true,
      principal: 500000,
      interestRateAnnual: 6,
      tenureMonths: 12,
      compoundingFrequency: 'quarterly',
    });
    const maturity = calculateFDMaturity(input);
    const afterTax = calculateAfterTaxReturn(input, maturity);

    expect(afterTax.taxDeducted).toBe(0);
    expect(afterTax.tdsRate).toBe(0);
    expect(afterTax.netInterest).toBeCloseTo(maturity.totalInterest, 2);
  });
});

// ===========================================================================
// 3. Forex Adjustment (adjustForForex)
// ===========================================================================

describe('adjustForForex – currency impact on effective yield', () => {
  it('INR depreciation (-3%) reduces effective yield', () => {
    const preForexYield = 7.0; // 7% effective yield
    const tenureMonths = 12;
    const forex = makeForex({ annualAppreciationRate: -3 });

    const adjusted = adjustForForex(preForexYield, tenureMonths, forex);

    // (1.07) * (0.97) - 1 = 1.0379 - 1 = 0.0379 => 3.79%
    const expected = (1.07 * 0.97 - 1) * 100;
    expect(adjusted).toBeCloseTo(expected, 2);
    expect(adjusted).toBeLessThan(preForexYield);
  });

  it('INR appreciation (+2%) increases effective yield', () => {
    const preForexYield = 7.0;
    const tenureMonths = 12;
    const forex = makeForex({ annualAppreciationRate: 2 });

    const adjusted = adjustForForex(preForexYield, tenureMonths, forex);

    // (1.07) * (1.02) - 1 = 1.0914 - 1 = 0.0914 => 9.14%
    const expected = (1.07 * 1.02 - 1) * 100;
    expect(adjusted).toBeCloseTo(expected, 2);
    expect(adjusted).toBeGreaterThan(preForexYield);
  });

  it('0% forex change: effective yield equals pre-forex yield', () => {
    const preForexYield = 7.0;
    const tenureMonths = 12;
    const forex = makeForex({ annualAppreciationRate: 0 });

    const adjusted = adjustForForex(preForexYield, tenureMonths, forex);
    expect(adjusted).toBeCloseTo(preForexYield, 6);
  });

  it('hedging cost reduces effective yield', () => {
    const preForexYield = 7.0;
    const tenureMonths = 12;
    const forex = makeForex({
      annualAppreciationRate: 0,
      hedgingCostPercent: 1.5,
    });

    const adjusted = adjustForForex(preForexYield, tenureMonths, forex);
    // With 0% forex change: yield stays at 7%, minus 1.5% hedging = 5.5%
    expect(adjusted).toBeCloseTo(7.0 - 1.5, 6);
  });

  it('multi-year tenure compounds forex impact correctly', () => {
    const preForexYield = 7.0;
    const tenureMonths = 24; // 2 years
    const forex = makeForex({ annualAppreciationRate: -3 });

    const adjusted = adjustForForex(preForexYield, tenureMonths, forex);

    // investmentGrowth = (1.07)^2, forexImpact = (0.97)^2
    // totalGrowth = (1.07)^2 * (0.97)^2
    // annualizedReturn = (totalGrowth^(1/2) - 1) * 100
    // = ((1.07 * 0.97) - 1) * 100 = 3.79%
    const investmentGrowth = Math.pow(1.07, 2);
    const forexImpact = Math.pow(0.97, 2);
    const totalGrowth = investmentGrowth * forexImpact;
    const expected = (Math.pow(totalGrowth, 1 / 2) - 1) * 100;
    expect(adjusted).toBeCloseTo(expected, 4);
  });
});

// ===========================================================================
// 4. Full Comparison (calculateFDResult)
// ===========================================================================

describe('calculateFDResult – full FD comparison', () => {
  const exchangeRate = makeExchangeRate(83);
  const forexNeutral = makeForex({ annualAppreciationRate: 0 });

  it('NRE FD result: tax-free, with forex adjustment and currency conversion', () => {
    const input = makeInput({
      region: 'india',
      accountType: 'NRE',
      principal: 1000000,
      interestRateAnnual: 7,
      tenureMonths: 12,
      compoundingFrequency: 'quarterly',
    });
    const forexWithDepreciation = makeForex({ annualAppreciationRate: -3 });
    const result = calculateFDResult(input, exchangeRate, forexWithDepreciation);

    // Tax should be zero for NRE
    expect(result.taxDeducted).toBe(0);
    expect(result.tdsRate).toBe(0);

    // Maturity should be the full compound interest amount (no tax deduction)
    const maturity = calculateFDMaturity(input);
    expect(result.maturityAmount).toBeCloseTo(maturity.maturityAmount, 2);
    expect(result.totalInterest).toBeCloseTo(maturity.totalInterest, 2);

    // Currency conversion: INR maturity / 83 = USD equivalent
    expect(result.maturityAmountInPreferredCurrency).toBeCloseTo(maturity.maturityAmount / 83, 2);

    // Forex adjustment should be applied (India FD)
    expect(result.effectiveYieldAfterForex).toBeLessThan(result.effectiveYield);
  });

  it('NRO FD with DTAA vs US CD: verifies tax, conversion, and forex', () => {
    const indiaInput = makeInput({
      region: 'india',
      accountType: 'NRO',
      principal: 1000000,
      interestRateAnnual: 7,
      tenureMonths: 12,
      compoundingFrequency: 'quarterly',
    });
    const dtaaRate = 15;
    const indiaResult = calculateFDResult(indiaInput, exchangeRate, forexNeutral, dtaaRate);

    // Should have 15% TDS
    expect(indiaResult.tdsRate).toBe(15);
    expect(indiaResult.dtaaBenefit).toBeGreaterThan(0);

    // US CD comparison (no tax, no forex)
    const usInput = makeInput({
      region: 'abroad',
      accountType: 'regular',
      principal: 12048.19, // ~₹10L / 83
      interestRateAnnual: 5,
      tenureMonths: 12,
      compoundingFrequency: 'monthly',
      isTaxFree: true,
    });
    const usResult = calculateFDResult(usInput, exchangeRate, forexNeutral);

    // US FD should have no forex adjustment
    expect(usResult.effectiveYieldAfterForex).toBeCloseTo(usResult.effectiveYield, 6);

    // US FD maturity in preferred currency should equal maturity (already in USD)
    expect(usResult.maturityAmountInPreferredCurrency).toBeCloseTo(usResult.maturityAmount, 2);
  });

  it('currency conversion is correct (INR to USD using exchange rate)', () => {
    const input = makeInput({
      region: 'india',
      accountType: 'NRE',
      principal: 830000, // exactly 10000 USD at rate 83
      interestRateAnnual: 7,
      tenureMonths: 12,
      compoundingFrequency: 'quarterly',
    });
    const result = calculateFDResult(input, exchangeRate, forexNeutral);

    // Verify the conversion: maturityAmount / 83 = maturityAmountInPreferredCurrency
    expect(result.maturityAmountInPreferredCurrency).toBeCloseTo(result.maturityAmount / 83, 2);
  });

  it('abroad FD has no forex adjustment applied', () => {
    const input = makeInput({
      region: 'abroad',
      accountType: 'regular',
      isTaxFree: true,
      principal: 10000,
      interestRateAnnual: 5,
      tenureMonths: 12,
      compoundingFrequency: 'monthly',
    });
    const forexWithDepreciation = makeForex({ annualAppreciationRate: -3 });
    const result = calculateFDResult(input, exchangeRate, forexWithDepreciation);

    // Even with forex assumption, abroad FD should not be adjusted
    expect(result.effectiveYieldAfterForex).toBeCloseTo(result.effectiveYield, 6);
  });
});

// ===========================================================================
// 5. Edge Cases
// ===========================================================================

describe('Edge cases', () => {
  it('zero interest rate: maturity equals principal', () => {
    const input = makeInput({
      principal: 500000,
      interestRateAnnual: 0,
      tenureMonths: 12,
      compoundingFrequency: 'quarterly',
    });
    const result = calculateFDMaturity(input);

    expect(result.maturityAmount).toBe(500000);
    expect(result.totalInterest).toBe(0);
  });

  it('very short tenure: 1 month', () => {
    const input = makeInput({
      principal: 1000000,
      interestRateAnnual: 7,
      tenureMonths: 1,
      compoundingFrequency: 'monthly',
    });
    const result = calculateFDMaturity(input);

    // A = 10,00,000 * (1 + 0.07/12)^(12 * 1/12) = 10,00,000 * (1.005833...)^1
    const expected = 1000000 * (1 + 0.07 / 12);
    expect(result.maturityAmount).toBeCloseTo(expected, 2);
    expect(result.totalInterest).toBeCloseTo(expected - 1000000, 2);
  });

  it('very long tenure: 120 months (10 years)', () => {
    const input = makeInput({
      principal: 1000000,
      interestRateAnnual: 7,
      tenureMonths: 120,
      compoundingFrequency: 'quarterly',
    });
    const result = calculateFDMaturity(input);

    // A = 10,00,000 * (1 + 0.07/4)^(4*10) = 10,00,000 * (1.0175)^40
    const expected = 1000000 * Math.pow(1.0175, 40);
    expect(result.maturityAmount).toBeCloseTo(expected, 2);
    expect(result.totalInterest).toBeCloseTo(expected - 1000000, 2);
    // 10 years at 7% quarterly should roughly double
    expect(result.maturityAmount).toBeGreaterThan(1900000);
  });

  it('zero interest rate on NRO does not produce NaN effective yield', () => {
    const input = makeInput({
      accountType: 'NRO',
      principal: 1000000,
      interestRateAnnual: 0,
      tenureMonths: 12,
      compoundingFrequency: 'quarterly',
    });
    const maturity = calculateFDMaturity(input);
    const afterTax = calculateAfterTaxReturn(input, maturity);

    expect(afterTax.taxDeducted).toBe(0);
    expect(afterTax.netInterest).toBe(0);
    expect(afterTax.effectiveYield).toBe(0);
    expect(Number.isNaN(afterTax.effectiveYield)).toBe(false);
  });

  it('NRE effectiveYield for multi-year tenure is annualized correctly', () => {
    const input = makeInput({
      accountType: 'NRE',
      principal: 100000,
      interestRateAnnual: 8,
      tenureMonths: 60,
      compoundingFrequency: 'yearly',
    });
    const maturity = calculateFDMaturity(input);
    const afterTax = calculateAfterTaxReturn(input, maturity);

    // For yearly compounding, effective yield should be exactly 8% (annually)
    // because (1.08)^5 / principal, annualized back = 8%
    expect(afterTax.effectiveYield).toBeCloseTo(8.0, 4);
  });
});
