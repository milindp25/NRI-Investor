'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Info, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { BankFDRate, USCDRate, USHYSARate, USTreasuryRate, RateDirectory } from '@/types';

// ── Types ──────────────────────────────────────────────────────────
export type USProductType = 'cd' | 'hysa' | 'treasury';

export interface IndiaFDFormData {
  bankId: string;
  accountType: 'NRE' | 'NRO';
  principal: number;
  interestRate: number;
  tenureMonths: number;
  compounding: 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
}

export interface USInvestmentFormData {
  institutionId: string;
  productType: USProductType;
  principal: number;
  apy: number;
  tenureMonths: number;
  compounding: 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
}

export interface ForexFormData {
  annualDepreciation: number;
  includeHedging: boolean;
  hedgingCost: number;
}

export interface FDInputFormProps {
  onCompare: (india: IndiaFDFormData, us: USInvestmentFormData, forex: ForexFormData) => void;
  isLoading: boolean;
  errors: Record<string, string>;
}

// ── Constants ──────────────────────────────────────────────────────
const TENURE_OPTIONS = [
  { value: '6', label: '6 months' },
  { value: '12', label: '12 months (1 year)' },
  { value: '18', label: '18 months' },
  { value: '24', label: '24 months (2 years)' },
  { value: '36', label: '36 months (3 years)' },
  { value: '48', label: '48 months (4 years)' },
  { value: '60', label: '60 months (5 years)' },
];

const COMPOUNDING_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half-yearly', label: 'Half-Yearly' },
  { value: 'yearly', label: 'Yearly' },
];

// ── Helper: InfoTooltip ────────────────────────────────────────────
function InfoTooltip({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="inline size-3.5 text-muted-foreground cursor-help ml-1" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p>{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Helper: Label ──────────────────────────────────────────────────
function FieldLabel({
  children,
  tooltip,
  htmlFor,
}: {
  children: React.ReactNode;
  tooltip?: string;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
    >
      {children}
      {tooltip && <InfoTooltip text={tooltip} />}
    </label>
  );
}

// ── Helper: FieldError ─────────────────────────────────────────────
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

// ── Main Component ─────────────────────────────────────────────────
export function FDInputForm({ onCompare, isLoading, errors }: FDInputFormProps) {
  // India FD state
  const [indiaBank, setIndiaBank] = useState('');
  const [indiaAccountType, setIndiaAccountType] = useState<'NRE' | 'NRO'>('NRE');
  const [indiaPrincipal, setIndiaPrincipal] = useState('');
  const [indiaRate, setIndiaRate] = useState('');
  const [indiaTenure, setIndiaTenure] = useState('12');
  const [indiaCompounding, setIndiaCompounding] = useState<
    'monthly' | 'quarterly' | 'half-yearly' | 'yearly'
  >('quarterly');

  // US investment state
  const [usInstitution, setUsInstitution] = useState('');
  const [usProductType, setUsProductType] = useState<USProductType>('cd');
  const [usPrincipal, setUsPrincipal] = useState('');
  const [usApy, setUsApy] = useState('');
  const [usTenure, setUsTenure] = useState('12');
  const [usCompounding, setUsCompounding] = useState<
    'monthly' | 'quarterly' | 'half-yearly' | 'yearly'
  >('quarterly');

  // Forex state
  const [forexOpen, setForexOpen] = useState(false);
  const [annualDepreciation, setAnnualDepreciation] = useState(-3);
  const [includeHedging, setIncludeHedging] = useState(false);
  const [hedgingCost, setHedgingCost] = useState(0);

  // Rate data
  const [indiaRates, setIndiaRates] = useState<BankFDRate[]>([]);
  const [usCDRates, setUsCDRates] = useState<USCDRate[]>([]);
  const [usHYSARates, setUsHYSARates] = useState<USHYSARate[]>([]);
  const [usTreasuryRates, setUsTreasuryRates] = useState<USTreasuryRate[]>([]);
  const [ratesLoading, setRatesLoading] = useState(true);

  // Fetch rates on mount
  useEffect(() => {
    async function fetchRates() {
      setRatesLoading(true);
      try {
        const [indiaRes, usRes] = await Promise.all([
          fetch('/api/rates?country=india'),
          fetch('/api/rates?country=us'),
        ]);
        const indiaData = (await indiaRes.json()) as { data: Partial<RateDirectory> };
        const usData = (await usRes.json()) as { data: Partial<RateDirectory> };

        setIndiaRates(indiaData.data.indiaFDRates ?? []);
        setUsCDRates(usData.data.usCDRates ?? []);
        setUsHYSARates(usData.data.usHYSARates ?? []);
        setUsTreasuryRates(usData.data.usTreasuryRates ?? []);
      } catch {
        // Rates will just be empty, user can enter manually
      } finally {
        setRatesLoading(false);
      }
    }
    fetchRates();
  }, []);

  // Filtered India banks by account type (deduplicated)
  const filteredIndiaBanks = useMemo(() => {
    return indiaRates.filter((r) => r.accountType === indiaAccountType);
  }, [indiaRates, indiaAccountType]);

  // Auto-fill India rate when bank and tenure change
  useEffect(() => {
    if (!indiaBank) return;
    const bank = filteredIndiaBanks.find((b) => b.institutionId === indiaBank);
    if (!bank) return;
    const tenureNum = parseInt(indiaTenure, 10);
    // Find closest tenure
    const tenureMatch = bank.tenures.reduce((prev, curr) =>
      Math.abs(curr.months - tenureNum) < Math.abs(prev.months - tenureNum) ? curr : prev,
    );
    if (tenureMatch) {
      setIndiaRate(tenureMatch.rate.toString());
    }
  }, [indiaBank, indiaTenure, filteredIndiaBanks]);

  // Current US institutions list based on product type
  const usInstitutions = useMemo(() => {
    switch (usProductType) {
      case 'cd':
        return usCDRates.map((r) => ({
          id: r.institutionId,
          name: r.institution,
        }));
      case 'hysa':
        return usHYSARates.map((r) => ({
          id: r.institutionId,
          name: r.institution,
        }));
      case 'treasury':
        return usTreasuryRates.map((r) => ({
          id: `${r.type}-${r.term}`,
          name: `${r.type} (${r.term})`,
        }));
      default:
        return [];
    }
  }, [usProductType, usCDRates, usHYSARates, usTreasuryRates]);

  // Auto-fill US APY when institution and tenure change
  useEffect(() => {
    if (!usInstitution) return;
    const tenureNum = parseInt(usTenure, 10);

    if (usProductType === 'cd') {
      const inst = usCDRates.find((r) => r.institutionId === usInstitution);
      if (inst) {
        const tenureMatch = inst.tenures.reduce((prev, curr) =>
          Math.abs(curr.months - tenureNum) < Math.abs(prev.months - tenureNum) ? curr : prev,
        );
        if (tenureMatch) setUsApy(tenureMatch.apy.toString());
      }
    } else if (usProductType === 'hysa') {
      const inst = usHYSARates.find((r) => r.institutionId === usInstitution);
      if (inst) setUsApy(inst.apy.toString());
    } else if (usProductType === 'treasury') {
      const tr = usTreasuryRates.find((r) => `${r.type}-${r.term}` === usInstitution);
      if (tr) setUsApy(tr.yield.toString());
    }
  }, [usInstitution, usTenure, usProductType, usCDRates, usHYSARates, usTreasuryRates]);

  // Clear institution when product type changes
  useEffect(() => {
    setUsInstitution('');
    setUsApy('');
  }, [usProductType]);

  // Handle form submission
  const handleSubmit = useCallback(() => {
    onCompare(
      {
        bankId: indiaBank,
        accountType: indiaAccountType,
        principal: parseFloat(indiaPrincipal) || 0,
        interestRate: parseFloat(indiaRate) || 0,
        tenureMonths: parseInt(indiaTenure, 10),
        compounding: indiaCompounding,
      },
      {
        institutionId: usInstitution,
        productType: usProductType,
        principal: parseFloat(usPrincipal) || 0,
        apy: parseFloat(usApy) || 0,
        tenureMonths: parseInt(usTenure, 10),
        compounding: usCompounding,
      },
      {
        annualDepreciation,
        includeHedging,
        hedgingCost: includeHedging ? hedgingCost : 0,
      },
    );
  }, [
    indiaBank,
    indiaAccountType,
    indiaPrincipal,
    indiaRate,
    indiaTenure,
    indiaCompounding,
    usInstitution,
    usProductType,
    usPrincipal,
    usApy,
    usTenure,
    usCompounding,
    annualDepreciation,
    includeHedging,
    hedgingCost,
    onCompare,
  ]);

  // Format currency input for display
  const handleCurrencyInput = (value: string, setter: (v: string) => void) => {
    // Allow only digits and decimal
    const cleaned = value.replace(/[^0-9.]/g, '');
    setter(cleaned);
  };

  return (
    <div className="space-y-6">
      {/* Two column input */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left Column: India FD ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-lg">India Fixed Deposit</span>
              <span className="type-pvt">INR</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Account Type Toggle */}
            <div className="space-y-1.5">
              <FieldLabel tooltip="NRE deposits are tax-free in India. NRO deposits are taxed at 30% (with DTAA benefits possible).">
                Account Type
              </FieldLabel>
              <div className="flex gap-1 rounded-lg border p-1">
                <button
                  type="button"
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    indiaAccountType === 'NRE'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setIndiaAccountType('NRE')}
                >
                  NRE
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    indiaAccountType === 'NRO'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setIndiaAccountType('NRO')}
                >
                  NRO
                </button>
              </div>
            </div>

            {/* Bank Selector */}
            <div className="space-y-1.5">
              <FieldLabel htmlFor="india-bank">Bank</FieldLabel>
              <Select value={indiaBank} onValueChange={setIndiaBank} disabled={ratesLoading}>
                <SelectTrigger id="india-bank" className="w-full">
                  <SelectValue placeholder={ratesLoading ? 'Loading banks...' : 'Select a bank'} />
                </SelectTrigger>
                <SelectContent>
                  {filteredIndiaBanks.map((bank) => (
                    <SelectItem key={bank.institutionId} value={bank.institutionId}>
                      {bank.institution}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors['indiaFD.bankName']} />
            </div>

            {/* Principal */}
            <div className="space-y-1.5">
              <FieldLabel htmlFor="india-principal">Principal Amount</FieldLabel>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  &#8377;
                </span>
                <Input
                  id="india-principal"
                  type="text"
                  inputMode="numeric"
                  placeholder="10,00,000"
                  className="pl-7"
                  value={indiaPrincipal}
                  onChange={(e) => handleCurrencyInput(e.target.value, setIndiaPrincipal)}
                  aria-invalid={!!errors['indiaFD.principal']}
                />
              </div>
              <FieldError message={errors['indiaFD.principal']} />
            </div>

            {/* Interest Rate */}
            <div className="space-y-1.5">
              <FieldLabel htmlFor="india-rate">Interest Rate (% p.a.)</FieldLabel>
              <div className="relative">
                <Input
                  id="india-rate"
                  type="text"
                  inputMode="decimal"
                  placeholder="7.00"
                  className="pr-7"
                  value={indiaRate}
                  onChange={(e) => handleCurrencyInput(e.target.value, setIndiaRate)}
                  aria-invalid={!!errors['indiaFD.interestRateAnnual']}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  %
                </span>
              </div>
              <FieldError message={errors['indiaFD.interestRateAnnual']} />
            </div>

            {/* Tenure */}
            <div className="space-y-1.5">
              <FieldLabel htmlFor="india-tenure">Tenure</FieldLabel>
              <Select value={indiaTenure} onValueChange={setIndiaTenure}>
                <SelectTrigger id="india-tenure" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TENURE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors['indiaFD.tenureMonths']} />
            </div>

            {/* Compounding */}
            <div className="space-y-1.5">
              <FieldLabel htmlFor="india-compounding">Compounding Frequency</FieldLabel>
              <Select
                value={indiaCompounding}
                onValueChange={(v) => setIndiaCompounding(v as typeof indiaCompounding)}
              >
                <SelectTrigger id="india-compounding" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPOUNDING_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ── Right Column: US Investment ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-lg">US Investment</span>
              <span className="type-psu">USD</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Product Type */}
            <div className="space-y-1.5">
              <FieldLabel>Product Type</FieldLabel>
              <div className="flex gap-1 rounded-lg border p-1">
                {(['cd', 'hysa', 'treasury'] as const).map((pt) => (
                  <button
                    key={pt}
                    type="button"
                    className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      usProductType === pt
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setUsProductType(pt)}
                  >
                    {pt === 'cd' ? 'CD' : pt === 'hysa' ? 'HYSA' : 'Treasury'}
                  </button>
                ))}
              </div>
            </div>

            {/* Institution Selector */}
            <div className="space-y-1.5">
              <FieldLabel htmlFor="us-institution">
                {usProductType === 'treasury' ? 'Security' : 'Institution'}
              </FieldLabel>
              <Select
                value={usInstitution}
                onValueChange={setUsInstitution}
                disabled={ratesLoading}
              >
                <SelectTrigger id="us-institution" className="w-full">
                  <SelectValue
                    placeholder={
                      ratesLoading
                        ? 'Loading...'
                        : usProductType === 'treasury'
                          ? 'Select a security'
                          : 'Select an institution'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {usInstitutions.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors['abroadFD.bankName']} />
            </div>

            {/* Principal */}
            <div className="space-y-1.5">
              <FieldLabel htmlFor="us-principal">Principal Amount</FieldLabel>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="us-principal"
                  type="text"
                  inputMode="numeric"
                  placeholder="10,000"
                  className="pl-7"
                  value={usPrincipal}
                  onChange={(e) => handleCurrencyInput(e.target.value, setUsPrincipal)}
                  aria-invalid={!!errors['abroadFD.principal']}
                />
              </div>
              <FieldError message={errors['abroadFD.principal']} />
            </div>

            {/* APY */}
            <div className="space-y-1.5">
              <FieldLabel htmlFor="us-apy">APY (%)</FieldLabel>
              <div className="relative">
                <Input
                  id="us-apy"
                  type="text"
                  inputMode="decimal"
                  placeholder="4.25"
                  className="pr-7"
                  value={usApy}
                  onChange={(e) => handleCurrencyInput(e.target.value, setUsApy)}
                  aria-invalid={!!errors['abroadFD.interestRateAnnual']}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  %
                </span>
              </div>
              <FieldError message={errors['abroadFD.interestRateAnnual']} />
            </div>

            {/* Tenure */}
            <div className="space-y-1.5">
              <FieldLabel htmlFor="us-tenure">Tenure</FieldLabel>
              <Select value={usTenure} onValueChange={setUsTenure}>
                <SelectTrigger id="us-tenure" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TENURE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors['abroadFD.tenureMonths']} />
            </div>

            {/* Compounding */}
            <div className="space-y-1.5">
              <FieldLabel htmlFor="us-compounding">Compounding Frequency</FieldLabel>
              <Select
                value={usCompounding}
                onValueChange={(v) => setUsCompounding(v as typeof usCompounding)}
              >
                <SelectTrigger id="us-compounding" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPOUNDING_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Forex Assumptions Panel ── */}
      <Collapsible open={forexOpen} onOpenChange={setForexOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer select-none hover:bg-muted/50 transition-colors rounded-t-xl">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-base">
                  Currency Assumptions
                  <InfoTooltip text="These assumptions model how the INR/USD exchange rate may change over the investment tenure, impacting the effective USD-equivalent return of the India FD." />
                </div>
                <ChevronDown
                  className={`size-4 text-muted-foreground transition-transform ${
                    forexOpen ? 'rotate-180' : ''
                  }`}
                />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-5 pt-0">
              {/* Annual INR Depreciation */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FieldLabel tooltip="Negative means INR weakens vs USD (most common historically). Positive means INR strengthens.">
                    Annual INR Depreciation vs USD
                  </FieldLabel>
                  <span className="text-sm font-mono font-medium tabular-nums">
                    {annualDepreciation > 0 ? '+' : ''}
                    {annualDepreciation}%
                  </span>
                </div>
                <Slider
                  min={-5}
                  max={5}
                  step={0.5}
                  value={[annualDepreciation]}
                  onValueChange={([v]) => setAnnualDepreciation(v)}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>INR weakens (-5%)</span>
                  <span>INR strengthens (+5%)</span>
                </div>
              </div>

              {/* Hedging Cost */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeHedging}
                      onChange={(e) => setIncludeHedging(e.target.checked)}
                      className="rounded border-input"
                    />
                    Include hedging cost
                  </label>
                </div>
                {includeHedging && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="1.5"
                      className="w-24"
                      value={hedgingCost.toString()}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v) && v >= 0 && v <= 5) setHedgingCost(v);
                        else if (e.target.value === '') setHedgingCost(0);
                      }}
                    />
                    <span className="text-sm text-muted-foreground">% per annum</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                The INR has historically depreciated ~3% per year against the USD. A negative value
                means the INR loses value, reducing the dollar-equivalent return of an India FD.
                Hedging costs reflect the cost of forward contracts to lock in an exchange rate.
              </p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ── Compare Button ── */}
      <Button
        size="lg"
        className="w-full text-base h-12 gold-gradient-bg text-[#0A0E15] hover:opacity-90 border-0 font-semibold"
        onClick={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Comparing...
          </>
        ) : (
          'Compare Now'
        )}
      </Button>
    </div>
  );
}
