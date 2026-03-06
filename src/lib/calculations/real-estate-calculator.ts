import type { PropertyInput, PropertyResult } from '@/types';
import { CAPITAL_GAINS_TAX } from '@/lib/constants/real-estate';

/**
 * Calculate EMI using standard reducing balance formula.
 * EMI = P * r * (1+r)^n / ((1+r)^n - 1)
 */
export function calculateEMI(
  loanAmount: number,
  annualRate: number,
  tenureYears: number,
): { emi: number; totalInterest: number; totalPayment: number } {
  if (loanAmount <= 0 || tenureYears <= 0) {
    return { emi: 0, totalInterest: 0, totalPayment: 0 };
  }
  if (annualRate <= 0) {
    const emi = loanAmount / (tenureYears * 12);
    return { emi, totalInterest: 0, totalPayment: loanAmount };
  }

  const monthlyRate = annualRate / 100 / 12;
  const totalMonths = tenureYears * 12;
  const emi =
    (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
    (Math.pow(1 + monthlyRate, totalMonths) - 1);
  const totalPayment = emi * totalMonths;
  const totalInterest = totalPayment - loanAmount;

  return { emi, totalInterest, totalPayment };
}

/**
 * Calculate gross and net rental yield.
 */
export function calculateRentalYield(input: PropertyInput): {
  grossYield: number;
  netYield: number;
} {
  const totalCost = input.purchasePrice + input.registrationAndStampDuty;
  const grossYield = totalCost > 0 ? (input.annualRentalIncome / totalCost) * 100 : 0;

  const netRental =
    input.annualRentalIncome - input.annualMaintenanceCost - input.annualPropertyTax;
  const netYield = totalCost > 0 ? (netRental / totalCost) * 100 : 0;

  return { grossYield, netYield };
}

/**
 * Calculate property appreciation and capital gains tax.
 */
export function calculateAppreciation(input: PropertyInput): {
  estimatedSaleValue: number;
  totalAppreciation: number;
  capitalGainsTax: number;
} {
  const estimatedSaleValue =
    input.purchasePrice *
    Math.pow(1 + input.expectedAppreciationPercent / 100, input.holdingPeriodYears);

  const totalAppreciation = estimatedSaleValue - input.purchasePrice;

  // Capital gains tax depends on holding period
  const isLongTerm = input.holdingPeriodYears >= CAPITAL_GAINS_TAX.shortTermHoldingThresholdYears;

  const taxRate = isLongTerm
    ? CAPITAL_GAINS_TAX.longTermWithIndexation
    : CAPITAL_GAINS_TAX.shortTermRate;

  // For long term, indexation reduces taxable gain (simplified ~70% of gain is taxable)
  const taxableGain = isLongTerm ? totalAppreciation * 0.7 : totalAppreciation;
  const capitalGainsTax = Math.max(0, taxableGain * (taxRate / 100));

  return { estimatedSaleValue, totalAppreciation, capitalGainsTax };
}

/**
 * Calculate FEMA repatriation for NRI property sale.
 */
export function calculateRepatriation(
  saleProceeds: number,
  capitalGainsTax: number,
  isNRI: boolean,
): { repatriableAmount: number; repatriationTax: number } {
  if (!isNRI) {
    return { repatriableAmount: saleProceeds - capitalGainsTax, repatriationTax: capitalGainsTax };
  }

  const netProceeds = saleProceeds - capitalGainsTax;
  // TCS on repatriation (simplified)
  const repatriationTax = capitalGainsTax;

  return {
    repatriableAmount: netProceeds,
    repatriationTax,
  };
}

/**
 * Generate year-by-year cash flow projection.
 */
export function generateCashFlowProjection(
  input: PropertyInput,
): PropertyResult['cashFlowProjection'] {
  const loanAmount = (input.purchasePrice * input.loanAmountPercent) / 100;
  const { emi } = calculateEMI(loanAmount, input.loanInterestRate, input.loanTenureYears);
  const annualEMI = emi * 12;

  const projection: PropertyResult['cashFlowProjection'] = [];

  for (let year = 1; year <= input.holdingPeriodYears; year++) {
    // Rental stays flat (simplified — could add annual increase)
    const rental = input.annualRentalIncome;

    // EMI stops after loan tenure
    const emiPayment = year <= input.loanTenureYears ? annualEMI : 0;

    const netCashFlow = rental - emiPayment - input.annualMaintenanceCost - input.annualPropertyTax;

    const propertyValue =
      input.purchasePrice * Math.pow(1 + input.expectedAppreciationPercent / 100, year);

    projection.push({
      year,
      rental,
      emiPayment,
      netCashFlow,
      propertyValue,
    });
  }

  return projection;
}

/**
 * Full property result calculation — composes all sub-calculations.
 */
export function calculatePropertyResult(input: PropertyInput): PropertyResult {
  const totalInvestment = input.purchasePrice + input.registrationAndStampDuty;

  const { grossYield, netYield } = calculateRentalYield(input);
  const { estimatedSaleValue, totalAppreciation, capitalGainsTax } = calculateAppreciation(input);
  const { repatriableAmount, repatriationTax } = calculateRepatriation(
    estimatedSaleValue,
    capitalGainsTax,
    input.isNRI,
  );

  // Total ROI: (sale value + total rental - total costs - tax) / investment
  const totalRental = input.annualRentalIncome * input.holdingPeriodYears;
  const totalCosts =
    (input.annualMaintenanceCost + input.annualPropertyTax) * input.holdingPeriodYears;

  // Loan costs
  const loanAmount = (input.purchasePrice * input.loanAmountPercent) / 100;
  const { totalInterest: loanInterest } = calculateEMI(
    loanAmount,
    input.loanInterestRate,
    input.loanTenureYears,
  );

  const netProfit =
    estimatedSaleValue +
    totalRental -
    totalInvestment -
    totalCosts -
    capitalGainsTax -
    loanInterest;

  const totalROI = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;
  const annualizedROI =
    input.holdingPeriodYears > 0
      ? (Math.pow(1 + totalROI / 100, 1 / input.holdingPeriodYears) - 1) * 100
      : 0;

  const cashFlowProjection = generateCashFlowProjection(input);

  return {
    totalInvestment,
    grossRentalYield: grossYield,
    netRentalYield: netYield,
    totalAppreciation,
    estimatedSaleValue,
    capitalGainsTax,
    totalROI,
    annualizedROI,
    repatriableAmount,
    repatriationTax,
    cashFlowProjection,
  };
}
