import { NextResponse } from 'next/server';
import type {
  FixedDepositInput,
  FixedDepositResult,
  ComparisonResult,
  ExchangeRate,
} from '@/types';
import { calculateFDResult } from '@/lib/calculations';
import { fdCompareRequestSchema } from '@/lib/validators/comparison-schema';
import { getLatestRate } from '@/lib/api-clients/exchange-rate-client';

/**
 * Generate comparison insights based on the two FD results.
 */
function generateInsights(
  indiaResult: FixedDepositResult,
  abroadResult: FixedDepositResult,
  indiaInput: FixedDepositInput,
  abroadInput: FixedDepositInput,
): { winner: 'india' | 'abroad' | 'comparable'; keyInsights: string[]; caveats: string[] } {
  const diff = indiaResult.effectiveYieldAfterForex - abroadResult.effectiveYieldAfterForex;
  const absDiff = Math.abs(diff);

  // Consider results "comparable" if the difference is less than 0.25%
  const winner: 'india' | 'abroad' | 'comparable' =
    absDiff < 0.25 ? 'comparable' : diff > 0 ? 'india' : 'abroad';

  const keyInsights: string[] = [];
  const caveats: string[] = [];

  // Yield comparison
  if (winner === 'comparable') {
    keyInsights.push(
      `Both options yield similar returns (difference: ${absDiff.toFixed(2)}% p.a.)`,
    );
  } else {
    const winnerLabel = winner === 'india' ? 'India FD' : 'Abroad FD';
    keyInsights.push(
      `${winnerLabel} offers ${absDiff.toFixed(2)}% higher effective annual yield after forex adjustment`,
    );
  }

  // Tax impact insight
  if (indiaResult.taxDeducted > 0) {
    keyInsights.push(
      `India FD has ${indiaResult.tdsRate.toFixed(0)}% TDS, reducing net interest by ${indiaResult.taxDeducted.toFixed(2)}`,
    );
  }
  if (indiaResult.dtaaBenefit > 0) {
    keyInsights.push(`DTAA benefit saves ${indiaResult.dtaaBenefit.toFixed(2)} in taxes`);
  }

  // Pre vs post forex insight for India FD
  if (indiaInput.region === 'india') {
    const forexImpact = indiaResult.effectiveYield - indiaResult.effectiveYieldAfterForex;
    if (Math.abs(forexImpact) > 0.1) {
      keyInsights.push(
        `Currency fluctuation ${forexImpact > 0 ? 'reduces' : 'increases'} India FD return by ${Math.abs(forexImpact).toFixed(2)}% p.a.`,
      );
    }
  }

  // Caveats
  caveats.push('Actual returns may vary based on exchange rate movements');
  caveats.push('Tax implications may differ based on your specific DTAA treaty');

  if (indiaInput.accountType === 'NRO') {
    caveats.push('NRO repatriation is limited to USD 1 million per financial year under FEMA');
  }

  if (abroadInput.region === 'abroad') {
    caveats.push(
      'Abroad FD returns are shown pre-tax; apply your local country tax rate for accurate comparison',
    );
  }

  return { winner, keyInsights, caveats };
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    // Validate input with Zod
    const parseResult = fdCompareRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: parseResult.error.issues,
        },
        { status: 400 },
      );
    }

    const { indiaFD, abroadFD, forexAssumption, exchangeRate: overrideRate } = parseResult.data;

    // Get exchange rate: use override or fetch live
    let exchangeRate: ExchangeRate;
    if (overrideRate) {
      exchangeRate = {
        baseCurrency: 'USD',
        targetCurrency: 'INR',
        rate: overrideRate,
        date: new Date().toISOString().split('T')[0],
        source: 'manual',
      };
    } else {
      try {
        exchangeRate = await getLatestRate('USD', 'INR');
      } catch {
        return NextResponse.json(
          {
            error: 'Failed to fetch exchange rate. Please provide an exchange rate manually.',
            code: 'EXCHANGE_RATE_ERROR',
          },
          { status: 502 },
        );
      }
    }

    // Cast validated inputs to the proper types
    const indiaInput: FixedDepositInput = { ...indiaFD, region: 'india' };
    const abroadInput: FixedDepositInput = { ...abroadFD, region: 'abroad' };

    // Calculate results for both FDs
    const indiaResult = calculateFDResult(indiaInput, exchangeRate, forexAssumption);
    const abroadResult = calculateFDResult(abroadInput, exchangeRate, forexAssumption);

    // Generate comparison summary
    const { winner, keyInsights, caveats } = generateInsights(
      indiaResult,
      abroadResult,
      indiaInput,
      abroadInput,
    );

    const differencePercent =
      indiaResult.effectiveYieldAfterForex - abroadResult.effectiveYieldAfterForex;

    const result: ComparisonResult<FixedDepositInput, FixedDepositResult> = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      category: 'fixed-deposit',
      indiaInvestment: {
        input: indiaInput,
        result: indiaResult,
      },
      abroadInvestment: {
        input: abroadInput,
        result: abroadResult,
      },
      exchangeRateUsed: exchangeRate,
      forexAssumption,
      summary: {
        winner,
        differencePercent: Math.round(differencePercent * 100) / 100,
        keyInsights,
        caveats,
      },
    };

    return NextResponse.json({
      data: result,
      meta: {
        lastUpdated: exchangeRate.date,
        source: exchangeRate.source,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      {
        error: message,
        code: 'INTERNAL_ERROR',
      },
      { status: 500 },
    );
  }
}
