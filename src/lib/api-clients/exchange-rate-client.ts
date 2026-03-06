import type { ExchangeRate, ExchangeRateHistory } from '@/types';
import { env } from '@/lib/env';

const BASE_URL = env.EXCHANGE_RATE_API_URL;

export async function getLatestRate(
  base: string = 'USD',
  target: string = 'INR',
): Promise<ExchangeRate> {
  const res = await fetch(`${BASE_URL}/v1/latest?base=${base}&symbols=${target}`, {
    next: { revalidate: 3600 }, // Cache for 1 hour
  });

  if (!res.ok) {
    throw new Error(`Exchange rate API error: ${res.status}`);
  }

  const data: { date: string; rates: Record<string, number> } = await res.json();

  return {
    baseCurrency: base,
    targetCurrency: target,
    rate: data.rates[target],
    date: data.date,
    source: 'frankfurter',
  };
}

export async function getHistoricalRates(
  base: string = 'USD',
  target: string = 'INR',
  period: '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' = '1Y',
): Promise<ExchangeRateHistory> {
  const now = new Date();
  const periodMap: Record<string, number> = {
    '1M': 30,
    '3M': 90,
    '6M': 180,
    '1Y': 365,
    '3Y': 1095,
    '5Y': 1825,
  };

  const startDate = new Date(now.getTime() - periodMap[period] * 86400000);
  const start = startDate.toISOString().split('T')[0];
  const end = now.toISOString().split('T')[0];

  const res = await fetch(`${BASE_URL}/v1/${start}..${end}?base=${base}&symbols=${target}`, {
    next: { revalidate: 86400 }, // Cache for 24 hours
  });

  if (!res.ok) {
    throw new Error(`Exchange rate history API error: ${res.status}`);
  }

  const data: { rates: Record<string, Record<string, number>> } = await res.json();

  const rates = Object.entries(data.rates).map(([date, rateObj]) => ({
    date,
    rate: rateObj[target],
  }));

  return { baseCurrency: base, targetCurrency: target, rates, period };
}
