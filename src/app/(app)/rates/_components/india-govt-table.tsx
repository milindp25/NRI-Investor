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
import { formatPercent, formatRelativeTime, formatINR } from '@/lib/utils';
import type { GovtSchemeRate } from '@/types';

interface IndiaGovtTableProps {
  schemes: GovtSchemeRate[];
  isLoading: boolean;
}

export function IndiaGovtTable({ schemes, isLoading }: IndiaGovtTableProps) {
  if (isLoading) {
    return <GovtTableSkeleton />;
  }

  const sorted = [...schemes].sort((a, b) => b.currentRate - a.currentRate);
  const bestRate = sorted.length > 0 ? sorted[0].currentRate : 0;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Scheme</TableHead>
          <TableHead className="text-right">Current Rate</TableHead>
          <TableHead>Rate Type</TableHead>
          <TableHead>Tenure</TableHead>
          <TableHead className="text-right">Min Investment</TableHead>
          <TableHead>NRI Eligible</TableHead>
          <TableHead className="text-right">Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground">
              No government schemes available.
            </TableCell>
          </TableRow>
        ) : (
          sorted.map((scheme) => {
            const isBest = scheme.currentRate === bestRate && bestRate > 0;
            const tenureLabel =
              scheme.minTenureMonths === scheme.maxTenureMonths
                ? `${scheme.minTenureMonths}mo`
                : `${scheme.minTenureMonths}-${scheme.maxTenureMonths}mo`;

            return (
              <TableRow key={scheme.schemeId}>
                <TableCell className="font-medium">{scheme.schemeName}</TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={isBest ? 'font-semibold text-green-600 dark:text-green-400' : ''}
                    >
                      {formatPercent(scheme.currentRate)}
                    </span>
                    {isBest && (
                      <Badge className="bg-green-600 text-white hover:bg-green-600">Best</Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {scheme.rateType}
                  </Badge>
                </TableCell>
                <TableCell>{tenureLabel}</TableCell>
                <TableCell className="text-right">
                  {formatINR(scheme.minInvestment)}
                  {scheme.maxInvestment ? ` - ${formatINR(scheme.maxInvestment)}` : ''}
                </TableCell>
                <TableCell>
                  {scheme.nriEligible ? (
                    <Badge className="bg-green-600 text-white hover:bg-green-600">Eligible</Badge>
                  ) : (
                    <Badge variant="secondary">Not Eligible</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-xs">
                  {formatRelativeTime(scheme.lastUpdated)}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}

function GovtTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}
