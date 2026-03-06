'use client';

import { TrendingUp, AlertTriangle } from 'lucide-react';
import { formatINR, formatPercent } from '@/lib/utils';
import type { PropertyResult } from '@/types';

interface PropertyResultsProps {
  result: PropertyResult;
  isNRI: boolean;
}

export function PropertyResults({ result, isNRI }: PropertyResultsProps) {
  return (
    <div className="space-y-6">
      {/* Hero ROI */}
      <div className="premium-card-highlight p-6 text-center">
        <TrendingUp className="size-7 mx-auto mb-2 text-gold" />
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
          Total Return on Investment
        </p>
        <p className="hero-number gold-gradient-text">{formatPercent(result.totalROI, 1)}</p>
        <p className="text-sm text-muted-foreground mt-1">
          Annualized: {formatPercent(result.annualizedROI, 2)} p.a.
        </p>
      </div>

      {/* Metric Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Total Investment" value={formatINR(result.totalInvestment)} />
        <MetricCard label="Sale Value" value={formatINR(result.estimatedSaleValue)} accent="teal" />
        <MetricCard label="Gross Yield" value={formatPercent(result.grossRentalYield, 2)} />
        <MetricCard label="Net Yield" value={formatPercent(result.netRentalYield, 2)} />
        <MetricCard
          label="Appreciation"
          value={formatINR(result.totalAppreciation)}
          accent="teal"
        />
        <MetricCard
          label="Capital Gains Tax"
          value={formatINR(result.capitalGainsTax)}
          accent="warm"
        />
        {isNRI && (
          <>
            <MetricCard label="Repatriable" value={formatINR(result.repatriableAmount)} />
            <MetricCard
              label="Repatriation Tax"
              value={formatINR(result.repatriationTax)}
              accent="warm"
            />
          </>
        )}
      </div>

      {/* Cash Flow Table */}
      {result.cashFlowProjection.length > 0 && (
        <div className="premium-card overflow-x-auto">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold">Cash Flow Projection</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase">
                  Year
                </th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase">
                  Rental
                </th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase">
                  EMI
                </th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase">
                  Net Flow
                </th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase">
                  Property Value
                </th>
              </tr>
            </thead>
            <tbody>
              {result.cashFlowProjection.map((row) => (
                <tr key={row.year} className="border-b border-border/50 hover:bg-secondary/30">
                  <td className="py-2.5 px-4 font-medium">Year {row.year}</td>
                  <td className="py-2.5 px-4 text-right text-teal">{formatINR(row.rental)}</td>
                  <td className="py-2.5 px-4 text-right text-warm">
                    {row.emiPayment > 0 ? formatINR(row.emiPayment) : '—'}
                  </td>
                  <td
                    className={`py-2.5 px-4 text-right font-medium ${row.netCashFlow >= 0 ? 'text-teal' : 'text-destructive'}`}
                  >
                    {formatINR(row.netCashFlow)}
                  </td>
                  <td className="py-2.5 px-4 text-right text-gold">
                    {formatINR(row.propertyValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* FEMA Callout for NRI */}
      {isNRI && (
        <div className="premium-card p-5 border-l-4" style={{ borderLeftColor: 'var(--warm)' }}>
          <h3 className="text-sm font-semibold text-warm mb-2 flex items-center gap-2">
            <AlertTriangle className="size-4" />
            FEMA Rules for NRI Property
          </h3>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>NRIs can buy up to 2 residential properties under general permission</li>
            <li>Agricultural land, plantation, and farmhouse cannot be purchased by NRIs</li>
            <li>NRO repatriation limited to USD 1 million per financial year</li>
            <li>NRE funds used for purchase are fully repatriable on sale</li>
            <li>Capital gains tax must be paid before repatriation</li>
          </ul>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'teal' | 'warm' | 'gold';
}) {
  const colorClass =
    accent === 'teal'
      ? 'text-teal'
      : accent === 'warm'
        ? 'text-warm'
        : accent === 'gold'
          ? 'text-gold'
          : '';
  return (
    <div className="premium-card p-4 text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-sm font-semibold ${colorClass}`}>{value}</p>
    </div>
  );
}
