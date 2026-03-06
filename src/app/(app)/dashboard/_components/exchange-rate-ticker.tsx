'use client';

import { useExchangeRate } from '@/lib/hooks/use-exchange-rate';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelativeTime } from '@/lib/utils';

export function ExchangeRateTicker() {
  const { rate, isLoading, error } = useExchangeRate('USD', 'INR');

  if (isLoading) {
    return <ExchangeRateTickerSkeleton />;
  }

  if (error || !rate) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-4">
          <p className="text-sm text-muted-foreground">
            Unable to fetch exchange rate. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-lg">
            $
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">USD to INR Exchange Rate</p>
            <p className="text-2xl font-bold tracking-tight">
              1 USD ={' '}
              <span className="text-primary">
                {'\u20B9'}
                {rate.rate.toFixed(2)}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {rate.source === 'frankfurter' ? 'ECB' : rate.source.toUpperCase()}
          </Badge>
          <span className="text-xs text-muted-foreground">{formatRelativeTime(rate.date)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ExchangeRateTickerSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-7 w-56" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}
