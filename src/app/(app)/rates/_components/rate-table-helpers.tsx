'use client';

import { Badge } from '@/components/ui/badge';
import { formatPercent } from '@/lib/utils';

/**
 * Finds the best (highest) rate for a given tenure across an array of items
 * that have a `tenures` array with { months, rate } or { months, apy }.
 */
export function findBestInTenure<
  T extends { tenures: Array<{ months: number; rate?: number; apy?: number }> },
>(items: T[], months: number): number {
  let best = -Infinity;
  for (const item of items) {
    const tenure = item.tenures.find((t) => t.months === months);
    const value = tenure ? (tenure.rate ?? tenure.apy ?? 0) : 0;
    if (value > best) best = value;
  }
  return best === -Infinity ? 0 : best;
}

/**
 * Renders a rate value with an optional "Best" badge if it matches the best rate.
 */
export function RateCell({ value, bestValue }: { value: number | undefined; bestValue: number }) {
  if (value === undefined) {
    return <span className="text-muted-foreground">--</span>;
  }

  const isBest = value > 0 && value === bestValue;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={isBest ? 'font-semibold text-green-600 dark:text-green-400' : ''}>
        {formatPercent(value)}
      </span>
      {isBest && <Badge className="bg-green-600 text-white hover:bg-green-600">Best</Badge>}
    </span>
  );
}

/**
 * Gets a rate value for a given tenure from an array of tenure rates.
 */
export function getTenureRate(
  tenures: Array<{ months: number; rate?: number; apy?: number }>,
  months: number,
): number | undefined {
  const tenure = tenures.find((t) => t.months === months);
  if (!tenure) return undefined;
  return tenure.rate ?? tenure.apy;
}
