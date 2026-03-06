import type { FixedDepositInput, FixedDepositResult, ExchangeRate, ForexAssumption } from '@/types';
import { DEFAULT_TDS_RATES } from '@/lib/constants/tax-rates';

/**
 * Calculate compound interest FD maturity.
 * Formula: A = P * (1 + r/n)^(n*t)
 * where P = principal, r = annual rate, n = compounding frequency per year, t = time in years
 */
export function calculateFDMaturity(input: FixedDepositInput): {
  maturityAmount: number;
  totalInterest: number;
} {
  const { principal, interestRateAnnual, tenureMonths, compoundingFrequency } = input;
  const rate = interestRateAnnual / 100;
  const years = tenureMonths / 12;

  const compoundingMap: Record<string, number> = {
    monthly: 12,
    quarterly: 4,
    'half-yearly': 2,
    yearly: 1,
  };
  const n = compoundingMap[compoundingFrequency];
  const maturityAmount = principal * Math.pow(1 + rate / n, n * years);
  const totalInterest = maturityAmount - principal;

  return { maturityAmount, totalInterest };
}

/**
 * Calculate effective yield after tax for an NRI FD.
 * - NRE FDs: Tax-free in India
 * - NRO FDs: 30% TDS (or DTAA rate if applicable)
 */
export function calculateAfterTaxReturn(
  input: FixedDepositInput,
  maturityResult: { maturityAmount: number; totalInterest: number },
  dtaaRate?: number,
): {
  taxDeducted: number;
  tdsRate: number;
  dtaaBenefit: number;
  netInterest: number;
  netMaturityAmount: number;
  effectiveYield: number;
} {
  const { principal, tenureMonths, accountType } = input;
  const { totalInterest } = maturityResult;
  const years = tenureMonths / 12;

  // NRE FDs are tax-free in India
  if (accountType === 'NRE' || input.isTaxFree) {
    return {
      taxDeducted: 0,
      tdsRate: 0,
      dtaaBenefit: 0,
      netInterest: totalInterest,
      netMaturityAmount: principal + totalInterest,
      effectiveYield: (Math.pow((principal + totalInterest) / principal, 1 / years) - 1) * 100,
    };
  }

  // NRO or regular: apply TDS
  const defaultTDS = DEFAULT_TDS_RATES.interestNRO / 100;
  const applicableTDS = dtaaRate !== undefined ? dtaaRate / 100 : defaultTDS;
  const taxDeducted = totalInterest * applicableTDS;
  const dtaaBenefit = dtaaRate !== undefined ? totalInterest * (defaultTDS - applicableTDS) : 0;
  const netInterest = totalInterest - taxDeducted;
  const netMaturityAmount = principal + netInterest;
  const effectiveYield = (Math.pow(netMaturityAmount / principal, 1 / years) - 1) * 100;

  return {
    taxDeducted,
    tdsRate: applicableTDS * 100,
    dtaaBenefit: Math.max(0, dtaaBenefit),
    netInterest,
    netMaturityAmount,
    effectiveYield,
  };
}

/**
 * Adjust returns for currency exchange rate changes.
 * If investing in India from USD perspective, the effective return is:
 * (1 + investmentReturn) * (1 + forexChange) - 1
 *
 * If INR depreciates by X% per year against USD, the forex change is negative
 * for India investments (investor loses on conversion back to USD).
 */
export function adjustForForex(
  effectiveYield: number,
  tenureMonths: number,
  forexAssumption: ForexAssumption,
): number {
  const years = tenureMonths / 12;
  // annualAppreciationRate: positive means INR appreciates vs USD (good for India investor)
  // negative means INR depreciates vs USD (bad for India investor)
  const annualForexChange = forexAssumption.annualAppreciationRate / 100;
  const hedgingCost = forexAssumption.hedgingCostPercent / 100;

  // Compound both investment growth and forex impact over the tenure
  const investmentGrowth = Math.pow(1 + effectiveYield / 100, years);
  const forexImpact = Math.pow(1 + annualForexChange, years);
  const totalGrowth = investmentGrowth * forexImpact;

  // Annualize the combined growth
  const annualizedReturn = (Math.pow(totalGrowth, 1 / years) - 1) * 100;

  // Subtract hedging cost if applicable
  return annualizedReturn - hedgingCost * 100;
}

/**
 * Full FD comparison: calculate result for a single FD investment.
 */
export function calculateFDResult(
  input: FixedDepositInput,
  exchangeRate: ExchangeRate,
  forexAssumption: ForexAssumption,
  dtaaRate?: number,
): FixedDepositResult {
  const maturityResult = calculateFDMaturity(input);
  const afterTax = calculateAfterTaxReturn(input, maturityResult, dtaaRate);

  // Only apply forex adjustment for India FDs (converting back to home currency)
  const effectiveYieldAfterForex =
    input.region === 'india'
      ? adjustForForex(afterTax.effectiveYield, input.tenureMonths, forexAssumption)
      : afterTax.effectiveYield; // No forex adjustment for "abroad" (already in home currency)

  // Convert maturity amount to preferred currency (USD)
  // exchangeRate.rate is USD->INR, so divide INR amount by rate to get USD
  const maturityAmountInPreferredCurrency =
    input.region === 'india'
      ? afterTax.netMaturityAmount / exchangeRate.rate
      : afterTax.netMaturityAmount;

  return {
    maturityAmount: afterTax.netMaturityAmount,
    totalInterest: afterTax.netInterest,
    effectiveYield: afterTax.effectiveYield,
    maturityAmountInPreferredCurrency,
    effectiveYieldAfterForex,
    taxDeducted: afterTax.taxDeducted,
    tdsRate: afterTax.tdsRate,
    dtaaBenefit: afterTax.dtaaBenefit,
  };
}
