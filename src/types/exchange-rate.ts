export interface ExchangeRate {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  date: string;
  source: 'frankfurter' | 'rbi' | 'manual';
}

export interface ExchangeRateHistory {
  baseCurrency: string;
  targetCurrency: string;
  rates: Array<{ date: string; rate: number }>;
  period: '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y';
}

export interface ForexAssumption {
  annualAppreciationRate: number;
  hedgingCostPercent: number;
  useHistoricalAverage: boolean;
}
