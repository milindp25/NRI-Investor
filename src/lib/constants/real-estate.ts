export const STAMP_DUTY_RATES: Record<string, number> = {
  maharashtra: 6,
  karnataka: 5.6,
  delhi: 6,
  'tamil-nadu': 7,
  telangana: 7.5,
  'west-bengal': 7,
  gujarat: 4.9,
  rajasthan: 6,
  'uttar-pradesh': 7,
  kerala: 8,
} as const;

export const CAPITAL_GAINS_TAX = {
  shortTermHoldingThresholdYears: 2,
  shortTermRate: 30,
  longTermWithIndexation: 20,
  longTermWithoutIndexation: 12.5,
  surchargeAndCess: 4, // approximate cess
} as const;

export const FEMA_PROPERTY_RULES = {
  maxResidentialProperties: 2,
  nroRepatriationLimitUSD: 1_000_000,
  nreFullyRepatriable: true,
  agriculturalLandAllowed: false,
  maxPropertyPurchasesPerYear: 'No limit for residential/commercial',
} as const;

export const DEFAULT_PROPERTY_ASSUMPTIONS = {
  annualRentalAppreciation: 5,
  annualPropertyTaxIncrease: 3,
  annualMaintenanceIncrease: 5,
  vacancyRatePercent: 8.33, // ~1 month vacant per year
} as const;
