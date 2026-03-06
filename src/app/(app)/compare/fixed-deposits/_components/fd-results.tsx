'use client';

import { ArrowRight, Bookmark, Trophy, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatINR, formatUSD, formatPercent } from '@/lib/utils';
import type { ComparisonResult, FixedDepositInput, FixedDepositResult } from '@/types';

type FDComparison = ComparisonResult<FixedDepositInput, FixedDepositResult>;

interface FDResultsProps {
  comparison: FDComparison;
  onSave: () => void;
  isSaved: boolean;
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="inline size-3.5 text-muted-foreground cursor-help ml-1" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p>{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ResultRow({
  label,
  indiaValue,
  usValue,
  tooltip,
  highlight,
}: {
  label: string;
  indiaValue: string;
  usValue: string;
  tooltip?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-4 py-3 border-b last:border-b-0 ${
        highlight ? 'bg-muted/30 -mx-4 px-4 rounded-md' : ''
      }`}
    >
      <div className="flex-1 min-w-0">
        <span className="text-sm text-muted-foreground">
          {label}
          {tooltip && <InfoTooltip text={tooltip} />}
        </span>
      </div>
      <div className="text-sm font-medium text-right w-36 shrink-0">{indiaValue}</div>
      <div className="hidden sm:block text-muted-foreground shrink-0">
        <ArrowRight className="size-3.5 mt-0.5" />
      </div>
      <div className="text-sm font-medium text-right w-36 shrink-0">{usValue}</div>
    </div>
  );
}

export function FDResults({ comparison, onSave, isSaved }: FDResultsProps) {
  const { indiaInvestment, abroadInvestment, summary } = comparison;
  const india = indiaInvestment.result;
  const abroad = abroadInvestment.result;
  const isIndiaWinner = summary.winner === 'india';
  const isComparable = summary.winner === 'comparable';
  const absDiff = Math.abs(summary.differencePercent);

  return (
    <div className="space-y-6">
      {/* ── Winner Badge ── */}
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="premium-card-highlight px-8 py-5 text-center">
          <Trophy
            className={`size-7 mx-auto mb-2 ${
              isComparable ? 'text-gold' : isIndiaWinner ? 'text-warm' : 'text-teal'
            }`}
          />
          <div className="font-serif text-xl font-bold">
            {isComparable
              ? 'Returns are comparable'
              : isIndiaWinner
                ? `India FD wins by ${formatPercent(absDiff)}`
                : `US Investment wins by ${formatPercent(absDiff)}`}
          </div>
        </div>
      </div>

      {/* ── Side-by-Side Results ── */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Comparison</CardTitle>
          <CardDescription>After-tax, after-forex analysis</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Column Headers */}
          <div className="flex items-center gap-4 pb-3 border-b mb-1">
            <div className="flex-1 min-w-0">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Metric
              </span>
            </div>
            <div className="text-right w-36 shrink-0">
              <span className="text-xs uppercase tracking-wider text-orange-600 dark:text-orange-400 font-medium">
                India FD
              </span>
            </div>
            <div className="hidden sm:block w-3.5 shrink-0" />
            <div className="text-right w-36 shrink-0">
              <span className="text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 font-medium">
                US Investment
              </span>
            </div>
          </div>

          <ResultRow
            label="Maturity Amount"
            indiaValue={formatINR(india.maturityAmount)}
            usValue={formatUSD(abroad.maturityAmount)}
          />
          <ResultRow
            label="Total Interest Earned"
            indiaValue={formatINR(india.totalInterest)}
            usValue={formatUSD(abroad.totalInterest)}
          />
          <ResultRow
            label="Tax Deducted"
            indiaValue={`${formatINR(india.taxDeducted)} (${formatPercent(india.tdsRate, 0)})`}
            usValue={`${formatUSD(abroad.taxDeducted)} (${formatPercent(abroad.tdsRate, 0)})`}
          />
          <ResultRow
            label="DTAA Benefit"
            indiaValue={formatINR(india.dtaaBenefit)}
            usValue="N/A"
            tooltip="Double Taxation Avoidance Agreement benefit reduces tax on NRO FD interest. Under DTAA with the US, TDS on NRO interest can be reduced from 30% to ~15%."
          />
          <ResultRow
            label="Effective Yield (After Tax)"
            indiaValue={formatPercent(india.effectiveYield)}
            usValue={formatPercent(abroad.effectiveYield)}
          />
          <ResultRow
            label="Effective Yield After Forex"
            indiaValue={formatPercent(india.effectiveYieldAfterForex)}
            usValue={formatPercent(abroad.effectiveYieldAfterForex)}
            tooltip="For India FD, this adjusts the yield for expected INR depreciation against USD. For the US investment, this is the same as the after-tax yield since it is already in USD."
            highlight
          />
          <ResultRow
            label="Maturity in USD"
            indiaValue={formatUSD(india.maturityAmountInPreferredCurrency)}
            usValue={formatUSD(abroad.maturityAmountInPreferredCurrency)}
            highlight
          />
        </CardContent>
      </Card>

      {/* ── Key Insights ── */}
      {summary.keyInsights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Key Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.keyInsights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-0.5 shrink-0">&#8226;</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ── Caveats ── */}
      {summary.caveats.length > 0 && (
        <div className="premium-card p-6 border-l-4" style={{ borderLeftColor: 'var(--warm)' }}>
          <h3 className="text-base font-semibold text-warm mb-3">Important Caveats</h3>
          <ul className="space-y-2">
            {summary.caveats.map((caveat, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-warm mt-0.5 shrink-0">&#9888;</span>
                <span>{caveat}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Save Button ── */}
      <div className="flex justify-center">
        <Button
          variant={isSaved ? 'secondary' : 'outline'}
          onClick={onSave}
          disabled={isSaved}
          className="gap-2"
        >
          <Bookmark className={`size-4 ${isSaved ? 'fill-current' : ''}`} />
          {isSaved ? 'Comparison Saved' : 'Save Comparison'}
        </Button>
      </div>
    </div>
  );
}
