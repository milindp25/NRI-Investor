'use client';

import { useState } from 'react';
import { DTAACalculator } from './_components/dtaa-calculator';
import { TDSReferenceTable } from './_components/tds-reference-table';
import { NROvsNREGuide } from './_components/nro-vs-nre-guide';

type TabKey = 'dtaa' | 'tds' | 'nro-nre';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'dtaa', label: 'DTAA Calculator' },
  { key: 'tds', label: 'TDS Reference' },
  { key: 'nro-nre', label: 'NRO vs NRE' },
];

export default function TaxAdvisorPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('dtaa');

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Tax <span className="font-serif italic gold-gradient-text">Advisor</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          DTAA benefits, TDS rates, and NRE vs NRO guidance for NRI investors
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 bg-secondary/60 rounded-2xl p-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'gold-gradient-bg text-[#0A0E15] shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'dtaa' && <DTAACalculator />}
        {activeTab === 'tds' && <TDSReferenceTable />}
        {activeTab === 'nro-nre' && <NROvsNREGuide />}
      </div>

      {/* Disclaimer */}
      <footer className="text-center space-y-1 pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          Tax rates are indicative and based on DTAA treaties. Always consult a qualified tax
          advisor.
        </p>
        <p className="text-[10px] text-muted-foreground/60">
          DTAA benefits require valid TRC + Form 10F. Rates may vary based on specific treaty
          provisions.
        </p>
      </footer>
    </div>
  );
}
