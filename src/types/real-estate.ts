export interface PropertyInput {
  region: 'india' | 'abroad';
  city: string;
  propertyType: 'apartment' | 'house' | 'commercial' | 'plot';
  purchasePrice: number;
  registrationAndStampDuty: number;
  annualRentalIncome: number;
  annualMaintenanceCost: number;
  annualPropertyTax: number;
  expectedAppreciationPercent: number;
  holdingPeriodYears: number;
  loanAmountPercent: number;
  loanInterestRate: number;
  loanTenureYears: number;
  isNRI: boolean;
}

export interface PropertyResult {
  totalInvestment: number;
  grossRentalYield: number;
  netRentalYield: number;
  totalAppreciation: number;
  estimatedSaleValue: number;
  capitalGainsTax: number;
  totalROI: number;
  annualizedROI: number;
  repatriableAmount: number;
  repatriationTax: number;
  cashFlowProjection: Array<{
    year: number;
    rental: number;
    emiPayment: number;
    netCashFlow: number;
    propertyValue: number;
  }>;
}
