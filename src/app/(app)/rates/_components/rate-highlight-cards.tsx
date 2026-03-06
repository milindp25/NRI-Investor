'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPercent } from '@/lib/utils';
import type { BankFDRate, USCDRate, USHYSARate } from '@/types';

interface BestRate {
  institution: string;
  rate: number;
  tenure?: string;
}

function findBestNREFD(rates: BankFDRate[]): BestRate | null {
  const nreRates = rates.filter((r) => r.accountType === 'NRE');
  let best: BestRate | null = null;

  for (const bank of nreRates) {
    for (const t of bank.tenures) {
      if (!best || t.rate > best.rate) {
        best = {
          institution: bank.institution,
          rate: t.rate,
          tenure: `${t.months}mo`,
        };
      }
    }
  }

  return best;
}

function findBestUSCD(rates: USCDRate[]): BestRate | null {
  let best: BestRate | null = null;

  for (const cd of rates) {
    for (const t of cd.tenures) {
      if (!best || t.apy > best.rate) {
        best = {
          institution: cd.institution,
          rate: t.apy,
          tenure: `${t.months}mo`,
        };
      }
    }
  }

  return best;
}

function findBestHYSA(rates: USHYSARate[]): BestRate | null {
  let best: BestRate | null = null;

  for (const hysa of rates) {
    if (!best || hysa.apy > best.rate) {
      best = {
        institution: hysa.institution,
        rate: hysa.apy,
      };
    }
  }

  return best;
}

interface RateHighlightCardsProps {
  indiaFDRates?: BankFDRate[];
  usCDRates?: USCDRate[];
  usHYSARates?: USHYSARate[];
  isLoading: boolean;
}

export function RateHighlightCards({
  indiaFDRates,
  usCDRates,
  usHYSARates,
  isLoading,
}: RateHighlightCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="mt-2 h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const bestNRE = indiaFDRates ? findBestNREFD(indiaFDRates) : null;
  const bestCD = usCDRates ? findBestUSCD(usCDRates) : null;
  const bestHYSA = usHYSARates ? findBestHYSA(usHYSARates) : null;

  const allRates = [bestNRE?.rate ?? 0, bestCD?.rate ?? 0, bestHYSA?.rate ?? 0];
  const highestRate = Math.max(...allRates);

  const cards = [
    {
      title: 'Best India NRE FD',
      data: bestNRE,
      label: bestNRE?.tenure ? `${bestNRE.tenure} tenure` : undefined,
    },
    {
      title: 'Best US CD',
      data: bestCD,
      label: bestCD?.tenure ? `${bestCD.tenure} tenure` : undefined,
    },
    {
      title: 'Best US HYSA',
      data: bestHYSA,
      label: undefined,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const isHighest = card.data && card.data.rate === highestRate && highestRate > 0;

        return (
          <div
            key={card.title}
            className={isHighest ? 'premium-card-highlight p-5' : 'premium-card p-5'}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {card.title}
              </span>
              {isHighest && <span className="rating-best">Best</span>}
            </div>
            <p className="text-sm text-muted-foreground mb-3">{card.data?.institution ?? 'N/A'}</p>
            <div
              className={`font-serif text-3xl font-bold ${
                isHighest ? 'gold-gradient-text' : 'text-foreground'
              }`}
            >
              {card.data ? formatPercent(card.data.rate) : '--'}
            </div>
            {card.label && <p className="mt-1 text-xs text-muted-foreground">{card.label}</p>}
          </div>
        );
      })}
    </div>
  );
}
