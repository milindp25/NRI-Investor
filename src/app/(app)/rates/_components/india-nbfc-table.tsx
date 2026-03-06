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
import { formatRelativeTime, formatINR } from '@/lib/utils';
import { RateCell, findBestInTenure, getTenureRate } from './rate-table-helpers';
import type { NBFCRate } from '@/types';

const TENURE_COLUMNS = [12, 24, 36, 60] as const;

interface IndiaNBFCTableProps {
  rates: NBFCRate[];
  isLoading: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}

export function IndiaNBFCTable({
  rates,
  isLoading,
  selectedIds,
  onToggleSelect,
}: IndiaNBFCTableProps) {
  if (isLoading) {
    return <NBFCTableSkeleton />;
  }

  const sorted = [...rates].sort((a, b) => {
    const aMax = Math.max(...a.tenures.map((t) => t.rate));
    const bMax = Math.max(...b.tenures.map((t) => t.rate));
    return bMax - aMax;
  });

  const bestByTenure: Record<number, number> = {};
  for (const months of TENURE_COLUMNS) {
    bestByTenure[months] = findBestInTenure(sorted, months);
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10"></TableHead>
          <TableHead>Institution</TableHead>
          <TableHead>Rating</TableHead>
          {TENURE_COLUMNS.map((m) => (
            <TableHead key={m} className="text-right">
              {m}mo
            </TableHead>
          ))}
          <TableHead className="text-right">Min Deposit</TableHead>
          <TableHead className="text-right">Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={TENURE_COLUMNS.length + 5}
              className="text-center text-muted-foreground"
            >
              No NBFC rates available.
            </TableCell>
          </TableRow>
        ) : (
          sorted.map((nbfc) => {
            const rowId = `nbfc-${nbfc.institutionId}`;
            const isSelected = selectedIds.has(rowId);

            return (
              <TableRow key={rowId} data-state={isSelected ? 'selected' : undefined}>
                <TableCell>
                  <Button
                    variant={isSelected ? 'default' : 'outline'}
                    size="xs"
                    onClick={() => onToggleSelect(rowId)}
                    aria-label={
                      isSelected
                        ? `Remove ${nbfc.institution} from comparison`
                        : `Add ${nbfc.institution} to comparison`
                    }
                  >
                    {isSelected ? 'Added' : 'Add'}
                  </Button>
                </TableCell>
                <TableCell className="font-medium">{nbfc.institution}</TableCell>
                <TableCell>
                  <Badge variant="outline">{nbfc.creditRating}</Badge>
                </TableCell>
                {TENURE_COLUMNS.map((m) => (
                  <TableCell key={m} className="text-right">
                    <RateCell value={getTenureRate(nbfc.tenures, m)} bestValue={bestByTenure[m]} />
                  </TableCell>
                ))}
                <TableCell className="text-right text-muted-foreground">
                  {nbfc.minDeposit ? formatINR(nbfc.minDeposit) : '--'}
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-xs">
                  {formatRelativeTime(nbfc.lastUpdated)}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}

function NBFCTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}
