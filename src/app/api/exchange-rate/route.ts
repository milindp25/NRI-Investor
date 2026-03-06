import { NextRequest, NextResponse } from 'next/server';
import { getLatestRate, getHistoricalRates } from '@/lib/api-clients/exchange-rate-client';
import type {
  ApiSuccessResponse,
  ApiErrorResponse,
  ExchangeRate,
  ExchangeRateHistory,
} from '@/types';

const VALID_PERIODS = ['1M', '3M', '6M', '1Y', '3Y', '5Y'] as const;
type Period = (typeof VALID_PERIODS)[number];

function isPeriod(value: string): value is Period {
  return (VALID_PERIODS as readonly string[]).includes(value);
}

export async function GET(
  request: NextRequest,
): Promise<
  NextResponse<ApiSuccessResponse<ExchangeRate | ExchangeRateHistory> | ApiErrorResponse>
> {
  try {
    const { searchParams } = request.nextUrl;
    const base = searchParams.get('base') ?? 'USD';
    const target = searchParams.get('target') ?? 'INR';
    const history = searchParams.get('history');

    if (history) {
      if (!isPeriod(history)) {
        return NextResponse.json(
          {
            error: `Invalid period. Must be one of: ${VALID_PERIODS.join(', ')}`,
            code: 'INVALID_PERIOD',
          },
          { status: 400 },
        );
      }

      const data = await getHistoricalRates(base, target, history);
      return NextResponse.json({
        data,
        meta: {
          source: 'frankfurter',
          lastUpdated: new Date().toISOString(),
        },
      });
    }

    const data = await getLatestRate(base, target);
    return NextResponse.json({
      data,
      meta: {
        source: 'frankfurter',
        lastUpdated: data.date,
      },
    });
  } catch (error) {
    console.error('Exchange rate API error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch exchange rate',
        code: 'EXCHANGE_RATE_ERROR',
      },
      { status: 500 },
    );
  }
}
