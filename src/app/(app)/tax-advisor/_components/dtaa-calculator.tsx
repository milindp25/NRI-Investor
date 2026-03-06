'use client';

import { useState } from 'react';
import { Calculator, Info } from 'lucide-react';
import { SUPPORTED_COUNTRIES } from '@/lib/constants/countries';
import { formatINR, formatPercent } from '@/lib/utils';
import type { SupportedCountry, IncomeType, TaxCalculationResult } from '@/types';

const INCOME_TYPES: Array<{ value: IncomeType; label: string }> = [
  { value: 'interest', label: 'Interest Income (FD/Savings)' },
  { value: 'dividend', label: 'Dividend Income' },
  { value: 'capital-gains-st', label: 'Short-Term Capital Gains' },
  { value: 'capital-gains-lt', label: 'Long-Term Capital Gains' },
  { value: 'rental', label: 'Rental Income' },
  { value: 'salary', label: 'Salary Income' },
];

export function DTAACalculator() {
  const [country, setCountry] = useState<SupportedCountry>('US');
  const [incomeType, setIncomeType] = useState<IncomeType>('interest');
  const [grossIncome, setGrossIncome] = useState('100000');
  const [applyDTAA, setApplyDTAA] = useState(true);
  const [hasTRC, setHasTRC] = useState(true);
  const [accountType, setAccountType] = useState<'NRE' | 'NRO'>('NRO');
  const [result, setResult] = useState<TaxCalculationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCalculate() {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/calculate/tax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          residenceCountry: country,
          incomeType,
          grossIncome: Number(grossIncome),
          applyDTAA,
          hasTRC,
          accountType: incomeType === 'interest' ? accountType : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Calculation failed');
        return;
      }
      setResult(data.data);
    } catch {
      setError('Failed to calculate. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <div className="premium-card p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Country */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Country of Residence
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value as SupportedCountry)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              {Object.entries(SUPPORTED_COUNTRIES).map(([code, meta]) => (
                <option key={code} value={code}>
                  {meta.flagEmoji} {meta.name}
                </option>
              ))}
            </select>
          </div>

          {/* Income Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Income Type
            </label>
            <select
              value={incomeType}
              onChange={(e) => setIncomeType(e.target.value as IncomeType)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              {INCOME_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Gross Income */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Gross Income (INR)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                ₹
              </span>
              <input
                type="number"
                value={grossIncome}
                onChange={(e) => setGrossIncome(e.target.value)}
                className="w-full rounded-lg border border-border bg-background pl-7 pr-3 py-2 text-sm"
                placeholder="100000"
              />
            </div>
          </div>

          {/* Account Type (only for interest) */}
          {incomeType === 'interest' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Account Type
              </label>
              <div className="flex gap-2">
                {(['NRE', 'NRO'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setAccountType(type)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      accountType === type
                        ? 'gold-gradient-bg text-[#0A0E15]'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* DTAA + TRC toggles */}
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={applyDTAA}
              onChange={(e) => setApplyDTAA(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-sm">Apply DTAA Benefits</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasTRC}
              onChange={(e) => setHasTRC(e.target.checked)}
              className="rounded border-border"
              disabled={!applyDTAA}
            />
            <span className={`text-sm ${!applyDTAA ? 'text-muted-foreground/50' : ''}`}>
              Have Tax Residency Certificate (TRC)
            </span>
          </label>
        </div>

        <button
          onClick={handleCalculate}
          disabled={isLoading || !grossIncome}
          className="gold-gradient-bg text-[#0A0E15] px-6 py-2.5 rounded-xl font-medium text-sm transition-opacity disabled:opacity-50 flex items-center gap-2"
        >
          <Calculator className="size-4" />
          {isLoading ? 'Calculating...' : 'Calculate Tax'}
        </button>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Hero Result */}
          <div className="premium-card-highlight p-6 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Effective Tax Rate
            </p>
            <p className="hero-number gold-gradient-text">
              {formatPercent(result.effectiveTaxRate, 1)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Total tax: {formatINR(result.totalEffectiveTax)} on {formatINR(result.grossIncome)}
            </p>
          </div>

          {/* Breakdown */}
          <div className="premium-card p-6">
            <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider text-muted-foreground">
              Tax Breakdown
            </h3>
            <div className="space-y-3">
              <Row label="Gross Income" value={formatINR(result.grossIncome)} />
              <Row
                label="TDS in India"
                value={formatINR(result.tdsInIndia)}
                sub={`at ${formatPercent(result.tdsRate, 1)}`}
              />
              {result.dtaaBenefit > 0 && (
                <Row
                  label="DTAA Benefit (Saved)"
                  value={formatINR(result.dtaaBenefit)}
                  highlight="teal"
                />
              )}
              <Row label="Estimated Tax Abroad" value={formatINR(result.estimatedTaxAbroad)} />
              {result.foreignTaxCredit > 0 && (
                <Row
                  label="Foreign Tax Credit"
                  value={`-${formatINR(result.foreignTaxCredit)}`}
                  highlight="teal"
                />
              )}
              <div className="border-t border-border pt-3">
                <Row label="Total Effective Tax" value={formatINR(result.totalEffectiveTax)} bold />
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div className="premium-card p-6">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Info className="size-4 text-info" />
                Recommendations
              </h3>
              <ul className="space-y-2">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-gold mt-0.5 shrink-0">&#8250;</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  sub,
  highlight,
  bold,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: 'teal' | 'warm';
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold ? 'font-semibold' : 'text-muted-foreground'}`}>{label}</span>
      <div className="text-right">
        <span
          className={`text-sm font-medium ${highlight === 'teal' ? 'text-teal' : highlight === 'warm' ? 'text-warm' : ''} ${bold ? 'font-semibold' : ''}`}
        >
          {value}
        </span>
        {sub && <span className="text-xs text-muted-foreground ml-1">({sub})</span>}
      </div>
    </div>
  );
}
