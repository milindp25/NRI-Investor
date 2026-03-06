'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelativeTime } from '@/lib/utils';
import { RateCell, findBestInTenure, getTenureRate } from './rate-table-helpers';
import type { BankFDRate } from '@/types';

const TENURE_COLUMNS = [12, 24, 36, 60] as const;

interface IndiaFDTableProps {
  rates: BankFDRate[];
  accountType: 'NRE' | 'NRO';
  isLoading: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}

export function IndiaFDTable({
  rates,
  accountType,
  isLoading,
  selectedIds,
  onToggleSelect,
}: IndiaFDTableProps) {
  if (isLoading) {
    return <IndiaFDTableSkeleton />;
  }

  const filtered = rates
    .filter((r) => r.accountType === accountType)
    .sort((a, b) => {
      const aMax = Math.max(...a.tenures.map((t) => t.rate));
      const bMax = Math.max(...b.tenures.map((t) => t.rate));
      return bMax - aMax;
    });

  const bestByTenure: Record<number, number> = {};
  for (const months of TENURE_COLUMNS) {
    bestByTenure[months] = findBestInTenure(filtered, months);
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
          <TableHead className="text-right">Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filtered.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={TENURE_COLUMNS.length + 3}
              className="text-center text-muted-foreground"
            >
              No {accountType} FD rates available.
            </TableCell>
          </TableRow>
        ) : (
          filtered.map((bank) => {
            const rowId = `fd-${bank.institutionId}-${accountType}`;
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
                        ? `Remove ${bank.institution} from comparison`
                        : `Add ${bank.institution} to comparison`
                    }
                  >
                    {isSelected ? 'Added' : 'Add'}
                  </Button>
                </TableCell>
                <TableCell className="font-medium">{bank.institution}</TableCell>
                {TENURE_COLUMNS.map((m) => (
                  <TableCell key={m} className="text-right">
                    <RateCell value={getTenureRate(bank.tenures, m)} bestValue={bestByTenure[m]} />
                  </TableCell>
                ))}
                <TableCell className="text-right text-muted-foreground text-xs">
                  {formatRelativeTime(bank.lastUpdated)}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}

function IndiaFDTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-36" />
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
