'use client';

import { useState } from 'react';
import { USCDTab } from './_components/us-cd-tab';
import { IndiaFDTab } from './_components/india-fd-tab';
import { FCNRTab } from './_components/fcnr-tab';
import { CompareTab } from './_components/compare-tab';
import { StocksTab } from './_components/stocks-tab';

type TabKey = 'us-cd' | 'india-fd' | 'fcnr' | 'compare' | 'stocks';

const TABS: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: 'us-cd', label: 'US CD + Savings', icon: '\uD83C\uDDFA\uD83C\uDDF8' },
  { key: 'india-fd', label: 'NRE / NRO FD', icon: '\uD83C\uDDEE\uD83C\uDDF3' },
  { key: 'fcnr', label: 'FCNR', icon: '\uD83D\uDCB1' },
  { key: 'compare', label: 'Compare All', icon: '\u2696\uFE0F' },
  { key: 'stocks', label: 'Stocks / ETFs', icon: '\uD83D\uDCC8' },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('us-cd');

  return (
    <div className="py-8 space-y-8">
      {/* Header Section */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl gold-gradient-bg text-[#0A0E15] font-bold text-lg">
          &#8377;
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            NRI <span className="font-serif italic gold-gradient-text">Investment</span> Calculator
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Live rates &middot; US CDs &amp; Savings &middot; Indian NRE / NRO / FCNR &middot; PSU
            &amp; Private Banks
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 bg-secondary/60 rounded-2xl p-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'gold-gradient-bg text-[#0A0E15] shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'us-cd' && <USCDTab />}
        {activeTab === 'india-fd' && <IndiaFDTab />}
        {activeTab === 'fcnr' && <FCNRTab />}
        {activeTab === 'compare' && <CompareTab />}
        {activeTab === 'stocks' && <StocksTab />}
      </div>

      {/* Footer */}
      <footer className="text-center space-y-1 pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          NRI Investment Calculator &middot; Always verify rates before investing
        </p>
        <p className="text-[10px] text-muted-foreground/60">
          Not financial advice &middot; US: NerdWallet/Curinos data &middot; India: RBI-regulated
          bank data
        </p>
      </footer>
    </div>
  );
}
