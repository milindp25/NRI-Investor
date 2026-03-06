'use client';

import { useState, useMemo } from 'react';
import type { USCDRate, USHYSARate, BankFDRate } from '@/types';
import usCdRatesData from '@/data/rates/us-cd-rates.json';
import usHysaRatesData from '@/data/rates/us-hysa-rates.json';
import indiaFdRatesData from '@/data/rates/india-fd-rates.json';

const usCdRates = usCdRatesData as USCDRate[];
const usHysaRates = usHysaRatesData as USHYSARate[];
const indiaFdRates = indiaFdRatesData as BankFDRate[];

function getRating(rate: number, bestRate: number): 'best' | 'good' | 'avg' {
  if (rate >= bestRate - 0.15) return 'best';
  if (rate >= bestRate - 0.5) return 'good';
  return 'avg';
}

function RatingBadge({ rating }: { rating: 'best' | 'good' | 'avg' }) {
  const cls = rating === 'best' ? 'rating-best' : rating === 'good' ? 'rating-good' : 'rating-avg';
  const label = rating === 'best' ? 'Best' : rating === 'good' ? 'Good' : 'Avg';
  return <span className={cls}>{label}</span>;
}

export function CompareTab() {
  const [tenureMonths, setTenureMonths] = useState(12);
  const [amountUSD, setAmountUSD] = useState(10000);
  const [exchangeRate] = useState(84.5);

  // Build a unified comparison
  const allProducts = useMemo(() => {
    const products: Array<{
      product: string;
      institution: string;
      rate: number;
      maturityUSD: number;
      type: 'US CD' | 'US HYSA' | 'NRE FD' | 'NRO FD' | 'FCNR';
      taxNote: string;
      rating: 'best' | 'good' | 'avg';
    }> = [];

    // US CDs
    for (const bank of usCdRates) {
      const tenure = bank.tenures.find((t) => t.months === tenureMonths);
      if (!tenure) continue;
      const apy = tenure.apy;
      const years = tenureMonths / 12;
      const maturity = amountUSD * Math.pow(1 + apy / 100, years);
      products.push({
        product: 'US CD',
        institution: bank.institution,
        rate: apy,
        maturityUSD: maturity,
        type: 'US CD',
        taxNote: '30% withholding (15% w/ W-8BEN)',
        rating: 'avg',
      });
    }

    // US HYSA (only for 12-month comparison)
    if (tenureMonths === 12) {
      for (const bank of usHysaRates) {
        const interest = amountUSD * (bank.apy / 100);
        products.push({
          product: 'US HYSA',
          institution: bank.institution,
          rate: bank.apy,
          maturityUSD: amountUSD + interest,
          type: 'US HYSA',
          taxNote: '30% withholding (15% w/ W-8BEN)',
          rating: 'avg',
        });
      }
    }

    // India NRE FDs
    const nreFDs = indiaFdRates.filter((r) => r.accountType === 'NRE');
    for (const bank of nreFDs) {
      const tenure = bank.tenures.find((t) => t.months === tenureMonths);
      if (!tenure) continue;
      const rate = tenure.rate;
      const principalINR = amountUSD * exchangeRate;
      const years = tenureMonths / 12;
      const n = 4; // quarterly
      const maturityINR = principalINR * Math.pow(1 + rate / 100 / n, n * years);
      const maturityUSD = maturityINR / exchangeRate; // simplified, ignoring depreciation
      products.push({
        product: 'NRE FD',
        institution: bank.institution,
        rate,
        maturityUSD,
        type: 'NRE FD',
        taxNote: 'Tax-free in India',
        rating: 'avg',
      });
    }

    // India NRO FDs
    const nroFDs = indiaFdRates.filter((r) => r.accountType === 'NRO');
    for (const bank of nroFDs) {
      const tenure = bank.tenures.find((t) => t.months === tenureMonths);
      if (!tenure) continue;
      const rate = tenure.rate;
      const principalINR = amountUSD * exchangeRate;
      const years = tenureMonths / 12;
      const n = 4;
      const maturityINR = principalINR * Math.pow(1 + rate / 100 / n, n * years);
      const interestINR = maturityINR - principalINR;
      const tds = interestINR * 0.3;
      const netMaturityINR = maturityINR - tds;
      const maturityUSD = netMaturityINR / exchangeRate;
      products.push({
        product: 'NRO FD',
        institution: bank.institution,
        rate,
        maturityUSD,
        type: 'NRO FD',
        taxNote: '30% TDS (15% w/ DTAA)',
        rating: 'avg',
      });
    }

    // Sort by maturityUSD descending
    products.sort((a, b) => b.maturityUSD - a.maturityUSD);

    // Assign ratings based on effective return
    const bestReturn = products[0]?.maturityUSD || 0;
    const bestRate = ((bestReturn / amountUSD - 1) * 100) / (tenureMonths / 12);
    return products.map((p) => {
      const effectiveRate = ((p.maturityUSD / amountUSD - 1) * 100) / (tenureMonths / 12);
      return { ...p, rating: getRating(effectiveRate, bestRate) };
    });
  }, [tenureMonths, amountUSD, exchangeRate]);

  const productTypeColors: Record<string, string> = {
    'US CD': 'bg-[rgba(91,155,213,0.15)] text-info',
    'US HYSA': 'bg-[rgba(91,155,213,0.15)] text-info',
    'NRE FD': 'bg-[rgba(62,201,167,0.15)] text-teal',
    'NRO FD': 'bg-[rgba(224,123,85,0.15)] text-warm',
    FCNR: 'bg-[rgba(124,108,212,0.15)] text-psu',
  };

  return (
    <div className="space-y-6">
      <div className="premium-card p-6">
        <h2 className="text-xl font-semibold mb-1">Compare All Products</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Side-by-side comparison of all investment options. Effective returns normalized to USD for
          fair comparison. NRE/NRO maturity uses constant exchange rate (simplified).
        </p>

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
                value={amountUSD}
                onChange={(e) => setAmountUSD(Number(e.target.value) || 0)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 pl-7 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">
              Tenure
            </label>
            <select
              value={tenureMonths}
              onChange={(e) => setTenureMonths(Number(e.target.value))}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring appearance-none"
            >
              <option value={12}>1 Year</option>
              <option value={24}>2 Years</option>
              <option value={36}>3 Years</option>
              <option value={60}>5 Years</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">
              USD/INR Rate
            </label>
            <div className="text-sm text-foreground bg-secondary border border-border rounded-lg px-3 py-2">
              {exchangeRate.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-secondary rounded-xl p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Best Return</div>
            <div className="text-lg font-semibold gold-gradient-text">
              ${allProducts[0]?.maturityUSD.toFixed(0) || '0'}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {allProducts[0]?.institution || ''}
            </div>
          </div>
          <div className="bg-secondary rounded-xl p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Best Product</div>
            <div className="text-lg font-semibold text-teal">{allProducts[0]?.product || '-'}</div>
          </div>
          <div className="bg-secondary rounded-xl p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Products Compared</div>
            <div className="text-lg font-semibold">{allProducts.length}</div>
          </div>
        </div>
      </div>

      {/* Full comparison table */}
      <div className="premium-card p-6">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          All Products — {tenureMonths === 12 ? '1 Yr' : `${tenureMonths / 12} Yr`} · Sorted by
          Effective Return
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-2 text-muted-foreground font-medium">#</th>
                <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Product</th>
                <th className="text-left py-2 px-4 text-muted-foreground font-medium">
                  Institution
                </th>
                <th className="text-right py-2 px-4 text-muted-foreground font-medium">Rate</th>
                <th className="text-right py-2 px-4 text-muted-foreground font-medium">
                  Maturity (USD)
                </th>
                <th className="text-left py-2 px-4 text-muted-foreground font-medium">Tax</th>
                <th className="text-right py-2 pl-4 text-muted-foreground font-medium">Rating</th>
              </tr>
            </thead>
            <tbody>
              {allProducts.slice(0, 20).map((row, i) => (
                <tr
                  key={`${row.type}-${row.institution}-${i}`}
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
                  <td className="py-2.5 pr-2 pl-3 text-muted-foreground">{i + 1}</td>
                  <td className="py-2.5 pr-4">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${productTypeColors[row.product] || ''}`}
                    >
                      {row.product}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">{row.institution}</td>
                  <td className="py-2.5 px-4 text-right text-gold font-medium">
                    {row.rate.toFixed(2)}%
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium">
                    ${row.maturityUSD.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 text-xs text-muted-foreground">{row.taxNote}</td>
                  <td className="py-2.5 pl-4 text-right">
                    <RatingBadge rating={row.rating} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {allProducts.length > 20 && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Showing top 20 of {allProducts.length} products
          </p>
        )}
      </div>

      {/* Note */}
      <div className="premium-card p-5 border-l-4" style={{ borderLeftColor: 'var(--info)' }}>
        <div className="flex gap-3">
          <span className="text-lg flex-shrink-0">&#8505;&#65039;</span>
          <div>
            <h4 className="text-sm font-semibold text-info mb-1">Comparison Assumptions</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This comparison uses a constant USD/INR exchange rate of {exchangeRate} and does not
              account for INR depreciation. NRO returns are shown after 30% TDS. Actual returns will
              vary based on currency movements, tax treaties, and market conditions. Always consult
              a qualified financial advisor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
