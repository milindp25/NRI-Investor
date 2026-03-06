'use client';

import useSWR from 'swr';
import type { ExchangeRate, ExchangeRateHistory } from '@/types';

async function fetcher<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`API error: ${r.status}`);
  const json = (await r.json()) as { data: T };
  return json.data;
}

export function useExchangeRate(base: string = 'USD', target: string = 'INR') {
  const { data, error, isLoading } = useSWR<ExchangeRate>(
    [`/api/exchange-rate`, base, target] as const,
    ([url, b, t]) => fetcher<ExchangeRate>(`${url}?base=${b}&target=${t}`),
    { refreshInterval: 3600000 }, // Refresh every hour
  );

  return { rate: data, error, isLoading };
}

export function useExchangeRateHistory(
  base: string = 'USD',
  target: string = 'INR',
  period: '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' = '1Y',
) {
  const { data, error, isLoading } = useSWR<ExchangeRateHistory>(
    [`/api/exchange-rate`, base, target, period] as const,
    ([url, b, t, p]) => fetcher<ExchangeRateHistory>(`${url}?base=${b}&target=${t}&history=${p}`),
    { refreshInterval: 86400000 }, // Refresh every 24 hours
  );

  return { history: data, error, isLoading };
}
