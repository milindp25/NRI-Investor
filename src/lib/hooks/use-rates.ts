'use client';

import useSWR from 'swr';
import type { RateDirectory } from '@/types';

async function fetcher<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`API error: ${r.status}`);
  const json = (await r.json()) as { data: T };
  return json.data;
}

export function useRates() {
  const { data, error, isLoading } = useSWR<RateDirectory>(
    '/api/rates',
    fetcher<RateDirectory>,
    { refreshInterval: 3600000 }, // Refresh every hour
  );

  return { rates: data, error, isLoading };
}
