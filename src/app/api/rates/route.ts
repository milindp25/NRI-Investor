import { NextRequest, NextResponse } from 'next/server';
import type {
  ApiSuccessResponse,
  ApiErrorResponse,
  RateDirectory,
  RateCountry,
  ProductType,
} from '@/types';
import { getAllRates } from '@/lib/scrapers/rate-store';

function getIndiaRates(all: RateDirectory): Partial<RateDirectory> {
  return {
    indiaFDRates: all.indiaFDRates,
    indiaNBFCRates: all.indiaNBFCRates,
    indiaGovtSchemes: all.indiaGovtSchemes,
  };
}

function getUSRates(all: RateDirectory): Partial<RateDirectory> {
  return {
    usCDRates: all.usCDRates,
    usHYSARates: all.usHYSARates,
    usTreasuryRates: all.usTreasuryRates,
    usMoneyMarketRates: all.usMoneyMarketRates,
  };
}

function getRatesByProductType(type: ProductType, all: RateDirectory): Partial<RateDirectory> {
  switch (type) {
    case 'fd-nre':
      return {
        indiaFDRates: all.indiaFDRates.filter((r) => r.accountType === 'NRE'),
      };
    case 'fd-nro':
      return {
        indiaFDRates: all.indiaFDRates.filter((r) => r.accountType === 'NRO'),
      };
    case 'nbfc-fd':
      return { indiaNBFCRates: all.indiaNBFCRates };
    case 'post-office':
      return {
        indiaGovtSchemes: all.indiaGovtSchemes.filter((s) => s.schemeId === 'post-office-fd'),
      };
    case 'rbi-bond':
      return {
        indiaGovtSchemes: all.indiaGovtSchemes.filter(
          (s) => s.schemeId === 'rbi-floating-rate-bonds',
        ),
      };
    case 'cd':
      return { usCDRates: all.usCDRates };
    case 'hysa':
      return { usHYSARates: all.usHYSARates };
    case 'treasury':
      return { usTreasuryRates: all.usTreasuryRates };
    case 'money-market':
      return { usMoneyMarketRates: all.usMoneyMarketRates };
    default:
      return {};
  }
}

const VALID_COUNTRIES: RateCountry[] = ['india', 'us'];
const VALID_PRODUCT_TYPES: ProductType[] = [
  'fd-nre',
  'fd-nro',
  'nbfc-fd',
  'post-office',
  'rbi-bond',
  'cd',
  'hysa',
  'treasury',
  'money-market',
];

export async function GET(
  request: NextRequest,
): Promise<
  NextResponse<ApiSuccessResponse<RateDirectory | Partial<RateDirectory>> | ApiErrorResponse>
> {
  try {
    const { searchParams } = request.nextUrl;
    const country = searchParams.get('country');
    const type = searchParams.get('type');

    // Validate country parameter
    if (country && !VALID_COUNTRIES.includes(country as RateCountry)) {
      return NextResponse.json(
        {
          error: `Invalid country. Must be one of: ${VALID_COUNTRIES.join(', ')}`,
          code: 'INVALID_COUNTRY',
        },
        { status: 400 },
      );
    }

    // Validate type parameter
    if (type && !VALID_PRODUCT_TYPES.includes(type as ProductType)) {
      return NextResponse.json(
        {
          error: `Invalid product type. Must be one of: ${VALID_PRODUCT_TYPES.join(', ')}`,
          code: 'INVALID_PRODUCT_TYPE',
        },
        { status: 400 },
      );
    }

    // Fetch from blob (falls back to static JSON per key)
    const { directory: all, sources } = await getAllRates();
    let data: RateDirectory | Partial<RateDirectory>;

    if (type) {
      data = getRatesByProductType(type as ProductType, all);
    } else if (country === 'india') {
      data = getIndiaRates(all);
    } else if (country === 'us') {
      data = getUSRates(all);
    } else {
      data = all;
    }

    return NextResponse.json({
      data,
      meta: {
        lastUpdated: new Date().toISOString(),
        sources,
      },
    });
  } catch (error) {
    console.error('Rates API error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch rates',
        code: 'RATES_ERROR',
      },
      { status: 500 },
    );
  }
}
