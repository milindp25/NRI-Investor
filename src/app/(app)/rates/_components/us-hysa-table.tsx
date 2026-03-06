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
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPercent, formatRelativeTime, formatUSD } from '@/lib/utils';
import type { USHYSARate } from '@/types';

interface USHYSATableProps {
  rates: USHYSARate[];
  isLoading: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}

export function USHYSATable({ rates, isLoading, selectedIds, onToggleSelect }: USHYSATableProps) {
  if (isLoading) {
    return <HYSATableSkeleton />;
  }

  const sorted = [...rates].sort((a, b) => b.apy - a.apy);
  const bestAPY = sorted.length > 0 ? sorted[0].apy : 0;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10"></TableHead>
          <TableHead>Institution</TableHead>
          <TableHead className="text-right">APY</TableHead>
          <TableHead className="text-right">Min Balance</TableHead>
          <TableHead>FDIC</TableHead>
          <TableHead className="text-right">Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              No HYSA rates available.
            </TableCell>
          </TableRow>
        ) : (
          sorted.map((hysa) => {
            const rowId = `hysa-${hysa.institutionId}`;
            const isSelected = selectedIds.has(rowId);
            const isBest = hysa.apy === bestAPY && bestAPY > 0;

            return (
              <TableRow key={rowId} data-state={isSelected ? 'selected' : undefined}>
                <TableCell>
                  <Button
                    variant={isSelected ? 'default' : 'outline'}
                    size="xs"
                    onClick={() => onToggleSelect(rowId)}
                    aria-label={
                      isSelected
                        ? `Remove ${hysa.institution} from comparison`
                        : `Add ${hysa.institution} to comparison`
                    }
                  >
                    {isSelected ? 'Added' : 'Add'}
                  </Button>
                </TableCell>
                <TableCell className="font-medium">{hysa.institution}</TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={isBest ? 'font-semibold text-green-600 dark:text-green-400' : ''}
                    >
                      {formatPercent(hysa.apy)}
                    </span>
                    {isBest && (
                      <Badge className="bg-green-600 text-white hover:bg-green-600">Best</Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {hysa.minBalance === 0 ? (
                    <span className="text-muted-foreground">None</span>
                  ) : (
                    formatUSD(hysa.minBalance)
                  )}
                </TableCell>
                <TableCell>
                  {hysa.fdicInsured ? (
                    <Badge className="bg-blue-600 text-white hover:bg-blue-600">FDIC</Badge>
                  ) : (
                    <Badge variant="secondary">No</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-xs">
                  {formatRelativeTime(hysa.lastUpdated)}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}

function HYSATableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}
