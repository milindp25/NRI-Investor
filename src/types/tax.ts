import type { SupportedCountry } from './country';

export interface DTAARate {
  country: SupportedCountry;
  interestIncome: { withDTAA: number; withoutDTAA: number };
  dividendIncome: { withDTAA: number; withoutDTAA: number };
  capitalGains: {
    shortTerm: { withDTAA: number; withoutDTAA: number };
    longTerm: { withDTAA: number; withoutDTAA: number };
  };
  rentalIncome: { withDTAA: number; withoutDTAA: number };
}

export type IncomeType =
  | 'interest'
  | 'dividend'
  | 'capital-gains-st'
  | 'capital-gains-lt'
  | 'rental'
  | 'salary';

export interface TaxCalculationInput {
  residenceCountry: SupportedCountry;
  incomeType: IncomeType;
  grossIncome: number;
  applyDTAA: boolean;
  hasTRC: boolean;
  accountType?: 'NRE' | 'NRO';
}

export interface TaxCalculationResult {
  grossIncome: number;
  tdsInIndia: number;
  tdsRate: number;
  dtaaBenefit: number;
  netTaxInIndia: number;
  estimatedTaxAbroad: number;
  foreignTaxCredit: number;
  totalEffectiveTax: number;
  effectiveTaxRate: number;
  recommendations: string[];
}

export interface NROvsNREComparison {
  scenario: string;
  nreAdvantages: string[];
  nroAdvantages: string[];
  nreEffectiveReturn: number;
  nroEffectiveReturn: number;
  recommendation: 'NRE' | 'NRO' | 'both';
  explanation: string;
}
