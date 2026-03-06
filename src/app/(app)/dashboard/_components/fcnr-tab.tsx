'use client';

import { useState, useMemo } from 'react';

// FCNR seed data (no JSON file exists yet)
const FCNR_RATES = [
  {
    institution: 'State Bank of India',
    institutionId: 'sbi',
    isPSU: true,
    rates: { 12: 5.35, 24: 5.5, 36: 5.15, 60: 4.9 },
  },
  {
    institution: 'HDFC Bank',
    institutionId: 'hdfc-bank',
    isPSU: false,
    rates: { 12: 5.5, 24: 5.65, 36: 5.25, 60: 5.0 },
  },
  {
    institution: 'ICICI Bank',
    institutionId: 'icici-bank',
    isPSU: false,
    rates: { 12: 5.45, 24: 5.55, 36: 5.2, 60: 4.95 },
  },
  {
    institution: 'Axis Bank',
    institutionId: 'axis-bank',
    isPSU: false,
    rates: { 12: 5.4, 24: 5.6, 36: 5.2, 60: 5.0 },
  },
  {
    institution: 'Kotak Mahindra Bank',
    institutionId: 'kotak',
    isPSU: false,
    rates: { 12: 5.3, 24: 5.45, 36: 5.1, 60: 4.85 },
  },
  {
    institution: 'Punjab National Bank',
    institutionId: 'pnb',
    isPSU: true,
    rates: { 12: 5.3, 24: 5.45, 36: 5.1, 60: 4.85 },
  },
  {
    institution: 'Bank of Baroda',
    institutionId: 'bob',
    isPSU: true,
    rates: { 12: 5.25, 24: 5.4, 36: 5.05, 60: 4.8 },
  },
  {
    institution: 'Canara Bank',
    institutionId: 'canara',
    isPSU: true,
    rates: { 12: 5.2, 24: 5.35, 36: 5.0, 60: 4.75 },
  },
  {
    institution: 'IndusInd Bank',
    institutionId: 'indusind',
    isPSU: false,
    rates: { 12: 5.6, 24: 5.75, 36: 5.35, 60: 5.1 },
  },
  {
    institution: 'Yes Bank',
    institutionId: 'yes-bank',
    isPSU: false,
    rates: { 12: 5.55, 24: 5.7, 36: 5.3, 60: 5.05 },
  },
];

const TENURE_OPTIONS = [
  { label: '1 Year', months: 12 },
  { label: '2 Years', months: 24 },
  { label: '3 Years', months: 36 },
  { label: '5 Years', months: 60 },
];

const CURRENCIES = ['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'JPY'];

function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getRating(rate: number, bestRate: number): 'best' | 'good' | 'avg' {
  if (rate >= bestRate - 0.1) return 'best';
  if (rate >= bestRate - 0.4) return 'good';
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

export function FCNRTab() {
  const [amount, setAmount] = useState(10000);
  const [currency, setCurrency] = useState('USD');
  const [selectedTenureMonths, setSelectedTenureMonths] = useState(24);
  const [selectedInstitution, setSelectedInstitution] = useState('indusind');

  const selectedBank =
    FCNR_RATES.find((r) => r.institutionId === selectedInstitution) || FCNR_RATES[0];
  const rate = selectedBank.rates[selectedTenureMonths as keyof typeof selectedBank.rates] || 0;

  const result = useMemo(() => {
    const years = selectedTenureMonths / 12;
    // FCNR compounds quarterly
    const n = 4;
    const maturity = amount * Math.pow(1 + rate / 100 / n, n * years);
    const interest = maturity - amount;
    return { maturity, interest, rate };
  }, [amount, selectedTenureMonths, rate]);

  const comparison = useMemo(() => {
    const rows = FCNR_RATES.map((bank) => {
      const r = bank.rates[selectedTenureMonths as keyof typeof bank.rates] || 0;
      const years = selectedTenureMonths / 12;
      const n = 4;
      const maturity = amount * Math.pow(1 + r / 100 / n, n * years);
      return {
        institution: bank.institution,
        institutionId: bank.institutionId,
        rate: r,
        maturity,
        isPSU: bank.isPSU,
      };
    });

    rows.sort((a, b) => b.rate - a.rate);
    const bestRate = rows[0]?.rate || 0;
    return rows.map((r) => ({ ...r, rating: getRating(r.rate, bestRate) }));
  }, [amount, selectedTenureMonths]);

  return (
    <div className="space-y-6">
      <div className="premium-card p-6">
        <h2 className="text-xl font-semibold mb-1">FCNR Fixed Deposit</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Foreign Currency Non-Resident deposits. Denominated in foreign currency — no forex risk.
          Tax-free in India, fully repatriable. Min tenure: 1 year, max: 5 years.
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
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 pl-7 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring appearance-none"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
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
              Bank
            </label>
            <div className="relative">
              <select
                value={selectedInstitution}
                onChange={(e) => setSelectedInstitution(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring appearance-none pr-24"
              >
                {FCNR_RATES.map((bank) => (
                  <option key={bank.institutionId} value={bank.institutionId}>
                    {bank.institution}
                  </option>
                ))}
              </select>
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold bg-[rgba(200,151,42,0.15)] text-gold-light px-2 py-0.5 rounded-full uppercase tracking-wider">
                Estimated
              </span>
            </div>
          </div>
        </div>

        {/* Hero results */}
        <div className="premium-card-highlight p-6 mb-0">
          <div className="text-center mb-4">
            <div className="hero-number gold-gradient-text">{formatUSD(result.maturity)}</div>
            <p className="text-sm text-muted-foreground mt-2">
              Interest: {formatUSD(result.interest)} at {rate.toFixed(2)}% p.a. &middot; Tax-Free
              &middot; No Forex Risk
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-secondary rounded-xl p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Principal ({currency})</div>
              <div className="text-lg font-semibold">{formatUSD(amount)}</div>
            </div>
            <div className="bg-secondary rounded-xl p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Interest</div>
              <div className="text-lg font-semibold text-gold">{formatUSD(result.interest)}</div>
            </div>
            <div className="bg-secondary rounded-xl p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Tax Status</div>
              <div className="text-lg font-semibold text-teal">Tax-Free</div>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="premium-card p-6">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          FCNR Comparison —{' '}
          {selectedTenureMonths < 12
            ? `${selectedTenureMonths} Mo`
            : selectedTenureMonths === 12
              ? '1 Yr'
              : `${selectedTenureMonths / 12} Yr`}{' '}
          ({currency})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Bank</th>
                <th className="text-right py-2 px-4 text-muted-foreground font-medium">
                  Rate P.A.
                </th>
                <th className="text-right py-2 px-4 text-muted-foreground font-medium">Maturity</th>
                <th className="text-center py-2 px-4 text-muted-foreground font-medium">Type</th>
                <th className="text-right py-2 pl-4 text-muted-foreground font-medium">Rating</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row, i) => (
                <tr
                  key={row.institutionId}
                  className={`border-b border-border/50 ${
                    row.institutionId === selectedInstitution ? 'bg-secondary/50' : ''
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
                  <td className="py-2.5 px-4 text-right">{formatUSD(row.maturity)}</td>
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

      {/* FCNR Info Note */}
      <div className="premium-card p-5 border-l-4" style={{ borderLeftColor: 'var(--teal)' }}>
        <div className="flex gap-3">
          <span className="text-lg flex-shrink-0">{'\u2705'}</span>
          <div>
            <h4 className="text-sm font-semibold text-teal mb-1">FCNR — No Forex Risk</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              FCNR deposits are denominated in foreign currency, eliminating exchange rate risk.
              Interest is tax-free in India and the deposit is fully repatriable. Minimum tenure is
              1 year, maximum 5 years. Rates are typically lower than NRE/NRO FDs since there is no
              currency risk premium.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
