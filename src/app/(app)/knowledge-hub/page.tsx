'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock, ChevronRight } from 'lucide-react';

interface Article {
  slug: string;
  title: string;
  description: string;
  category: 'accounts' | 'tax' | 'investment' | 'regulation' | 'property';
  readingTimeMinutes: number;
  lastUpdated: string;
}

const ARTICLES: Article[] = [
  {
    slug: 'nre-vs-nro',
    title: 'NRE vs NRO Accounts',
    description:
      'Understand the key differences between NRE and NRO accounts — tax treatment, repatriation rules, and when to use each.',
    category: 'accounts',
    readingTimeMinutes: 5,
    lastUpdated: '2026-03-01',
  },
  {
    slug: 'dtaa-explained',
    title: 'DTAA Treaty Benefits',
    description:
      'How Double Taxation Avoidance Agreements work, how to claim benefits, and country-specific treaty highlights.',
    category: 'tax',
    readingTimeMinutes: 7,
    lastUpdated: '2026-03-01',
  },
  {
    slug: 'fema-guide',
    title: 'FEMA Compliance Guide',
    description:
      'Repatriation limits, investment restrictions, and reporting requirements under FEMA for NRIs.',
    category: 'regulation',
    readingTimeMinutes: 6,
    lastUpdated: '2026-03-01',
  },
  {
    slug: 'nri-property-rules',
    title: 'NRI Property Investment',
    description:
      'FEMA restrictions on property purchase, tax on sale proceeds, stamp duty, and repatriation of sale proceeds.',
    category: 'property',
    readingTimeMinutes: 8,
    lastUpdated: '2026-03-01',
  },
  {
    slug: 'tax-filing-checklist',
    title: 'NRI Tax Filing Checklist',
    description:
      'ITR forms, filing deadlines, documents needed, and common mistakes NRIs make when filing taxes in India.',
    category: 'tax',
    readingTimeMinutes: 6,
    lastUpdated: '2026-03-01',
  },
];

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'accounts', label: 'Accounts' },
  { key: 'tax', label: 'Tax' },
  { key: 'investment', label: 'Investments' },
  { key: 'regulation', label: 'Regulations' },
  { key: 'property', label: 'Property' },
];

const CATEGORY_BADGE: Record<string, string> = {
  accounts: 'type-pvt',
  tax: 'type-psu',
  investment: 'type-pvt',
  regulation: 'type-psu',
  property: 'type-pvt',
};

export default function KnowledgeHubPage() {
  const [activeCategory, setActiveCategory] = useState('all');

  const filtered =
    activeCategory === 'all' ? ARTICLES : ARTICLES.filter((a) => a.category === activeCategory);

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Knowledge <span className="font-serif italic gold-gradient-text">Hub</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Essential guides for NRI investors — accounts, tax, FEMA, and property
        </p>
      </div>

      {/* Glossary */}
      <div className="premium-card p-5 space-y-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
          Key Terms
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-sm">
          {[
            ['NRI', 'Non-Resident Indian'],
            ['NRE', 'Non-Resident External (Account)'],
            ['NRO', 'Non-Resident Ordinary (Account)'],
            ['FCNR', 'Foreign Currency Non-Resident (Deposit)'],
            ['DTAA', 'Double Taxation Avoidance Agreement'],
            ['FEMA', 'Foreign Exchange Management Act'],
            ['TDS', 'Tax Deducted at Source'],
            ['TRC', 'Tax Residency Certificate'],
            ['ITR', 'Income Tax Return'],
            ['PIS', 'Portfolio Investment Scheme'],
            ['LTCG', 'Long-Term Capital Gains'],
            ['STCG', 'Short-Term Capital Gains'],
          ].map(([abbr, full]) => (
            <div key={abbr} className="flex items-baseline gap-2 py-1">
              <span className="font-mono text-gold text-xs font-semibold shrink-0 w-11">
                {abbr}
              </span>
              <span className="text-muted-foreground text-xs">{full}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-1 bg-secondary/60 rounded-2xl p-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeCategory === cat.key
                ? 'gold-gradient-bg text-[#0A0E15] shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Article Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((article) => (
          <Link
            key={article.slug}
            href={`/knowledge-hub/${article.slug}`}
            className="premium-card p-5 hover:border-gold/30 transition-colors group"
          >
            <div className="flex items-start justify-between mb-3">
              <span className={CATEGORY_BADGE[article.category]}>
                {article.category.toUpperCase()}
              </span>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                <Clock className="size-3" />
                {article.readingTimeMinutes} min
              </div>
            </div>
            <h3 className="font-semibold mb-1.5 group-hover:text-gold transition-colors">
              {article.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{article.description}</p>
            <div className="flex items-center gap-1 mt-3 text-xs text-gold opacity-0 group-hover:opacity-100 transition-opacity">
              Read article <ChevronRight className="size-3" />
            </div>
          </Link>
        ))}
      </div>

      {/* Disclaimer */}
      <footer className="text-center pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          Content is for educational purposes. Always consult qualified professionals for specific
          advice.
        </p>
      </footer>
    </div>
  );
}
