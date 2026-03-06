import { describe, it, expect } from 'vitest';
import {
  calculateEMI,
  calculateRentalYield,
  calculateAppreciation,
  calculateRepatriation,
  generateCashFlowProjection,
  calculatePropertyResult,
} from './real-estate-calculator';
import type { PropertyInput } from '@/types';

function makeInput(overrides: Partial<PropertyInput> = {}): PropertyInput {
  return {
    region: 'india',
    city: 'Mumbai',
    propertyType: 'apartment',
    purchasePrice: 10_000_000, // 1 crore
    registrationAndStampDuty: 600_000, // 6%
    annualRentalIncome: 360_000, // 30k/month
    annualMaintenanceCost: 60_000,
    annualPropertyTax: 12_000,
    expectedAppreciationPercent: 5,
    holdingPeriodYears: 10,
    loanAmountPercent: 70,
    loanInterestRate: 8.5,
    loanTenureYears: 20,
    isNRI: true,
    ...overrides,
  };
}

describe('calculateEMI', () => {
  it('calculates EMI for standard home loan', () => {
    // 70L loan at 8.5% for 20 years
    const result = calculateEMI(7_000_000, 8.5, 20);
    // Expected EMI ~60,700
    expect(result.emi).toBeCloseTo(60_748, -1);
    expect(result.totalPayment).toBeGreaterThan(7_000_000);
    expect(result.totalInterest).toBeGreaterThan(0);
  });

  it('returns zero for zero loan', () => {
    const result = calculateEMI(0, 8.5, 20);
    expect(result.emi).toBe(0);
    expect(result.totalInterest).toBe(0);
  });

  it('handles zero interest rate', () => {
    const result = calculateEMI(1_200_000, 0, 10);
    expect(result.emi).toBe(10_000); // 12L / 120 months
    expect(result.totalInterest).toBe(0);
  });

  it('handles short tenure', () => {
    const result = calculateEMI(1_000_000, 10, 1);
    expect(result.emi).toBeGreaterThan(80_000);
    expect(result.totalPayment).toBeGreaterThan(1_000_000);
  });
});

describe('calculateRentalYield', () => {
  it('calculates gross and net yield correctly', () => {
    const input = makeInput();
    const result = calculateRentalYield(input);
    // Gross: 360000 / (10000000 + 600000) * 100 = ~3.4%
    expect(result.grossYield).toBeCloseTo(3.396, 1);
    // Net: (360000 - 60000 - 12000) / 10600000 * 100 = ~2.72%
    expect(result.netYield).toBeCloseTo(2.717, 1);
  });

  it('returns zero for zero purchase price', () => {
    const input = makeInput({ purchasePrice: 0, registrationAndStampDuty: 0 });
    const result = calculateRentalYield(input);
    expect(result.grossYield).toBe(0);
  });

  it('handles zero rental', () => {
    const input = makeInput({ annualRentalIncome: 0 });
    const result = calculateRentalYield(input);
    expect(result.grossYield).toBe(0);
    expect(result.netYield).toBeLessThan(0);
  });
});

describe('calculateAppreciation', () => {
  it('calculates 10-year appreciation at 5%', () => {
    const input = makeInput();
    const result = calculateAppreciation(input);
    // 1cr * (1.05)^10 = ~1.6289cr
    expect(result.estimatedSaleValue).toBeCloseTo(16_288_946, -3);
    expect(result.totalAppreciation).toBeCloseTo(6_288_946, -3);
  });

  it('applies long-term capital gains for >2 years', () => {
    const input = makeInput({ holdingPeriodYears: 5 });
    const result = calculateAppreciation(input);
    expect(result.capitalGainsTax).toBeGreaterThan(0);
    // Long term: 20% on ~70% of gain
    const expectedGain = input.purchasePrice * (Math.pow(1.05, 5) - 1);
    const expectedTax = expectedGain * 0.7 * 0.2;
    expect(result.capitalGainsTax).toBeCloseTo(expectedTax, -2);
  });

  it('applies short-term capital gains for <2 years', () => {
    const input = makeInput({ holdingPeriodYears: 1 });
    const result = calculateAppreciation(input);
    // Short term: 30% on full gain
    const expectedGain = input.purchasePrice * 0.05;
    const expectedTax = expectedGain * 0.3;
    expect(result.capitalGainsTax).toBeCloseTo(expectedTax, -2);
  });

  it('handles zero appreciation', () => {
    const input = makeInput({ expectedAppreciationPercent: 0 });
    const result = calculateAppreciation(input);
    expect(result.estimatedSaleValue).toBe(input.purchasePrice);
    expect(result.totalAppreciation).toBe(0);
    expect(result.capitalGainsTax).toBe(0);
  });
});

describe('calculateRepatriation', () => {
  it('calculates repatriable amount for NRI', () => {
    const result = calculateRepatriation(15_000_000, 500_000, true);
    expect(result.repatriableAmount).toBe(14_500_000);
    expect(result.repatriationTax).toBe(500_000);
  });

  it('calculates for non-NRI', () => {
    const result = calculateRepatriation(15_000_000, 500_000, false);
    expect(result.repatriableAmount).toBe(14_500_000);
  });
});

describe('generateCashFlowProjection', () => {
  it('generates correct number of years', () => {
    const input = makeInput();
    const result = generateCashFlowProjection(input);
    expect(result).toHaveLength(10);
  });

  it('has correct year numbering', () => {
    const input = makeInput({ holdingPeriodYears: 5 });
    const result = generateCashFlowProjection(input);
    expect(result[0].year).toBe(1);
    expect(result[4].year).toBe(5);
  });

  it('shows increasing property values', () => {
    const input = makeInput();
    const result = generateCashFlowProjection(input);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].propertyValue).toBeGreaterThan(result[i - 1].propertyValue);
    }
  });

  it('stops EMI after loan tenure', () => {
    const input = makeInput({ loanTenureYears: 5, holdingPeriodYears: 10 });
    const result = generateCashFlowProjection(input);
    expect(result[4].emiPayment).toBeGreaterThan(0); // year 5
    expect(result[5].emiPayment).toBe(0); // year 6
  });

  it('has zero EMI when no loan', () => {
    const input = makeInput({ loanAmountPercent: 0 });
    const result = generateCashFlowProjection(input);
    expect(result[0].emiPayment).toBe(0);
  });
});

describe('calculatePropertyResult', () => {
  it('computes full result', () => {
    const input = makeInput();
    const result = calculatePropertyResult(input);

    expect(result.totalInvestment).toBe(10_600_000);
    expect(result.grossRentalYield).toBeGreaterThan(0);
    expect(result.netRentalYield).toBeGreaterThan(0);
    expect(result.estimatedSaleValue).toBeGreaterThan(input.purchasePrice);
    expect(result.totalROI).toBeGreaterThan(0);
    expect(result.annualizedROI).toBeGreaterThan(0);
    expect(result.cashFlowProjection).toHaveLength(10);
  });

  it('handles plot with no rental', () => {
    const input = makeInput({
      propertyType: 'plot',
      annualRentalIncome: 0,
      annualMaintenanceCost: 0,
      annualPropertyTax: 5_000,
      loanAmountPercent: 0,
    });
    const result = calculatePropertyResult(input);
    expect(result.grossRentalYield).toBe(0);
    expect(result.totalROI).toBeGreaterThan(0); // from appreciation
  });

  it('shows repatriation for NRI', () => {
    const input = makeInput({ isNRI: true });
    const result = calculatePropertyResult(input);
    expect(result.repatriableAmount).toBeGreaterThan(0);
    expect(result.repatriationTax).toBeGreaterThan(0);
  });
});
