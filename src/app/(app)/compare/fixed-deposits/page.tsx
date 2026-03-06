'use client';

import { useCallback, useRef, useState } from 'react';
import { fdCompareRequestSchema } from '@/lib/validators/comparison-schema';
import { useComparisonStore } from '@/lib/stores/store-provider';
import { Skeleton } from '@/components/ui/skeleton';
import type { ComparisonResult, FixedDepositInput, FixedDepositResult } from '@/types';
import {
  FDInputForm,
  type IndiaFDFormData,
  type USInvestmentFormData,
  type ForexFormData,
} from './_components/fd-input-form';
import { FDResults } from './_components/fd-results';
import { FDCharts } from './_components/fd-charts';

type FDComparison = ComparisonResult<FixedDepositInput, FixedDepositResult>;

export default function FixedDepositsComparisonPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [comparison, setComparison] = useState<FDComparison | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);

  const saveComparison = useComparisonStore((s) => s.saveComparison);

  const handleCompare = useCallback(
    async (india: IndiaFDFormData, us: USInvestmentFormData, forex: ForexFormData) => {
      setErrors({});
      setApiError(null);
      setIsSaved(false);

      // Build the request body
      const requestBody = {
        indiaFD: {
          region: 'india' as const,
          bankName: india.bankId || undefined,
          principal: india.principal,
          interestRateAnnual: india.interestRate,
          tenureMonths: india.tenureMonths,
          compoundingFrequency: india.compounding,
          accountType: india.accountType,
          isTaxFree: india.accountType === 'NRE',
        },
        abroadFD: {
          region: 'abroad' as const,
          bankName: us.institutionId || undefined,
          principal: us.principal,
          interestRateAnnual: us.apy,
          tenureMonths: us.tenureMonths,
          compoundingFrequency: us.compounding,
          accountType: 'regular' as const,
        },
        forexAssumption: {
          annualAppreciationRate: forex.annualDepreciation,
          hedgingCostPercent: forex.hedgingCost,
          useHistoricalAverage: false,
        },
      };

      // Validate with Zod
      const parseResult = fdCompareRequestSchema.safeParse(requestBody);
      if (!parseResult.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of parseResult.error.issues) {
          const path = issue.path.join('.');
          fieldErrors[path] = issue.message;
        }
        setErrors(fieldErrors);
        return;
      }

      setIsLoading(true);

      try {
        const response = await fetch('/api/calculate/fd-compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        const json = await response.json();

        if (!response.ok) {
          setApiError(json.error || 'An unexpected error occurred');
          return;
        }

        setComparison(json.data as FDComparison);

        // Scroll to results
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } catch {
        setApiError('Failed to connect to the server. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const handleSave = useCallback(() => {
    if (comparison) {
      saveComparison(comparison);
      setIsSaved(true);
    }
  }, [comparison, saveComparison]);

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8">
      {/* ── Page Header ── */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          FD vs CD <span className="font-serif italic gold-gradient-text">Comparison</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          Compare India FD returns with US CD/HYSA after tax and forex impact
        </p>
      </div>

      {/* ── Input Form ── */}
      <FDInputForm onCompare={handleCompare} isLoading={isLoading} errors={errors} />

      {/* ── API Error ── */}
      {apiError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {apiError}
        </div>
      )}

      {/* ── Loading Skeleton ── */}
      {isLoading && (
        <div className="space-y-6">
          <div className="flex justify-center">
            <Skeleton className="h-10 w-64" />
          </div>
          <Skeleton className="h-80 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
        </div>
      )}

      {/* ── Results Section ── */}
      {comparison && !isLoading && (
        <div ref={resultsRef} className="space-y-8 pt-4">
          <FDResults comparison={comparison} onSave={handleSave} isSaved={isSaved} />

          <FDCharts comparison={comparison} />
        </div>
      )}
    </div>
  );
}
