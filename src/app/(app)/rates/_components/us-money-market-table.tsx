'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPercent, formatRelativeTime, formatUSD } from '@/lib/utils';
import type { USMoneyMarketRate } from '@/types';

interface USMoneyMarketTableProps {
  rates: USMoneyMarketRate[];
  isLoading: boolean;
}

export function USMoneyMarketTable({ rates, isLoading }: USMoneyMarketTableProps) {
  if (isLoading) {
    return <MoneyMarketTableSkeleton />;
  }

  const sorted = [...rates].sort((a, b) => b.sevenDayYield - a.sevenDayYield);
  const bestYield = sorted.length > 0 ? sorted[0].sevenDayYield : 0;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fund</TableHead>
          <TableHead>Provider</TableHead>
          <TableHead className="text-right">7-Day Yield</TableHead>
          <TableHead className="text-right">Expense Ratio</TableHead>
          <TableHead className="text-right">Min Investment</TableHead>
          <TableHead className="text-right">Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              No money market rates available.
            </TableCell>
          </TableRow>
        ) : (
          sorted.map((mm) => {
            const isBest = mm.sevenDayYield === bestYield && bestYield > 0;

            return (
              <TableRow key={mm.fundId}>
                <TableCell className="font-medium">{mm.fund}</TableCell>
                <TableCell>{mm.provider}</TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={isBest ? 'font-semibold text-green-600 dark:text-green-400' : ''}
                    >
                      {formatPercent(mm.sevenDayYield)}
                    </span>
                    {isBest && (
                      <Badge className="bg-green-600 text-white hover:bg-green-600">Best</Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-right">{formatPercent(mm.expenseRatio)}</TableCell>
                <TableCell className="text-right">
                  {mm.minInvestment === 0 ? (
                    <span className="text-muted-foreground">None</span>
                  ) : (
                    formatUSD(mm.minInvestment)
                  )}
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-xs">
                  {formatRelativeTime(mm.lastUpdated)}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}

function MoneyMarketTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}
