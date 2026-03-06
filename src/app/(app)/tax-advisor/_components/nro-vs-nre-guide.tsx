'use client';

import { useState, useMemo } from 'react';
import { Shield, ArrowRight } from 'lucide-react';
import { SUPPORTED_COUNTRIES } from '@/lib/constants/countries';
import { compareNROvsNRE } from '@/lib/calculations';
import { formatPercent } from '@/lib/utils';
import type { SupportedCountry } from '@/types';

export function NROvsNREGuide() {
  const [country, setCountry] = useState<SupportedCountry>('US');
  const [interestRate, setInterestRate] = useState('7');
  const [tenure, setTenure] = useState('12');

  const comparison = useMemo(() => {
    const rate = Number(interestRate) || 7;
    const months = Number(tenure) || 12;
    return compareNROvsNRE(country, 100_000, rate, months);
  }, [country, interestRate, tenure]);

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="premium-card p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Country
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
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              FD Interest Rate (%)
            </label>
            <input
              type="number"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              step="0.1"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tenure (Months)
            </label>
            <select
              value={tenure}
              onChange={(e) => setTenure(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              {[6, 12, 24, 36, 60].map((m) => (
                <option key={m} value={m}>
                  {m} months
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Side-by-Side Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* NRE Card */}
        <div
          className={`premium-card p-5 space-y-4 ${comparison.recommendation === 'NRE' ? 'border-teal/40' : ''}`}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-teal">NRE Account</h3>
            {comparison.recommendation === 'NRE' && (
              <span className="rating-best text-xs">Recommended</span>
            )}
          </div>
          <div className="text-center py-3">
            <p className="text-xs text-muted-foreground mb-1">Effective Return</p>
            <p className="text-3xl font-serif font-bold text-teal">
              {formatPercent(comparison.nreEffectiveReturn)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Tax-free in India</p>
          </div>
          <ul className="space-y-2">
            {comparison.nreAdvantages.map((adv, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-teal mt-0.5 shrink-0">&#10003;</span>
                <span>{adv}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* NRO Card */}
        <div
          className={`premium-card p-5 space-y-4 ${comparison.recommendation === 'NRO' ? 'border-warm/40' : ''}`}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-warm">NRO Account</h3>
            {comparison.recommendation === 'NRO' && (
              <span className="type-pvt text-xs">Recommended</span>
            )}
          </div>
          <div className="text-center py-3">
            <p className="text-xs text-muted-foreground mb-1">Effective Return</p>
            <p className="text-3xl font-serif font-bold text-warm">
              {formatPercent(comparison.nroEffectiveReturn)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">After TDS (with DTAA)</p>
          </div>
          <ul className="space-y-2">
            {comparison.nroAdvantages.map((adv, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-warm mt-0.5 shrink-0">&#10003;</span>
                <span>{adv}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommendation */}
      <div className="premium-card-highlight p-5">
        <div className="flex items-start gap-3">
          <Shield className="size-5 text-gold shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold mb-1">Recommendation</h3>
            <p className="text-sm text-muted-foreground">{comparison.explanation}</p>
          </div>
        </div>
      </div>

      {/* When to use each */}
      <div className="premium-card p-6">
        <h3 className="font-semibold mb-4">When to Use Each Account</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center size-8 rounded-lg bg-teal/10 text-teal shrink-0">
              <ArrowRight className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium">Use NRE for:</p>
              <p className="text-sm text-muted-foreground">
                Foreign salary/income remitted to India, savings from abroad, FDs for tax-free
                returns, fully repatriable funds
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center size-8 rounded-lg bg-warm/10 text-warm shrink-0">
              <ArrowRight className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium">Use NRO for:</p>
              <p className="text-sm text-muted-foreground">
                Rental income from India property, dividends from Indian stocks, pension/PF
                proceeds, any India-sourced income
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
