import type { InvestmentCategory } from './investment';
import type { ExchangeRate, ForexAssumption } from './exchange-rate';

export interface ComparisonResult<TInput, TResult> {
  id: string;
  timestamp: string;
  category: InvestmentCategory;
  indiaInvestment: {
    input: TInput;
    result: TResult;
  };
  abroadInvestment: {
    input: TInput;
    result: TResult;
  };
  exchangeRateUsed: ExchangeRate;
  forexAssumption: ForexAssumption;
  summary: {
    winner: 'india' | 'abroad' | 'comparable';
    differencePercent: number;
    keyInsights: string[];
    caveats: string[];
  };
}
