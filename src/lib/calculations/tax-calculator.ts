import type {
  SupportedCountry,
  IncomeType,
  DTAARate,
  TaxCalculationInput,
  TaxCalculationResult,
  NROvsNREComparison,
} from '@/types';
import { DEFAULT_TDS_RATES } from '@/lib/constants/tax-rates';
import treatyRatesData from '@/data/dtaa/treaty-rates.json';

const treatyRates = treatyRatesData as (DTAARate & { notes: string })[];

/**
 * Get the default TDS rate (without DTAA) for a given income type.
 */
function getDefaultTDSRate(incomeType: IncomeType): number {
  switch (incomeType) {
    case 'interest':
      return DEFAULT_TDS_RATES.interestNRO;
    case 'dividend':
      return DEFAULT_TDS_RATES.dividends;
    case 'capital-gains-st':
      return DEFAULT_TDS_RATES.capitalGainsShortTerm;
    case 'capital-gains-lt':
      return DEFAULT_TDS_RATES.capitalGainsLongTerm;
    case 'rental':
      return DEFAULT_TDS_RATES.rentalIncome;
    case 'salary':
      return 30; // slab rate, simplified
    default:
      return 30;
  }
}

/**
 * Get the applicable DTAA rate for a given country and income type.
 * Returns both the applicable rate and the benefit (savings).
 */
export function getDTAARate(
  country: SupportedCountry,
  incomeType: IncomeType,
  applyDTAA: boolean,
): { rate: number; dtaaBenefit: number; notes: string } {
  const treaty = treatyRates.find((t) => t.country === country);
  const defaultRate = getDefaultTDSRate(incomeType);

  if (!treaty || !applyDTAA) {
    return { rate: defaultRate, dtaaBenefit: 0, notes: '' };
  }

  let dtaaRate: number;
  switch (incomeType) {
    case 'interest':
      dtaaRate = treaty.interestIncome.withDTAA;
      break;
    case 'dividend':
      dtaaRate = treaty.dividendIncome.withDTAA;
      break;
    case 'capital-gains-st':
      dtaaRate = treaty.capitalGains.shortTerm.withDTAA;
      break;
    case 'capital-gains-lt':
      dtaaRate = treaty.capitalGains.longTerm.withDTAA;
      break;
    case 'rental':
      dtaaRate = treaty.rentalIncome.withDTAA;
      break;
    case 'salary':
      // Salary is taxed at slab rate, DTAA doesn't directly reduce TDS
      return {
        rate: defaultRate,
        dtaaBenefit: 0,
        notes:
          'Salary income is taxed at slab rates. DTAA provides relief through foreign tax credit, not TDS reduction.',
      };
    default:
      return { rate: defaultRate, dtaaBenefit: 0, notes: '' };
  }

  // DTAA rate should only be applied if it's beneficial (lower than default)
  const applicableRate = Math.min(dtaaRate, defaultRate);
  const benefit = defaultRate - applicableRate;

  return {
    rate: applicableRate,
    dtaaBenefit: benefit,
    notes: treaty.notes,
  };
}

/**
 * Calculate tax for NRI income in India.
 * Handles TDS, DTAA benefits, and foreign tax credit estimation.
 */
export function calculateTax(input: TaxCalculationInput): TaxCalculationResult {
  const { residenceCountry, incomeType, grossIncome, applyDTAA, hasTRC, accountType } = input;

  // NRE interest income is tax-free
  if (accountType === 'NRE' && incomeType === 'interest') {
    return {
      grossIncome,
      tdsInIndia: 0,
      tdsRate: 0,
      dtaaBenefit: 0,
      netTaxInIndia: 0,
      estimatedTaxAbroad: 0,
      foreignTaxCredit: 0,
      totalEffectiveTax: 0,
      effectiveTaxRate: 0,
      recommendations: [
        'NRE FD interest is completely tax-free in India.',
        'However, this income may still be taxable in your country of residence.',
        'NRE accounts are ideal for parking foreign earnings in India.',
      ],
    };
  }

  // Get applicable rate
  const dtaaApplicable = applyDTAA && hasTRC;
  const { rate: tdsRate, dtaaBenefit: rateBenefit } = getDTAARate(
    residenceCountry,
    incomeType,
    dtaaApplicable,
  );

  // Calculate TDS in India
  const tdsInIndia = grossIncome * (tdsRate / 100);
  const dtaaBenefit = grossIncome * (rateBenefit / 100);

  // Estimate tax in residence country (simplified — uses a flat assumed rate)
  // In reality, this depends on the person's total global income and local tax brackets
  const abroadTaxRateEstimate = getEstimatedAbroadTaxRate(residenceCountry);
  const estimatedTaxAbroad = grossIncome * (abroadTaxRateEstimate / 100);

  // Foreign Tax Credit: tax paid in India can be credited against abroad tax
  const foreignTaxCredit = Math.min(tdsInIndia, estimatedTaxAbroad);

  // Effective total tax = max of India tax or abroad tax (due to credit mechanism)
  const totalEffectiveTax = Math.max(tdsInIndia, estimatedTaxAbroad);
  const effectiveTaxRate = grossIncome > 0 ? (totalEffectiveTax / grossIncome) * 100 : 0;

  // Generate recommendations
  const recommendations = generateRecommendations(
    input,
    tdsRate,
    dtaaApplicable,
    rateBenefit,
    foreignTaxCredit,
    abroadTaxRateEstimate,
  );

  return {
    grossIncome,
    tdsInIndia,
    tdsRate,
    dtaaBenefit,
    netTaxInIndia: tdsInIndia,
    estimatedTaxAbroad,
    foreignTaxCredit,
    totalEffectiveTax,
    effectiveTaxRate,
    recommendations,
  };
}

/**
 * Estimated tax rate for residence country (simplified).
 * In production, this would use the user's settings store tax bracket.
 */
function getEstimatedAbroadTaxRate(country: SupportedCountry): number {
  const rates: Record<SupportedCountry, number> = {
    US: 24, // federal marginal rate for ~$100k income
    UK: 20, // basic rate
    CA: 26, // combined federal + provincial
    AU: 32.5, // 2nd bracket
    SG: 7, // relatively low tax
    AE: 0, // no personal income tax
    DE: 30, // combined rate
  };
  return rates[country];
}

function generateRecommendations(
  input: TaxCalculationInput,
  tdsRate: number,
  dtaaApplied: boolean,
  rateBenefit: number,
  foreignTaxCredit: number,
  abroadTaxRate: number,
): string[] {
  const recs: string[] = [];

  if (dtaaApplied && rateBenefit > 0) {
    recs.push(
      `DTAA with ${input.residenceCountry} reduces TDS from ${getDefaultTDSRate(input.incomeType)}% to ${tdsRate}%, saving ${rateBenefit}% on your income.`,
    );
  }

  if (!dtaaApplied && !input.hasTRC) {
    recs.push(
      'Obtain a Tax Residency Certificate (TRC) from your country of residence to claim DTAA benefits.',
    );
  }

  if (!dtaaApplied && input.applyDTAA && !input.hasTRC) {
    recs.push('DTAA benefits require a valid TRC. Without it, default TDS rates apply.');
  }

  if (foreignTaxCredit > 0) {
    recs.push(
      `You can claim a Foreign Tax Credit of up to ${foreignTaxCredit.toFixed(0)} in your ${input.residenceCountry} tax return for taxes paid in India.`,
    );
  }

  if (input.residenceCountry === 'AE') {
    recs.push(
      'UAE has no personal income tax. Tax paid in India cannot be credited, making DTAA rate reduction especially important.',
    );
  }

  if (input.accountType === 'NRO' && input.incomeType === 'interest') {
    recs.push(
      'Consider NRE FD for foreign earnings — interest is tax-free in India. NRO is only needed for India-sourced income.',
    );
  }

  if (abroadTaxRate > tdsRate) {
    recs.push(
      `Your residence country tax rate (${abroadTaxRate}%) is higher than India TDS (${tdsRate}%). You may owe additional tax abroad after the foreign tax credit.`,
    );
  }

  return recs;
}

/**
 * Compare NRO vs NRE for a given investment scenario.
 */
export function compareNROvsNRE(
  residenceCountry: SupportedCountry,
  grossInterest: number,
  interestRate: number,
  tenureMonths: number,
): NROvsNREComparison {
  // NRE: tax-free in India
  const nreEffectiveReturn = interestRate;

  // NRO: apply TDS (with DTAA if available)
  const { rate: nroTDSRate } = getDTAARate(residenceCountry, 'interest', true);
  const nroEffectiveReturn = interestRate * (1 - nroTDSRate / 100);

  const nreAdvantages = [
    'Interest is 100% tax-free in India',
    'Fully repatriable (principal + interest)',
    'No TDS deduction',
    'Ideal for parking foreign earnings',
  ];

  const nroAdvantages = [
    'Can hold India-sourced income (rent, dividends, pension)',
    'No restriction on source of funds',
    `TDS reduced to ${nroTDSRate}% under DTAA (from 30%)`,
    'Can repatriate up to $1M per financial year',
  ];

  const returnDiff = nreEffectiveReturn - nroEffectiveReturn;
  let recommendation: 'NRE' | 'NRO' | 'both';
  let explanation: string;

  if (returnDiff > 1) {
    recommendation = 'NRE';
    explanation = `NRE offers ${returnDiff.toFixed(2)}% higher effective return due to tax-free interest. Use NRE for foreign earnings and NRO only for India-sourced income.`;
  } else if (returnDiff > 0) {
    recommendation = 'both';
    explanation = `NRE is slightly better for returns (${returnDiff.toFixed(2)}% higher), but you may need NRO for India-sourced income. Maintain both accounts based on income source.`;
  } else {
    recommendation = 'both';
    explanation =
      'Maintain both accounts. Use NRE for foreign earnings (tax-free) and NRO for India-sourced income.';
  }

  return {
    scenario: `${interestRate}% FD for ${tenureMonths} months, ${residenceCountry} resident`,
    nreAdvantages,
    nroAdvantages,
    nreEffectiveReturn,
    nroEffectiveReturn,
    recommendation,
    explanation,
  };
}
