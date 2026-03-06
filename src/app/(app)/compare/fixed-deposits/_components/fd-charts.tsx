'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPercent } from '@/lib/utils';
import type { ComparisonResult, FixedDepositInput, FixedDepositResult } from '@/types';

type FDComparison = ComparisonResult<FixedDepositInput, FixedDepositResult>;

interface FDChartsProps {
  comparison: FDComparison;
}

// ── Custom Tooltip for Bar Chart ───────────────────────────────────
function BarTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="text-sm font-medium mb-1">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatPercent(entry.value)}
        </p>
      ))}
    </div>
  );
}

// ── Custom Tooltip for Line Chart ──────────────────────────────────
function LineTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="text-sm font-medium mb-1">Month {label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: ${entry.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </p>
      ))}
    </div>
  );
}

export function FDCharts({ comparison }: FDChartsProps) {
  const { indiaInvestment, abroadInvestment } = comparison;
  const india = indiaInvestment.result;
  const abroad = abroadInvestment.result;
  const indiaInput = indiaInvestment.input;
  const abroadInput = abroadInvestment.input;

  // ── Bar chart data: yield comparison ─────────────────────────────
  const barData = useMemo(
    () => [
      {
        name: 'Pre-Tax Yield',
        'India FD': indiaInput.interestRateAnnual,
        'US Investment': abroadInput.interestRateAnnual,
      },
      {
        name: 'Post-Tax Yield',
        'India FD': india.effectiveYield,
        'US Investment': abroad.effectiveYield,
      },
      {
        name: 'Post-Forex Yield',
        'India FD': india.effectiveYieldAfterForex,
        'US Investment': abroad.effectiveYieldAfterForex,
      },
    ],
    [india, abroad, indiaInput, abroadInput],
  );

  // ── Line chart data: growth over time ────────────────────────────
  const lineData = useMemo(() => {
    const tenureMonths = indiaInput.tenureMonths;
    const points: Array<{
      month: number;
      'India FD (USD)': number;
      'US Investment (USD)': number;
    }> = [];

    // Get compounding frequency multiplier
    const getPeriodsPerYear = (freq: string) => {
      switch (freq) {
        case 'monthly':
          return 12;
        case 'quarterly':
          return 4;
        case 'half-yearly':
          return 2;
        case 'yearly':
          return 1;
        default:
          return 4;
      }
    };

    const indiaPeriodsPerYear = getPeriodsPerYear(indiaInput.compoundingFrequency);
    const abroadPeriodsPerYear = getPeriodsPerYear(abroadInput.compoundingFrequency);

    // Monthly depreciation derived from the forex assumption
    const annualDepreciation = comparison.forexAssumption.annualAppreciationRate / 100;

    for (let m = 0; m <= tenureMonths; m += Math.max(1, Math.floor(tenureMonths / 12))) {
      const years = m / 12;

      // India: compound growth with effective yield (already accounts for tax), apply forex
      const indiaGrowthFactor = Math.pow(
        1 + indiaInput.interestRateAnnual / 100 / indiaPeriodsPerYear,
        indiaPeriodsPerYear * years,
      );
      // Apply TDS ratio to the interest portion
      const interestPortion = indiaInput.principal * (indiaGrowthFactor - 1);
      const taxRatio = india.taxDeducted > 0 ? india.taxDeducted / india.totalInterest : 0;
      const afterTaxValue = indiaInput.principal + interestPortion * (1 - taxRatio);
      // Apply forex depreciation
      const forexFactor = Math.pow(1 + annualDepreciation, years);
      const indiaValueUSD = (afterTaxValue / exchangeRate) * forexFactor;

      // Abroad: compound growth with effective rate
      const abroadGrowthFactor = Math.pow(
        1 + abroadInput.interestRateAnnual / 100 / abroadPeriodsPerYear,
        abroadPeriodsPerYear * years,
      );
      const abroadInterest = abroadInput.principal * (abroadGrowthFactor - 1);
      const abroadTaxRatio = abroad.taxDeducted > 0 ? abroad.taxDeducted / abroad.totalInterest : 0;
      const abroadAfterTaxValue = abroadInput.principal + abroadInterest * (1 - abroadTaxRatio);

      points.push({
        month: m,
        'India FD (USD)': Math.round(indiaValueUSD),
        'US Investment (USD)': Math.round(abroadAfterTaxValue),
      });
    }

    // Always include the last month
    if (points.length === 0 || points[points.length - 1].month !== tenureMonths) {
      const years = tenureMonths / 12;
      const indiaGrowthFactor = Math.pow(
        1 + indiaInput.interestRateAnnual / 100 / indiaPeriodsPerYear,
        indiaPeriodsPerYear * years,
      );
      const interestPortion = indiaInput.principal * (indiaGrowthFactor - 1);
      const taxRatio = india.taxDeducted > 0 ? india.taxDeducted / india.totalInterest : 0;
      const afterTaxValue = indiaInput.principal + interestPortion * (1 - taxRatio);
      const forexFactor = Math.pow(1 + annualDepreciation, years);
      const indiaValueUSD = (afterTaxValue / exchangeRate) * forexFactor;

      const abroadGrowthFactor = Math.pow(
        1 + abroadInput.interestRateAnnual / 100 / abroadPeriodsPerYear,
        abroadPeriodsPerYear * years,
      );
      const abroadInterest = abroadInput.principal * (abroadGrowthFactor - 1);
      const abroadTaxRatio = abroad.taxDeducted > 0 ? abroad.taxDeducted / abroad.totalInterest : 0;
      const abroadAfterTaxValue = abroadInput.principal + abroadInterest * (1 - abroadTaxRatio);

      points.push({
        month: tenureMonths,
        'India FD (USD)': Math.round(indiaValueUSD),
        'US Investment (USD)': Math.round(abroadAfterTaxValue),
      });
    }

    return points;
  }, [india, abroad, indiaInput, abroadInput, comparison]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ── Yield Comparison Bar Chart ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Yield Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `${v}%`}
                className="fill-muted-foreground"
              />
              <RechartsTooltip content={<BarTooltipContent />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="India FD"
                fill="hsl(24, 95%, 53%)"
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
              <Bar
                dataKey="US Investment"
                fill="hsl(217, 91%, 60%)"
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Growth Line Chart ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Growth Over Time (USD)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lineData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                label={{ value: 'Month', position: 'insideBottom', offset: -2, fontSize: 12 }}
                className="fill-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                className="fill-muted-foreground"
              />
              <RechartsTooltip content={<LineTooltipContent />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="India FD (USD)"
                stroke="hsl(24, 95%, 53%)"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="US Investment (USD)"
                stroke="hsl(217, 91%, 60%)"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
