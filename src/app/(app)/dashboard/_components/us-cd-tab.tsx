'use client';

import { useState, useMemo } from 'react';
import { useRates } from '@/lib/hooks/use-rates';

type SubTab = 'cd' | 'hysa';

const CD_TERMS = [
  { label: '6 Months', months: 6 },
  { label: '12 Months', months: 12 },
  { label: '24 Months', months: 24 },
  { label: '36 Months', months: 36 },
  { label: '60 Months', months: 60 },
];

function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatUSDPrecise(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getRating(apy: number, bestApy: number): 'best' | 'good' | 'avg' {
  if (apy >= bestApy - 0.05) return 'best';
  if (apy >= bestApy - 0.3) return 'good';
  return 'avg';
}

function RatingBadge({ rating }: { rating: 'best' | 'good' | 'avg' }) {
  const cls = rating === 'best' ? 'rating-best' : rating === 'good' ? 'rating-good' : 'rating-avg';
  const label = rating === 'best' ? 'Best' : rating === 'good' ? 'Good' : 'Avg';
  return <span className={cls}>{label}</span>;
}

export function USCDTab() {
  const { rates, isLoading } = useRates();
  const usCdRates = rates?.usCDRates ?? [];
  const usHysaRates = rates?.usHYSARates ?? [];

  const [subTab, setSubTab] = useState<SubTab>('cd');
  const [amount, setAmount] = useState(10000);
  const [selectedTermMonths, setSelectedTermMonths] = useState(12);
  const [selectedInstitutionRaw, setSelectedInstitution] = useState('');

  // Auto-resolve: use selected if valid, else first available
  const selectedInstitution = useMemo(() => {
    const exists = usCdRates.find((r) => r.institutionId === selectedInstitutionRaw);
    return exists ? selectedInstitutionRaw : usCdRates[0]?.institutionId || '';
  }, [usCdRates, selectedInstitutionRaw]);

  // CD calculations
  const cdResults = useMemo(() => {
    if (subTab !== 'cd') return null;

    const bank = usCdRates.find((r) => r.institutionId === selectedInstitution);
    const tenure = bank?.tenures.find((t) => t.months === selectedTermMonths);
    const apy = tenure?.apy || 0;
    const years = selectedTermMonths / 12;
    const maturity = amount * Math.pow(1 + apy / 100, years);
    const interest = maturity - amount;

    return { maturity, interest, apy, institution: bank?.institution || '' };
  }, [subTab, amount, selectedTermMonths, selectedInstitution, usCdRates]);

  // CD comparison table
  const cdComparison = useMemo(() => {
    const rows = usCdRates
      .map((bank) => {
        const tenure = bank.tenures.find((t) => t.months === selectedTermMonths);
        if (!tenure) return null;
        const apy = tenure.apy;
        const years = selectedTermMonths / 12;
        const maturity = amount * Math.pow(1 + apy / 100, years);
        return {
          institution: bank.institution,
          institutionId: bank.institutionId,
          apy,
          maturity,
          fdicInsured: bank.fdicInsured,
        };
      })
      .filter(Boolean) as Array<{
      institution: string;
      institutionId: string;
      apy: number;
      maturity: number;
      fdicInsured: boolean;
    }>;

    rows.sort((a, b) => b.apy - a.apy);
    const bestApy = rows[0]?.apy || 0;
    return rows.map((r) => ({ ...r, rating: getRating(r.apy, bestApy) }));
  }, [amount, selectedTermMonths, usCdRates]);

  // CD projection breakdown
  const cdProjection = useMemo(() => {
    if (subTab !== 'cd' || !cdResults) return [];
    const apy = cdResults.apy;
    const periods: Array<{
      period: string;
      balance: number;
      periodInterest: number;
      totalInterest: number;
    }> = [];
    let cumulativeInterest = 0;

    const totalMonths = selectedTermMonths;
    const step = totalMonths <= 12 ? 3 : totalMonths <= 24 ? 6 : 12;

    for (let m = step; m <= totalMonths; m += step) {
      const years = m / 12;
      const balance = amount * Math.pow(1 + apy / 100, years);
      const totalInt = balance - amount;
      const periodInt = totalInt - cumulativeInterest;
      cumulativeInterest = totalInt;
      periods.push({
        period: m < 12 ? `${m} Months` : m === 12 ? '1 Year' : `${m / 12} Years`,
        balance,
        periodInterest: periodInt,
        totalInterest: totalInt,
      });
    }

    // Add final period if not already included
    if (
      periods.length === 0 ||
      periods[periods.length - 1].period !==
        (totalMonths < 12
          ? `${totalMonths} Months`
          : totalMonths === 12
            ? '1 Year'
            : `${totalMonths / 12} Years`)
    ) {
      const years = totalMonths / 12;
      const balance = amount * Math.pow(1 + apy / 100, years);
      const totalInt = balance - amount;
      const periodInt = totalInt - cumulativeInterest;
      periods.push({
        period:
          totalMonths < 12
            ? `${totalMonths} Months`
            : totalMonths === 12
              ? '1 Year'
              : `${totalMonths / 12} Years`,
        balance,
        periodInterest: periodInt,
        totalInterest: totalInt,
      });
    }

    return periods;
  }, [subTab, cdResults, amount, selectedTermMonths]);

  // HYSA calculations
  const hysaResults = useMemo(() => {
    if (subTab !== 'hysa' || usHysaRates.length === 0) return null;
    const sorted = [...usHysaRates].sort((a, b) => b.apy - a.apy);
    const best = sorted[0];
    const interest12m = amount * (best.apy / 100);
    return {
      bestBank: best.institution,
      apy: best.apy,
      interest12m,
      balance12m: amount + interest12m,
    };
  }, [subTab, amount, usHysaRates]);

  const hysaComparison = useMemo(() => {
    const sorted = [...usHysaRates].sort((a, b) => b.apy - a.apy);
    const bestApy = sorted[0]?.apy || 0;
    return sorted.map((r) => ({
      institution: r.institution,
      apy: r.apy,
      interest12m: amount * (r.apy / 100),
      balance12m: amount + amount * (r.apy / 100),
      fdicInsured: r.fdicInsured,
      rating: getRating(r.apy, bestApy),
    }));
  }, [amount, usHysaRates]);

  const selectedBank = usCdRates.find((r) => r.institutionId === selectedInstitution);
  const availableTerms = selectedBank?.tenures.map((t) => t.months) || [];

  if (isLoading && !rates) {
    return (
      <div className="premium-card p-6">
        <p className="text-center text-muted-foreground py-8">Loading rates…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card header */}
      <div className="premium-card p-6">
        <h2 className="text-xl font-semibold mb-1">US CD &amp; High-Yield Savings</h2>
        <p className="text-sm text-muted-foreground mb-5">
          FDIC-insured. Rates fetched live — click &quot;Edit Rates&quot; above to override any
          value.
        </p>

        {/* Sub-tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSubTab('cd')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              subTab === 'cd'
                ? 'gold-gradient-bg text-[#0A0E15]'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            Certificate of Deposit
          </button>
          <button
            onClick={() => setSubTab('hysa')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              subTab === 'hysa'
                ? 'gold-gradient-bg text-[#0A0E15]'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            High-Yield Savings
          </button>
        </div>

        {/* Input fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">
              Amount (USD)
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

          {subTab === 'cd' && (
            <>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">
                  CD Term
                </label>
                <select
                  value={selectedTermMonths}
                  onChange={(e) => setSelectedTermMonths(Number(e.target.value))}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring appearance-none"
                >
                  {CD_TERMS.filter((t) => availableTerms.includes(t.months)).map((t) => (
                    <option key={t.months} value={t.months}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">
                  Institution
                </label>
                <div className="relative">
                  <select
                    value={selectedInstitution}
                    onChange={(e) => setSelectedInstitution(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring appearance-none pr-20"
                  >
                    {usCdRates.map((bank) => (
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
            </>
          )}
        </div>

        {/* Hero results panel */}
        {subTab === 'cd' && cdResults && (
          <div className="premium-card-highlight p-6 mb-0">
            <div className="text-center mb-4">
              <div className="hero-number gold-gradient-text">
                {formatUSDPrecise(cdResults.maturity)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Interest: {formatUSDPrecise(cdResults.interest)} at {cdResults.apy.toFixed(2)}% APY{' '}
                &middot; FDIC Insured
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-secondary rounded-xl p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">Principal</div>
                <div className="text-lg font-semibold">{formatUSD(amount)}</div>
              </div>
              <div className="bg-secondary rounded-xl p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">Interest</div>
                <div className="text-lg font-semibold text-gold">
                  {formatUSDPrecise(cdResults.interest)}
                </div>
              </div>
              <div className="bg-secondary rounded-xl p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">APY</div>
                <div className="text-lg font-semibold text-gold">{cdResults.apy.toFixed(2)}%</div>
              </div>
            </div>
          </div>
        )}

        {subTab === 'hysa' && hysaResults && (
          <div className="premium-card-highlight p-6 mb-0">
            <div className="text-center mb-4">
              <div className="hero-number gold-gradient-text">
                {formatUSDPrecise(hysaResults.balance12m)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                12-month balance at {hysaResults.apy.toFixed(2)}% APY &middot;{' '}
                {hysaResults.bestBank} &middot; FDIC Insured
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-secondary rounded-xl p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">Deposit</div>
                <div className="text-lg font-semibold">{formatUSD(amount)}</div>
              </div>
              <div className="bg-secondary rounded-xl p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">12-Mo Interest</div>
                <div className="text-lg font-semibold text-gold">
                  {formatUSDPrecise(hysaResults.interest12m)}
                </div>
              </div>
              <div className="bg-secondary rounded-xl p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">APY</div>
                <div className="text-lg font-semibold text-gold">{hysaResults.apy.toFixed(2)}%</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Comparison Table */}
      {subTab === 'cd' && (
        <div className="premium-card p-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            CD Comparison —{' '}
            {selectedTermMonths < 12 ? `${selectedTermMonths} Mo` : `${selectedTermMonths / 12} Yr`}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium">
                    Institution
                  </th>
                  <th className="text-right py-2 px-4 text-muted-foreground font-medium">APY</th>
                  <th className="text-right py-2 px-4 text-muted-foreground font-medium">
                    You Get
                  </th>
                  <th className="text-right py-2 pl-4 text-muted-foreground font-medium">Rating</th>
                </tr>
              </thead>
              <tbody>
                {cdComparison.map((row, i) => (
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
                      {row.apy.toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-4 text-right">{formatUSDPrecise(row.maturity)}</td>
                    <td className="py-2.5 pl-4 text-right">
                      <RatingBadge rating={row.rating} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'hysa' && (
        <div className="premium-card p-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            High-Yield Savings Comparison
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium">
                    Institution
                  </th>
                  <th className="text-right py-2 px-4 text-muted-foreground font-medium">APY</th>
                  <th className="text-right py-2 px-4 text-muted-foreground font-medium">
                    12-Mo Interest
                  </th>
                  <th className="text-right py-2 pl-4 text-muted-foreground font-medium">Rating</th>
                </tr>
              </thead>
              <tbody>
                {hysaComparison.map((row, i) => (
                  <tr
                    key={row.institution}
                    className="border-b border-border/50"
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
                      {row.apy.toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-4 text-right">{formatUSDPrecise(row.interest12m)}</td>
                    <td className="py-2.5 pl-4 text-right">
                      <RatingBadge rating={row.rating} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Projection Breakdown (CD only) */}
      {subTab === 'cd' && cdProjection.length > 0 && (
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
                {cdProjection.map((row) => (
                  <tr key={row.period} className="border-b border-border/50">
                    <td className="py-2.5 pr-4">{row.period}</td>
                    <td className="py-2.5 px-4 text-right">{formatUSDPrecise(row.balance)}</td>
                    <td className="py-2.5 px-4 text-right text-gold">
                      {formatUSDPrecise(row.periodInterest)}
                    </td>
                    <td className="py-2.5 pl-4 text-right">
                      {formatUSDPrecise(row.totalInterest)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NRI Tax Note */}
      <div className="premium-card p-5 border-l-4" style={{ borderLeftColor: 'var(--warm)' }}>
        <div className="flex gap-3">
          <span className="text-warm text-lg flex-shrink-0">&#9888;&#65039;</span>
          <div>
            <h4 className="text-sm font-semibold text-warm mb-1">NRI Tax Note</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              US CD/HYSA interest is subject to 30% federal withholding for non-residents (reducible
              to 15% under US-India tax treaty with a valid W-8BEN). Also reportable as income in
              India. Consult a cross-border tax advisor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
