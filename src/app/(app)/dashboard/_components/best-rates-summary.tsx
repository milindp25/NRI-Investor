'use client';

import Link from 'next/link';
import { useRates } from '@/lib/hooks/use-rates';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardAction,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPercent } from '@/lib/utils';
import type { BankFDRate, USCDRate, USHYSARate } from '@/types';

interface BestNREFD {
  institution: string;
  rate: number;
  tenureMonths: number;
}

interface BestUSCD {
  institution: string;
  apy: number;
  tenureMonths: number;
}

interface BestUSHYSA {
  institution: string;
  apy: number;
}

function findBestNREFD(fdRates: BankFDRate[]): BestNREFD | null {
  let best: BestNREFD | null = null;
  for (const bank of fdRates) {
    if (bank.accountType !== 'NRE') continue;
    for (const tenure of bank.tenures) {
      if (!best || tenure.rate > best.rate) {
        best = {
          institution: bank.institution,
          rate: tenure.rate,
          tenureMonths: tenure.months,
        };
      }
    }
  }
  return best;
}

function findBestUSCD(cdRates: USCDRate[]): BestUSCD | null {
  let best: BestUSCD | null = null;
  for (const cd of cdRates) {
    for (const tenure of cd.tenures) {
      if (!best || tenure.apy > best.apy) {
        best = {
          institution: cd.institution,
          apy: tenure.apy,
          tenureMonths: tenure.months,
        };
      }
    }
  }
  return best;
}

function findBestUSHYSA(hysaRates: USHYSARate[]): BestUSHYSA | null {
  let best: BestUSHYSA | null = null;
  for (const hysa of hysaRates) {
    if (!best || hysa.apy > best.apy) {
      best = {
        institution: hysa.institution,
        apy: hysa.apy,
      };
    }
  }
  return best;
}

function formatTenure(months: number): string {
  if (months < 12) return `${months} months`;
  const years = months / 12;
  if (years === 1) return '1 year';
  if (Number.isInteger(years)) return `${years} years`;
  return `${months} months`;
}

export function BestRatesSummary() {
  const { rates, isLoading, error } = useRates();

  if (isLoading) {
    return <BestRatesSummarySkeleton />;
  }

  if (error || !rates) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Unable to load rates</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const bestNREFD = findBestNREFD(rates.indiaFDRates);
  const bestUSCD = findBestUSCD(rates.usCDRates);
  const bestUSHYSA = findBestUSHYSA(rates.usHYSARates);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Best India NRE FD */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Best India NRE FD
          </CardTitle>
          <CardAction>
            <Badge variant="secondary">India</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          {bestNREFD ? (
            <div className="space-y-1">
              <p className="text-3xl font-bold text-primary">{formatPercent(bestNREFD.rate)}</p>
              <p className="text-sm font-medium">{bestNREFD.institution}</p>
              <p className="text-xs text-muted-foreground">
                {formatTenure(bestNREFD.tenureMonths)} tenure
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data available</p>
          )}
        </CardContent>
        <CardFooter>
          <Button variant="link" size="sm" className="h-auto p-0" asChild>
            <Link href="/rates">View All &rarr;</Link>
          </Button>
        </CardFooter>
      </Card>

      {/* Best US CD */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Best US CD</CardTitle>
          <CardAction>
            <Badge variant="secondary">US</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          {bestUSCD ? (
            <div className="space-y-1">
              <p className="text-3xl font-bold text-primary">{formatPercent(bestUSCD.apy)}</p>
              <p className="text-sm font-medium">{bestUSCD.institution}</p>
              <p className="text-xs text-muted-foreground">
                {formatTenure(bestUSCD.tenureMonths)} tenure
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data available</p>
          )}
        </CardContent>
        <CardFooter>
          <Button variant="link" size="sm" className="h-auto p-0" asChild>
            <Link href="/rates">View All &rarr;</Link>
          </Button>
        </CardFooter>
      </Card>

      {/* Best US HYSA */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Best US HYSA</CardTitle>
          <CardAction>
            <Badge variant="secondary">US</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          {bestUSHYSA ? (
            <div className="space-y-1">
              <p className="text-3xl font-bold text-primary">{formatPercent(bestUSHYSA.apy)}</p>
              <p className="text-sm font-medium">{bestUSHYSA.institution}</p>
              <p className="text-xs text-muted-foreground">No lock-in period</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data available</p>
          )}
        </CardContent>
        <CardFooter>
          <Button variant="link" size="sm" className="h-auto p-0" asChild>
            <Link href="/rates">View All &rarr;</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function BestRatesSummarySkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-4 w-16" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
