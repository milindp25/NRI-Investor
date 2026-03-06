'use client';

import { toast } from 'sonner';
import { useSettingsStore } from '@/lib/stores/store-provider';
import { SUPPORTED_COUNTRIES } from '@/lib/constants/countries';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatPercent } from '@/lib/utils';
import type { SupportedCountry } from '@/types';

const CURRENCIES = [
  { value: 'INR', label: 'INR (\u20B9) - Indian Rupee' },
  { value: 'USD', label: 'USD ($) - US Dollar' },
  { value: 'GBP', label: 'GBP (\u00A3) - British Pound' },
  { value: 'CAD', label: 'CAD (C$) - Canadian Dollar' },
  { value: 'AUD', label: 'AUD (A$) - Australian Dollar' },
  { value: 'SGD', label: 'SGD (S$) - Singapore Dollar' },
  { value: 'AED', label: 'AED (\u062F.\u0625) - UAE Dirham' },
  { value: 'EUR', label: 'EUR (\u20AC) - Euro' },
] as const;

const INDIA_TAX_BRACKETS = [
  { value: 0, label: 'No tax' },
  { value: 5, label: '5%' },
  { value: 20, label: '20%' },
  { value: 30, label: '30%' },
  { value: 34.32, label: '30% + 10% surcharge + cess' },
  { value: 35.88, label: '30% + 15% surcharge + cess' },
  { value: 39, label: '30% + 25% surcharge + cess' },
  { value: 42.74, label: '30% + 37% surcharge + cess' },
] as const;

export default function SettingsPage() {
  const residenceCountry = useSettingsStore((s) => s.residenceCountry);
  const taxBracketIndia = useSettingsStore((s) => s.taxBracketIndia);
  const taxBracketAbroad = useSettingsStore((s) => s.taxBracketAbroad);
  const preferredCurrency = useSettingsStore((s) => s.preferredCurrency);
  const theme = useSettingsStore((s) => s.theme);

  const setResidenceCountry = useSettingsStore((s) => s.setResidenceCountry);
  const setTaxBracketIndia = useSettingsStore((s) => s.setTaxBracketIndia);
  const setTaxBracketAbroad = useSettingsStore((s) => s.setTaxBracketAbroad);
  const setPreferredCurrency = useSettingsStore((s) => s.setPreferredCurrency);

  function handleCountryChange(value: string) {
    setResidenceCountry(value as SupportedCountry);
    toast.success('Preference saved', {
      description: `Country of residence updated to ${SUPPORTED_COUNTRIES[value as SupportedCountry].name}`,
    });
  }

  function handleIndiaTaxChange(value: number[]) {
    const newValue = value[0];
    setTaxBracketIndia(newValue);
    toast.success('Preference saved', {
      description: `India tax bracket updated to ${formatPercent(newValue)}`,
    });
  }

  function handleAbroadTaxChange(value: number[]) {
    const newValue = value[0];
    setTaxBracketAbroad(newValue);
    toast.success('Preference saved', {
      description: `Abroad tax bracket updated to ${formatPercent(newValue)}`,
    });
  }

  function handleCurrencyChange(value: string) {
    setPreferredCurrency(value);
    toast.success('Preference saved', {
      description: `Preferred currency updated to ${value}`,
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="font-serif italic gold-gradient-text">Settings</span>
        </h1>
        <p className="text-sm text-muted-foreground">Manage your profile and preferences</p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Set your country of residence to get personalized tax and rate information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Country of Residence</label>
            <Select value={residenceCountry} onValueChange={handleCountryChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(SUPPORTED_COUNTRIES).map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.flagEmoji} {country.name} ({country.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This determines DTAA benefits and applicable tax treaties with India
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tax Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Settings</CardTitle>
          <CardDescription>
            Configure your tax brackets for accurate after-tax return calculations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* India Tax Bracket */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">India Tax Bracket</label>
              <span className="text-sm font-mono font-medium text-primary">
                {formatPercent(taxBracketIndia)}
              </span>
            </div>
            <Slider
              value={[taxBracketIndia]}
              onValueChange={handleIndiaTaxChange}
              min={0}
              max={42.74}
              step={0.01}
            />
            <div className="flex flex-wrap gap-1.5">
              {INDIA_TAX_BRACKETS.map((bracket) => (
                <button
                  key={bracket.value}
                  type="button"
                  onClick={() => handleIndiaTaxChange([bracket.value])}
                  className={`rounded-md border px-2 py-0.5 text-xs transition-colors ${
                    Math.abs(taxBracketIndia - bracket.value) < 0.01
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {bracket.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Your income tax slab in India. Includes surcharge and cess for higher brackets. NRE FD
              interest is tax-free in India.
            </p>
          </div>

          <Separator />

          {/* Abroad Tax Bracket */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Abroad Tax Bracket (
                {SUPPORTED_COUNTRIES[residenceCountry]?.name ?? residenceCountry})
              </label>
              <span className="text-sm font-mono font-medium text-primary">
                {formatPercent(taxBracketAbroad)}
              </span>
            </div>
            <Slider
              value={[taxBracketAbroad]}
              onValueChange={handleAbroadTaxChange}
              min={0}
              max={50}
              step={0.5}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Your marginal tax rate in your country of residence. Used to calculate after-tax
              returns on US CDs, HYSAs, and other investments.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Display Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Display Preferences</CardTitle>
          <CardDescription>Customize how amounts and rates are displayed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Preferred Currency</label>
            <Select value={preferredCurrency} onValueChange={handleCurrencyChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((currency) => (
                  <SelectItem key={currency.value} value={currency.value}>
                    {currency.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Investment amounts and returns will be shown in this currency alongside the original
              currency
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <label className="text-sm font-medium">Theme</label>
            <div className="flex items-center gap-2">
              <span className="rounded-md border bg-muted px-3 py-1.5 text-sm capitalize">
                {theme}
              </span>
              <span className="text-xs text-muted-foreground">
                Use the theme toggle in the sidebar to change
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Data Preferences</CardTitle>
          <CardDescription>How rate data is sourced and updated</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/60 bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">
              Rate data is updated automatically via our scrapers. No manual configuration needed.
              Exchange rates refresh every hour, and deposit/savings rates are updated daily from
              official bank websites.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
