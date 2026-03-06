# NRI Investor App — Phase 1 MVP

## Step 1: Project Bootstrap

- [x] Initialize Next.js 16 with TypeScript, App Router, Tailwind v4, src/ dir
- [x] Install dependencies: shadcn/ui, Recharts, Zustand, Zod, swr, next-themes, lucide-react, sonner
- [x] Configure shadcn/ui and add 16 core components
- [x] Set up ESLint + Prettier + Husky + lint-staged
- [x] Set up folder structure and path aliases (@/ → src/)
- [x] Create .env.example and .gitignore
- [x] Configure Vitest for unit testing

## Step 2: Type Definitions

- [x] Create src/types/country.ts (SupportedCountry, CountryMeta, UserPreferences)
- [x] Create src/types/exchange-rate.ts (ExchangeRate, ExchangeRateHistory, ForexAssumption)
- [x] Create src/types/investment.ts (FixedDepositInput/Result, MutualFundInput/Result, BondInput/Result)
- [x] Create src/types/real-estate.ts (PropertyInput, PropertyResult)
- [x] Create src/types/tax.ts (DTAARate, TaxCalculationInput/Result, NROvsNREComparison)
- [x] Create src/types/comparison.ts (ComparisonResult generic)
- [x] Create src/types/rates.ts (BankFDRate, USCDRate, USHYSARate, USTreasuryRate, etc.)
- [x] Create src/types/api.ts (ApiSuccessResponse, ApiErrorResponse)
- [x] Create src/types/index.ts (barrel re-exports)

## Step 3: Layout & Navigation

- [x] Build header.tsx with breadcrumbs + theme toggle
- [x] Build app-sidebar.tsx with navigation items
- [x] Build theme-toggle.tsx (dark/light/system)
- [x] Build (app)/layout.tsx with SidebarProvider + StoreProviders
- [x] Configure navigation constants (navigation.ts)

## Step 4: Shared Components & Infrastructure

- [x] Set up Zustand stores (settings-store.ts, comparison-store.ts)
- [x] Build store-provider.tsx (SSR-safe context pattern)
- [x] Create constants files (countries.ts, tax-rates.ts, navigation.ts)
- [x] Build utility functions (formatINR, formatUSD, formatPercent, formatRelativeTime)
- [x] Create env.ts (Zod v4 environment validation)

## Step 5: Exchange Rate Integration

- [x] Build exchange-rate-client.ts (Frankfurter API wrapper)
- [x] Build /api/exchange-rate/route.ts (cached server proxy, 1hr revalidate)
- [x] Build use-exchange-rate.ts SWR hook

## Step 6: Rate Directory (KEY FEATURE)

- [x] Create seed data: india-fd-rates.json (13 banks — NRE/NRO, 3 tenures each)
- [x] Create seed data: india-nbfc-rates.json (3 NBFCs)
- [x] Create seed data: india-govt-schemes.json (Post Office FD, NSC, SCSS, RBI Bonds)
- [x] Create seed data: us-cd-rates.json (7 institutions, multiple tenures)
- [x] Create seed data: us-hysa-rates.json (6 institutions)
- [x] Create seed data: us-treasury-rates.json (T-Bills, Notes, I-Bonds, TIPS)
- [x] Create seed data: us-money-market.json (3 funds)
- [x] Build /api/rates/route.ts (GET with country/type/tenure filters)
- [x] Build rates/page.tsx with highlight cards, filterable/sortable table, "Best" badges, comparison picker

## Step 7: FD/CD Comparison Engine

- [x] Build fd-calculator.ts (calculateFDMaturity, calculateAfterTaxReturn, adjustForForex, calculateFDResult)
- [x] Build /api/calculate/fd-compare/route.ts (POST with Zod validation, winner logic, insights generation)
- [x] Build Zod validation schemas (comparison-schema.ts)

## Step 8: FD/CD Comparison UI

- [x] Build compare/fixed-deposits/page.tsx
- [x] Build fd-input-form.tsx (two-column: India FD vs US CD/HYSA/Treasury, NRE/NRO toggle, bank auto-fill)
- [x] Build fd-results.tsx (winner badge, side-by-side results, insights, caveats, save button)
- [x] Build fd-charts.tsx (Recharts bar chart for yields, line chart for growth over tenure)
- [x] Forex assumptions collapsible panel (depreciation slider, hedging cost)

## Step 9: Dashboard

- [x] Build dashboard/page.tsx
- [x] Exchange rate ticker (live from Frankfurter API)
- [x] Best rates summary cards (India NRE FD, US CD, US HYSA)
- [x] Quick compare widget (amount + tenure → instant FD vs CD comparison)

## Step 10: Settings & Landing Page

- [x] Build settings/page.tsx (country, India tax bracket with presets, abroad tax bracket slider, currency, theme)
- [x] Build landing page (hero, feature cards, CTA buttons)

## Step 11: Testing & Polish

- [x] 22 unit tests for fd-calculator.ts (all passing)
- [x] Responsive design verified (mobile, tablet, desktop)
- [x] Dark/light theme verified
- [x] Hydration error fixed (breadcrumb nesting)
- [x] Zero console errors
- [x] npm run build passes with zero errors

---

## Review

### Build Output

- 8 routes: / (landing), /dashboard, /rates, /compare/fixed-deposits, /settings + 3 API routes
- Build compiles in ~4s with Turbopack
- 22/22 unit tests pass in ~2s
- Zero TypeScript errors (strict mode)
- Zero console errors in browser

### Key Metrics

- 13 Indian banks + 3 NBFCs + 4 govt schemes = 20 India rate sources
- 7 US CD institutions + 6 HYSA + 8 Treasury + 3 Money Market = 24 US rate sources
- Live exchange rate from Frankfurter API (free, no key)
- Full NRE/NRO tax treatment with DTAA support for 5 countries

### What's Next (Phase 2)

- [ ] Mutual Fund comparison (mfapi.in integration)
- [ ] Bond/Treasury comparison
- [ ] Tax Advisor with DTAA calculator
- [ ] NRO vs NRE guidance tool
- [ ] Programmatic SEO pages (/compare/sbi-nre-fd-vs-ally-cd)
- [ ] GitHub Actions scraper workflows for automated rate updates
