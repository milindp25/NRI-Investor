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
import { formatPercent, formatRelativeTime } from '@/lib/utils';
import type { USTreasuryRate } from '@/types';

interface USTreasuryTableProps {
  rates: USTreasuryRate[];
  isLoading: boolean;
}

export function USTreasuryTable({ rates, isLoading }: USTreasuryTableProps) {
  if (isLoading) {
    return <TreasuryTableSkeleton />;
  }

  const sorted = [...rates].sort((a, b) => b.yield - a.yield);
  const bestYield = sorted.length > 0 ? sorted[0].yield : 0;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Term</TableHead>
          <TableHead className="text-right">Yield</TableHead>
          <TableHead className="text-right">Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground">
              No treasury rates available.
            </TableCell>
          </TableRow>
        ) : (
          sorted.map((t) => {
            const isBest = t.yield === bestYield && bestYield > 0;

            return (
              <TableRow key={`${t.type}-${t.term}`}>
                <TableCell>
                  <Badge variant="outline">{t.type}</Badge>
                </TableCell>
                <TableCell className="font-medium">{t.term}</TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={isBest ? 'font-semibold text-green-600 dark:text-green-400' : ''}
                    >
                      {formatPercent(t.yield)}
                    </span>
                    {isBest && (
                      <Badge className="bg-green-600 text-white hover:bg-green-600">Best</Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-xs">
                  {formatRelativeTime(t.lastUpdated)}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}

function TreasuryTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}
