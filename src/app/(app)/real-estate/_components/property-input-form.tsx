'use client';

import { Calculator } from 'lucide-react';
import type { PropertyInput } from '@/types';

interface PropertyInputFormProps {
  onCalculate: (input: PropertyInput) => void;
  isLoading: boolean;
}

export function PropertyInputForm({ onCalculate, isLoading }: PropertyInputFormProps) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const input: PropertyInput = {
      region: (form.get('region') as string) === 'abroad' ? 'abroad' : 'india',
      city: (form.get('city') as string) || 'Mumbai',
      propertyType: (form.get('propertyType') as PropertyInput['propertyType']) || 'apartment',
      purchasePrice: Number(form.get('purchasePrice')) || 0,
      registrationAndStampDuty: Number(form.get('stampDuty')) || 0,
      annualRentalIncome: Number(form.get('rentalIncome')) || 0,
      annualMaintenanceCost: Number(form.get('maintenance')) || 0,
      annualPropertyTax: Number(form.get('propertyTax')) || 0,
      expectedAppreciationPercent: Number(form.get('appreciation')) || 5,
      holdingPeriodYears: Number(form.get('holdingPeriod')) || 10,
      loanAmountPercent: Number(form.get('loanPercent')) || 0,
      loanInterestRate: Number(form.get('loanRate')) || 8.5,
      loanTenureYears: Number(form.get('loanTenure')) || 20,
      isNRI: form.get('isNRI') === 'on',
    };

    onCalculate(input);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Property Details */}
      <div className="premium-card p-6 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Property Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field
            label="Region"
            name="region"
            type="select"
            options={[
              { value: 'india', label: 'India' },
              { value: 'abroad', label: 'Abroad' },
            ]}
          />
          <Field label="City" name="city" type="text" defaultValue="Mumbai" />
          <Field
            label="Property Type"
            name="propertyType"
            type="select"
            options={[
              { value: 'apartment', label: 'Apartment' },
              { value: 'house', label: 'House / Villa' },
              { value: 'commercial', label: 'Commercial' },
              { value: 'plot', label: 'Plot / Land' },
            ]}
          />
          <Field
            label="Purchase Price (INR)"
            name="purchasePrice"
            type="number"
            defaultValue="10000000"
            prefix="₹"
          />
          <Field
            label="Stamp Duty & Registration"
            name="stampDuty"
            type="number"
            defaultValue="600000"
            prefix="₹"
          />
          <label className="flex items-center gap-2 cursor-pointer self-end pb-2">
            <input type="checkbox" name="isNRI" defaultChecked className="rounded border-border" />
            <span className="text-sm">I am an NRI</span>
          </label>
        </div>
      </div>

      {/* Rental Income */}
      <div className="premium-card p-6 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Rental Income
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field
            label="Annual Rental (INR)"
            name="rentalIncome"
            type="number"
            defaultValue="360000"
            prefix="₹"
          />
          <Field
            label="Annual Maintenance"
            name="maintenance"
            type="number"
            defaultValue="60000"
            prefix="₹"
          />
          <Field
            label="Annual Property Tax"
            name="propertyTax"
            type="number"
            defaultValue="12000"
            prefix="₹"
          />
        </div>
      </div>

      {/* Growth & Holding */}
      <div className="premium-card p-6 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Growth Assumptions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Expected Appreciation (%/yr)"
            name="appreciation"
            type="number"
            defaultValue="5"
            step="0.5"
            suffix="%"
          />
          <Field
            label="Holding Period"
            name="holdingPeriod"
            type="select"
            options={[
              { value: '3', label: '3 years' },
              { value: '5', label: '5 years' },
              { value: '7', label: '7 years' },
              { value: '10', label: '10 years' },
              { value: '15', label: '15 years' },
              { value: '20', label: '20 years' },
            ]}
            defaultValue="10"
          />
        </div>
      </div>

      {/* Loan */}
      <div className="premium-card p-6 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Financing
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Loan %" name="loanPercent" type="number" defaultValue="70" suffix="%" />
          <Field
            label="Interest Rate"
            name="loanRate"
            type="number"
            defaultValue="8.5"
            step="0.1"
            suffix="%"
          />
          <Field
            label="Loan Tenure"
            name="loanTenure"
            type="select"
            options={[
              { value: '0', label: 'No Loan' },
              { value: '10', label: '10 years' },
              { value: '15', label: '15 years' },
              { value: '20', label: '20 years' },
              { value: '25', label: '25 years' },
              { value: '30', label: '30 years' },
            ]}
            defaultValue="20"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="gold-gradient-bg text-[#0A0E15] px-6 py-2.5 rounded-xl font-medium text-sm transition-opacity disabled:opacity-50 flex items-center gap-2"
      >
        <Calculator className="size-4" />
        {isLoading ? 'Calculating...' : 'Calculate Returns'}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type,
  defaultValue,
  prefix,
  suffix,
  step,
  options,
}: {
  label: string;
  name: string;
  type: 'text' | 'number' | 'select';
  defaultValue?: string;
  prefix?: string;
  suffix?: string;
  step?: string;
  options?: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </label>
      {type === 'select' && options ? (
        <select
          name={name}
          defaultValue={defaultValue}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <div className="relative">
          {prefix && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {prefix}
            </span>
          )}
          <input
            type={type}
            name={name}
            defaultValue={defaultValue}
            step={step}
            className={`w-full rounded-lg border border-border bg-background py-2 text-sm ${
              prefix ? 'pl-7 pr-3' : suffix ? 'pl-3 pr-8' : 'px-3'
            }`}
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {suffix}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
