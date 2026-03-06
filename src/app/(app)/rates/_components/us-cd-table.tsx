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
import { formatRelativeTime } from '@/lib/utils';
import { RateCell, findBestInTenure, getTenureRate } from './rate-table-helpers';
import type { USCDRate } from '@/types';

const TENURE_COLUMNS = [6, 12, 24, 36, 60] as const;

interface USCDTableProps {
  rates: USCDRate[];
  isLoading: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}

export function USCDTable({ rates, isLoading, selectedIds, onToggleSelect }: USCDTableProps) {
  if (isLoading) {
    return <CDTableSkeleton />;
  }

  const sorted = [...rates].sort((a, b) => {
    const aMax = Math.max(...a.tenures.map((t) => t.apy));
    const bMax = Math.max(...b.tenures.map((t) => t.apy));
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
          {TENURE_COLUMNS.map((m) => (
            <TableHead key={m} className="text-right">
              {m}mo
            </TableHead>
          ))}
          <TableHead>FDIC</TableHead>
          <TableHead className="text-right">Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={TENURE_COLUMNS.length + 4}
              className="text-center text-muted-foreground"
            >
              No CD rates available.
            </TableCell>
          </TableRow>
        ) : (
          sorted.map((cd) => {
            const rowId = `cd-${cd.institutionId}`;
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
                        ? `Remove ${cd.institution} from comparison`
                        : `Add ${cd.institution} to comparison`
                    }
                  >
                    {isSelected ? 'Added' : 'Add'}
                  </Button>
                </TableCell>
                <TableCell className="font-medium">{cd.institution}</TableCell>
                {TENURE_COLUMNS.map((m) => (
                  <TableCell key={m} className="text-right">
                    <RateCell value={getTenureRate(cd.tenures, m)} bestValue={bestByTenure[m]} />
                  </TableCell>
                ))}
                <TableCell>
                  {cd.fdicInsured ? (
                    <Badge className="bg-blue-600 text-white hover:bg-blue-600">FDIC</Badge>
                  ) : (
                    <Badge variant="secondary">No</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-xs">
                  {formatRelativeTime(cd.lastUpdated)}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}

function CDTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}
