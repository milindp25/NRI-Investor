export type InvestmentCategory = 'fixed-deposit' | 'mutual-fund' | 'bond' | 'real-estate';
export type InvestmentRegion = 'india' | 'abroad';

export interface FixedDepositInput {
  region: InvestmentRegion;
  bankName?: string;
  principal: number;
  interestRateAnnual: number;
  tenureMonths: number;
  compoundingFrequency: 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
  accountType?: 'NRE' | 'NRO' | 'regular';
  isTaxFree?: boolean;
}

export interface FixedDepositResult {
  maturityAmount: number;
  totalInterest: number;
  effectiveYield: number;
  maturityAmountInPreferredCurrency: number;
  effectiveYieldAfterForex: number;
  taxDeducted: number;
  tdsRate: number;
  dtaaBenefit: number;
}

export interface MutualFundInput {
  region: InvestmentRegion;
  schemeName?: string;
  schemeCode?: string;
  investmentType: 'lumpsum' | 'sip';
  amount: number;
  expectedReturnPercent: number;
  tenureYears: number;
  expenseRatio: number;
  exitLoadPercent: number;
  taxRateOnGains: number;
}

export interface MutualFundResult {
  totalInvested: number;
  estimatedCorpus: number;
  totalGain: number;
  xirr: number;
  postTaxCorpus: number;
  postTaxXirr: number;
  inPreferredCurrency: number;
  effectiveReturnAfterForex: number;
}

export interface BondInput {
  region: InvestmentRegion;
  bondType: 'government' | 'corporate' | 'tax-free';
  faceValue: number;
  couponRate: number;
  currentPrice: number;
  tenureYears: number;
  taxRate: number;
}

export interface BondResult {
  yieldToMaturity: number;
  currentYield: number;
  totalReturn: number;
  postTaxYield: number;
  inPreferredCurrency: number;
}
