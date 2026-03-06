'use client';

import Link from 'next/link';
import { useComparisonStore } from '@/lib/stores/store-provider';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatPercent, formatRelativeTime } from '@/lib/utils';

export function RecentComparisons() {
  const savedComparisons = useComparisonStore((state) => state.savedComparisons);
  const clearAll = useComparisonStore((state) => state.clearAll);

  const recentComparisons = savedComparisons.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Comparisons</CardTitle>
        <CardDescription>Your saved comparison results</CardDescription>
        {recentComparisons.length > 0 && (
          <CardAction>
            <Button variant="ghost" size="xs" onClick={clearAll} className="text-muted-foreground">
              Clear All
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {recentComparisons.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-xl">
              {'\u2696\uFE0F'}
            </div>
            <div>
              <p className="text-sm font-medium">No comparisons yet</p>
              <p className="text-xs text-muted-foreground">
                Compare India vs US investments to see results here
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/compare/fixed-deposits">Start Comparing</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentComparisons.map((comparison, index) => (
              <div key={comparison.id}>
                {index > 0 && <Separator className="mb-3" />}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(comparison.timestamp)}
                    </span>
                    <Badge
                      variant={
                        comparison.summary.winner === 'india'
                          ? 'default'
                          : comparison.summary.winner === 'abroad'
                            ? 'secondary'
                            : 'outline'
                      }
                      className="text-xs"
                    >
                      {comparison.summary.winner === 'india'
                        ? 'India'
                        : comparison.summary.winner === 'abroad'
                          ? 'US'
                          : 'Tie'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>
                      India:{' '}
                      <span className="font-medium">
                        {formatPercent(comparison.indiaInvestment.result.effectiveYield)}
                      </span>
                    </span>
                    <span className="text-muted-foreground">vs</span>
                    <span>
                      US:{' '}
                      <span className="font-medium">
                        {formatPercent(comparison.abroadInvestment.result.effectiveYield)}
                      </span>
                    </span>
                  </div>
                  {comparison.summary.differencePercent !== 0 && (
                    <p className="text-xs text-muted-foreground">
                      Difference: {formatPercent(Math.abs(comparison.summary.differencePercent))}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {recentComparisons.length > 0 && (
        <CardFooter>
          <Button variant="link" size="sm" className="h-auto p-0" asChild>
            <Link href="/compare/fixed-deposits">Compare More &rarr;</Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
