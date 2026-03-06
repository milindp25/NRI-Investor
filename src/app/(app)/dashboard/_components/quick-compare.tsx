'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRates } from '@/lib/hooks/use-rates';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { formatPercent } from '@/lib/utils';
import type { BankFDRate, USCDRate } from '@/types';

function findBestNRERate(
  fdRates: BankFDRate[],
  tenureMonths: number,
): { institution: string; rate: number } | null {
  let best: { institution: string; rate: number } | null = null;
  for (const bank of fdRates) {
    if (bank.accountType !== 'NRE') continue;
    // Find the closest tenure
    const closestTenure = bank.tenures.reduce((prev, curr) =>
      Math.abs(curr.months - tenureMonths) < Math.abs(prev.months - tenureMonths) ? curr : prev,
    );
    if (!best || closestTenure.rate > best.rate) {
      best = {
        institution: bank.institution,
        rate: closestTenure.rate,
      };
    }
  }
  return best;
}

function findBestCDRate(
  cdRates: USCDRate[],
  tenureMonths: number,
): { institution: string; apy: number } | null {
  let best: { institution: string; apy: number } | null = null;
  for (const cd of cdRates) {
    // Find the closest tenure
    const closestTenure = cd.tenures.reduce((prev, curr) =>
      Math.abs(curr.months - tenureMonths) < Math.abs(prev.months - tenureMonths) ? curr : prev,
    );
    if (!best || closestTenure.apy > best.apy) {
      best = {
        institution: cd.institution,
        apy: closestTenure.apy,
      };
    }
  }
  return best;
}

export function QuickCompare() {
  const { rates, isLoading, error } = useRates();
  const [amount, setAmount] = useState(1000000);
  const [tenure, setTenure] = useState(12);

  const comparison = useMemo(() => {
    if (!rates) return null;

    const bestNRE = findBestNRERate(rates.indiaFDRates, tenure);
    const bestCD = findBestCDRate(rates.usCDRates, tenure);

    if (!bestNRE || !bestCD) return null;

    const diff = bestNRE.rate - bestCD.apy;
    const winner =
      diff > 0.5 ? ('india' as const) : diff < -0.5 ? ('us' as const) : ('comparable' as const);

    return {
      indiaRate: bestNRE.rate,
      indiaInstitution: bestNRE.institution,
      usRate: bestCD.apy,
      usInstitution: bestCD.institution,
      diff,
      winner,
    };
  }, [rates, tenure]);

  if (isLoading) {
    return <QuickCompareSkeleton />;
  }

  if (error || !rates) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quick Compare</CardTitle>
          <CardDescription>Compare India NRE FD vs US CD</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Unable to load rate data for comparison.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Compare</CardTitle>
        <CardDescription>India NRE FD vs US CD at a glance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Amount ({'\u20B9'})</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={10000}
              step={100000}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tenure (months)</label>
            <Input
              type="number"
              value={tenure}
              onChange={(e) => setTenure(Number(e.target.value))}
              min={3}
              max={120}
              step={3}
            />
          </div>
        </div>

        <Separator />

        {comparison ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground">India NRE FD</p>
                <p className="text-lg font-bold">{formatPercent(comparison.indiaRate)}</p>
                <p className="text-xs text-muted-foreground">{comparison.indiaInstitution}</p>
              </div>
              <div className="px-3 text-muted-foreground">vs</div>
              <div className="space-y-0.5 text-right">
                <p className="text-xs font-medium text-muted-foreground">US CD</p>
                <p className="text-lg font-bold">{formatPercent(comparison.usRate)}</p>
                <p className="text-xs text-muted-foreground">{comparison.usInstitution}</p>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <Badge
                variant={
                  comparison.winner === 'india'
                    ? 'default'
                    : comparison.winner === 'us'
                      ? 'secondary'
                      : 'outline'
                }
                className="text-xs"
              >
                {comparison.winner === 'india'
                  ? `India FD wins (+${formatPercent(comparison.diff)})`
                  : comparison.winner === 'us'
                    ? `US CD wins (+${formatPercent(Math.abs(comparison.diff))})`
                    : 'Rates are comparable'}
              </Badge>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            No rates available for comparison
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="link" size="sm" className="h-auto p-0" asChild>
          <Link href="/compare/fixed-deposits">Detailed Comparison &rarr;</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function QuickCompareSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
        <Skeleton className="h-px w-full" />
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-6" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="flex justify-center">
          <Skeleton className="h-5 w-32 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}
