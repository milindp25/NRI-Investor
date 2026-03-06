'use client';

import { useState, useMemo } from 'react';
import type { BankFDRate } from '@/types';
import indiaFdRatesData from '@/data/rates/india-fd-rates.json';
import { calculateFDMaturity } from '@/lib/calculations/fd-calculator';

const indiaFdRates = indiaFdRatesData as BankFDRate[];

const PSU_BANKS = ['sbi', 'pnb', 'bank-of-baroda', 'canara-bank'];

type FDType = 'NRE' | 'NRO';

const TENURE_OPTIONS = [
  { label: '1 Year', months: 12 },
  { label: '2 Years', months: 24 },
  { label: '3 Years', months: 36 },
  { label: '5 Years', months: 60 },
];

function formatINRCompact(amount: number): string {
  if (amount >= 10000000) {
    const cr = amount / 10000000;
    return `₹${cr.toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    const lakhs = amount / 100000;
    return `₹${lakhs.toFixed(2)} L`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getRating(rate: number, bestRate: number): 'best' | 'good' | 'avg' {
  if (rate >= bestRate - 0.1) return 'best';
  if (rate >= bestRate - 0.5) return 'good';
  return 'avg';
}

function RatingBadge({ rating }: { rating: 'best' | 'good' | 'avg' }) {
  const cls = rating === 'best' ? 'rating-best' : rating === 'good' ? 'rating-good' : 'rating-avg';
  const label = rating === 'best' ? 'Best' : rating === 'good' ? 'Good' : 'Avg';
  return <span className={cls}>{label}</span>;
}

function TypeBadge({ isPSU }: { isPSU: boolean }) {
  return <span className={isPSU ? 'type-psu' : 'type-pvt'}>{isPSU ? 'PSU' : 'PVT'}</span>;
}

export function IndiaFDTab() {
  const [amountUSD, setAmountUSD] = useState(10000);
  const [fdType, setFdType] = useState<FDType>('NRE');
  const [selectedTenureMonths, setSelectedTenureMonths] = useState(24);
  const [exchangeRate, setExchangeRate] = useState(84.5);

  // Filter rates by account type
  const filteredRates = useMemo(() => {
    return indiaFdRates.filter((r) => r.accountType === fdType);
  }, [fdType]);

  const [selectedInstitution, setSelectedInstitution] = useState(
    filteredRates.find((r) => r.institutionId === 'yes-bank')?.institutionId ||
      filteredRates[0]?.institutionId ||
      '',
  );

  // Update selected institution when fdType changes if current selection is not valid
  const validInstitution = useMemo(() => {
    const exists = filteredRates.find((r) => r.institutionId === selectedInstitution);
    return exists ? selectedInstitution : filteredRates[0]?.institutionId || '';
  }, [filteredRates, selectedInstitution]);

  const principalINR = amountUSD * exchangeRate;

  // Selected bank calculation
  const selectedResult = useMemo(() => {
    const bank = filteredRates.find((r) => r.institutionId === validInstitution);
    if (!bank) return null;

    const tenure = bank.tenures.find((t) => t.months === selectedTenureMonths);
    const rate = tenure?.rate || 0;

    const result = calculateFDMaturity({
      region: 'india',
      principal: principalINR,
      interestRateAnnual: rate,
      tenureMonths: selectedTenureMonths,
      compoundingFrequency: 'quarterly',
      accountType: fdType,
      isTaxFree: fdType === 'NRE',
    });

    const isPSU = PSU_BANKS.includes(bank.institutionId);

    return {
      ...result,
      rate,
      institution: bank.institution,
      isPSU,
      taxFree: fdType === 'NRE',
    };
  }, [filteredRates, validInstitution, selectedTenureMonths, principalINR, fdType]);

  // Comparison table
  const comparison = useMemo(() => {
    const rows = filteredRates
      .map((bank) => {
        const tenure = bank.tenures.find((t) => t.months === selectedTenureMonths);
        if (!tenure) return null;
        const rate = tenure.rate;

        const result = calculateFDMaturity({
          region: 'india',
          principal: principalINR,
          interestRateAnnual: rate,
          tenureMonths: selectedTenureMonths,
          compoundingFrequency: 'quarterly',
          accountType: fdType,
          isTaxFree: fdType === 'NRE',
        });

        const isPSU = PSU_BANKS.includes(bank.institutionId);

        return {
          institution: bank.institution,
          institutionId: bank.institutionId,
          rate,
          maturity: result.maturityAmount,
          isPSU,
        };
      })
      .filter(Boolean) as Array<{
      institution: string;
      institutionId: string;
      rate: number;
      maturity: number;
      isPSU: boolean;
    }>;

    rows.sort((a, b) => b.rate - a.rate);
    const bestRate = rows[0]?.rate || 0;
    return rows.map((r) => ({ ...r, rating: getRating(r.rate, bestRate) }));
  }, [filteredRates, selectedTenureMonths, principalINR, fdType]);

  // Projection breakdown
  const projection = useMemo(() => {
    if (!selectedResult) return [];
    const rate = selectedResult.rate;
    const periods: Array<{
      period: string;
      balance: number;
      periodInterest: number;
      totalInterest: number;
    }> = [];
    let cumulativeInterest = 0;

    const totalMonths = selectedTenureMonths;
    const step = totalMonths <= 12 ? 3 : totalMonths <= 24 ? 6 : 12;

    for (let m = step; m <= totalMonths; m += step) {
      const result = calculateFDMaturity({
        region: 'india',
        principal: principalINR,
        interestRateAnnual: rate,
        tenureMonths: m,
        compoundingFrequency: 'quarterly',
        accountType: fdType,
        isTaxFree: fdType === 'NRE',
      });
      const totalInt = result.totalInterest;
      const periodInt = totalInt - cumulativeInterest;
      cumulativeInterest = totalInt;
      periods.push({
        period: m < 12 ? `${m} Months` : m === 12 ? '1 Year' : `${m / 12} Years`,
        balance: result.maturityAmount,
        periodInterest: periodInt,
        totalInterest: totalInt,
      });
    }

    return periods;
  }, [selectedResult, selectedTenureMonths, principalINR, fdType]);

  return (
    <div className="space-y-6">
      {/* Card header */}
      <div className="premium-card p-6">
        <h2 className="text-xl font-semibold mb-1">NRE / NRO Fixed Deposit</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Includes PSU banks (government-owned) and private banks. NRE = tax-free &amp; fully
          repatriable. NRO = taxable.
        </p>

        {/* Input fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                $
              </span>
              <input
                type="number"
                value={amountUSD}
                onChange={(e) => setAmountUSD(Number(e.target.value) || 0)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 pl-7 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">
              FD Type
            </label>
            <select
              value={fdType}
              onChange={(e) => setFdType(e.target.value as FDType)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring appearance-none"
            >
              <option value="NRE">NRE - Tax-Free</option>
              <option value="NRO">NRO - Taxable</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">
              Tenure
            </label>
            <select
              value={selectedTenureMonths}
              onChange={(e) => setSelectedTenureMonths(Number(e.target.value))}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring appearance-none"
            >
              {TENURE_OPTIONS.map((t) => (
                <option key={t.months} value={t.months}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">
              USD/INR Rate
            </label>
            <input
              type="number"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(Number(e.target.value) || 84.5)}
              step="0.1"
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Bank selector */}
        <div className="mb-6">
          <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">
            Bank
          </label>
          <div className="relative">
            <select
              value={validInstitution}
              onChange={(e) => setSelectedInstitution(e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring appearance-none pr-28"
            >
              {filteredRates.map((bank) => {
                const tenure = bank.tenures.find((t) => t.months === selectedTenureMonths);
                const isPSU = PSU_BANKS.includes(bank.institutionId);
                return (
                  <option key={bank.institutionId} value={bank.institutionId}>
                    {bank.institution} [{isPSU ? 'PSU' : 'Private'}] — up to {tenure?.rate || 0}%
                  </option>
                );
              })}
            </select>
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold bg-[rgba(200,151,42,0.15)] text-gold-light px-2 py-0.5 rounded-full uppercase tracking-wider">
              Estimated
            </span>
          </div>
        </div>

        {/* Hero results panel */}
        {selectedResult && (
          <div className="premium-card-highlight p-6 mb-0">
            <div className="text-center mb-4">
              <div className="hero-number gold-gradient-text">
                {formatINRCompact(selectedResult.maturityAmount)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Interest: {formatINRCompact(selectedResult.totalInterest)} |{' '}
                {selectedResult.rate.toFixed(2)}% p.a.
                {selectedResult.taxFree ? ' | Tax-Free in India' : ' | Taxable (30% TDS)'}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-secondary rounded-xl p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">Principal (INR)</div>
                <div className="text-lg font-semibold">{formatINRCompact(principalINR)}</div>
              </div>
              <div className="bg-secondary rounded-xl p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">Interest</div>
                <div className="text-lg font-semibold text-gold">
                  {formatINRCompact(selectedResult.totalInterest)}
                </div>
              </div>
              <div className="bg-secondary rounded-xl p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">Tax Status</div>
                <div
                  className={`text-lg font-semibold ${selectedResult.taxFree ? 'text-teal' : 'text-warm'}`}
                >
                  {selectedResult.taxFree ? 'Tax-Free' : '30% TDS'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Comparison Table */}
      <div className="premium-card p-6">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          {fdType} Comparison —{' '}
          {selectedTenureMonths < 12
            ? `${selectedTenureMonths} Mo`
            : selectedTenureMonths === 12
              ? '1 Yr'
              : `${selectedTenureMonths / 12} Yr`}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Bank</th>
                <th className="text-right py-2 px-4 text-muted-foreground font-medium">
                  Rate P.A.
                </th>
                <th className="text-right py-2 px-4 text-muted-foreground font-medium">
                  Maturity (INR)
                </th>
                <th className="text-center py-2 px-4 text-muted-foreground font-medium">Type</th>
                <th className="text-right py-2 pl-4 text-muted-foreground font-medium">Rating</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row, i) => (
                <tr
                  key={row.institutionId}
                  className={`border-b border-border/50 ${
                    row.institutionId === validInstitution ? 'bg-secondary/50' : ''
                  }`}
                  style={{
                    borderLeft:
                      i === 0
                        ? '3px solid #3EC9A7'
                        : i < 3
                          ? '3px solid rgba(62, 201, 167, 0.3)'
                          : '3px solid transparent',
                  }}
                >
                  <td className="py-2.5 pr-4 pl-3">{row.institution}</td>
                  <td className="py-2.5 px-4 text-right text-gold font-medium">
                    {row.rate.toFixed(2)}%
                  </td>
                  <td className="py-2.5 px-4 text-right">{formatINRCompact(row.maturity)}</td>
                  <td className="py-2.5 px-4 text-center">
                    <TypeBadge isPSU={row.isPSU} />
                  </td>
                  <td className="py-2.5 pl-4 text-right">
                    <RatingBadge rating={row.rating} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Projection Breakdown */}
      {projection.length > 0 && (
        <div className="premium-card p-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Projection Breakdown
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Period</th>
                  <th className="text-right py-2 px-4 text-muted-foreground font-medium">
                    Balance
                  </th>
                  <th className="text-right py-2 px-4 text-muted-foreground font-medium">
                    Period Interest
                  </th>
                  <th className="text-right py-2 pl-4 text-muted-foreground font-medium">
                    Total Interest
                  </th>
                </tr>
              </thead>
              <tbody>
                {projection.map((row) => (
                  <tr key={row.period} className="border-b border-border/50">
                    <td className="py-2.5 pr-4">{row.period}</td>
                    <td className="py-2.5 px-4 text-right">{formatINRCompact(row.balance)}</td>
                    <td className="py-2.5 px-4 text-right text-gold">
                      {formatINRCompact(row.periodInterest)}
                    </td>
                    <td className="py-2.5 pl-4 text-right">
                      {formatINRCompact(row.totalInterest)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NRI Tax Note */}
      <div
        className="premium-card p-5 border-l-4"
        style={{ borderLeftColor: fdType === 'NRE' ? 'var(--teal)' : 'var(--warm)' }}
      >
        <div className="flex gap-3">
          <span className="text-lg flex-shrink-0">
            {fdType === 'NRE' ? '\u2705' : '\u26A0\uFE0F'}
          </span>
          <div>
            <h4
              className={`text-sm font-semibold mb-1 ${fdType === 'NRE' ? 'text-teal' : 'text-warm'}`}
            >
              {fdType === 'NRE' ? 'NRE FD — Tax-Free' : 'NRO FD — Taxable'}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {fdType === 'NRE'
                ? 'NRE Fixed Deposits are tax-free in India and fully repatriable. Interest earned is exempt from Indian income tax. However, you must report this income in your US tax return. Consult a cross-border tax advisor.'
                : 'NRO Fixed Deposits are subject to 30% TDS in India (reducible to 15% under US-India DTAA with Form 10F). Interest is also reportable as income in the US. You can claim Foreign Tax Credit (Form 1116) to avoid double taxation.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
