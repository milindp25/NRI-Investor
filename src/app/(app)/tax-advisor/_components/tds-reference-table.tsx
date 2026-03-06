'use client';

import { useState } from 'react';
import { SUPPORTED_COUNTRIES } from '@/lib/constants/countries';
import type { SupportedCountry } from '@/types';
import treatyRatesData from '@/data/dtaa/treaty-rates.json';

interface TreatyRow {
  country: string;
  interestIncome: { withDTAA: number; withoutDTAA: number };
  dividendIncome: { withDTAA: number; withoutDTAA: number };
  capitalGains: {
    shortTerm: { withDTAA: number; withoutDTAA: number };
    longTerm: { withDTAA: number; withoutDTAA: number };
  };
  rentalIncome: { withDTAA: number; withoutDTAA: number };
  notes: string;
}

const treatyRates = treatyRatesData as TreatyRow[];

const INCOME_COLUMNS = [
  { key: 'interest', label: 'Interest' },
  { key: 'dividend', label: 'Dividends' },
  { key: 'cgST', label: 'CG (Short)' },
  { key: 'cgLT', label: 'CG (Long)' },
  { key: 'rental', label: 'Rental' },
] as const;

function getRate(row: TreatyRow, col: string, withDTAA: boolean): number {
  switch (col) {
    case 'interest':
      return withDTAA ? row.interestIncome.withDTAA : row.interestIncome.withoutDTAA;
    case 'dividend':
      return withDTAA ? row.dividendIncome.withDTAA : row.dividendIncome.withoutDTAA;
    case 'cgST':
      return withDTAA
        ? row.capitalGains.shortTerm.withDTAA
        : row.capitalGains.shortTerm.withoutDTAA;
    case 'cgLT':
      return withDTAA ? row.capitalGains.longTerm.withDTAA : row.capitalGains.longTerm.withoutDTAA;
    case 'rental':
      return withDTAA ? row.rentalIncome.withDTAA : row.rentalIncome.withoutDTAA;
    default:
      return 0;
  }
}

function RateBadge({ rate, defaultRate }: { rate: number; defaultRate: number }) {
  const hasBenefit = rate < defaultRate;
  return (
    <span className={`text-sm font-medium ${hasBenefit ? 'text-teal' : 'text-muted-foreground'}`}>
      {rate}%
      {hasBenefit && (
        <span className="text-[10px] text-teal/70 ml-0.5">(-{defaultRate - rate}%)</span>
      )}
    </span>
  );
}

export function TDSReferenceTable() {
  const [selectedCountry, setSelectedCountry] = useState<SupportedCountry | 'all'>('all');

  const filteredRates =
    selectedCountry === 'all'
      ? treatyRates
      : treatyRates.filter((r) => r.country === selectedCountry);

  return (
    <div className="space-y-6">
      {/* Country Filter */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setSelectedCountry('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            selectedCountry === 'all'
              ? 'gold-gradient-bg text-[#0A0E15]'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          }`}
        >
          All Countries
        </button>
        {Object.entries(SUPPORTED_COUNTRIES).map(([code, meta]) => (
          <button
            key={code}
            onClick={() => setSelectedCountry(code as SupportedCountry)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedCountry === code
                ? 'gold-gradient-bg text-[#0A0E15]'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {meta.flagEmoji} {meta.name}
          </button>
        ))}
      </div>

      {/* Reference Table */}
      <div className="premium-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Country
              </th>
              {INCOME_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="text-center py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRates.map((row) => {
              const meta = SUPPORTED_COUNTRIES[row.country as SupportedCountry];
              return (
                <tr key={row.country} className="border-b border-border/50 hover:bg-secondary/30">
                  <td className="py-3 px-4 font-medium">
                    {meta?.flagEmoji} {meta?.name || row.country}
                  </td>
                  {INCOME_COLUMNS.map((col) => {
                    const dtaaRate = getRate(row, col.key, true);
                    const defaultRate = getRate(row, col.key, false);
                    return (
                      <td key={col.key} className="py-3 px-3 text-center">
                        <RateBadge rate={dtaaRate} defaultRate={defaultRate} />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Default Rates Reference */}
      <div className="premium-card p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Default TDS Rates (Without DTAA)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Interest</p>
            <p className="text-sm font-medium text-warm">30%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Dividends</p>
            <p className="text-sm font-medium text-warm">20%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">CG (Short)</p>
            <p className="text-sm font-medium text-warm">30%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">CG (Long)</p>
            <p className="text-sm font-medium text-warm">20%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Rental</p>
            <p className="text-sm font-medium text-warm">30%</p>
          </div>
        </div>
      </div>

      {/* Notes per country */}
      {filteredRates.length === 1 && filteredRates[0].notes && (
        <div className="premium-card p-5 border-l-4" style={{ borderLeftColor: 'var(--info)' }}>
          <p className="text-sm text-muted-foreground">{filteredRates[0].notes}</p>
        </div>
      )}

      {/* FEMA Callout */}
      <div className="premium-card p-5 border-l-4" style={{ borderLeftColor: 'var(--warm)' }}>
        <h3 className="text-sm font-semibold text-warm mb-2">FEMA Repatriation Limits</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>NRO account: Repatriation limited to USD 1 million per financial year</li>
          <li>NRE account: Fully repatriable (principal + interest)</li>
          <li>DTAA benefits require a valid Tax Residency Certificate (TRC) + Form 10F</li>
        </ul>
      </div>
    </div>
  );
}
