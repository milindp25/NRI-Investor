// Default TDS rates for NRIs in India (without DTAA)
export const DEFAULT_TDS_RATES = {
  interestNRO: 30, // 30% + surcharge + cess
  interestNRE: 0, // Tax-free
  dividends: 20,
  capitalGainsShortTerm: 30, // for equity: 15%, for debt: slab rate
  capitalGainsLongTerm: 20, // with indexation for debt, 10% for equity > 1L
  rentalIncome: 30,
} as const;

// FEMA repatriation limits
export const FEMA_LIMITS = {
  nroRepatriationPerYear: 1_000_000, // USD 1 million per financial year
  nreFullyRepatriable: true,
} as const;
