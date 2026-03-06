import { put, list } from '@vercel/blob';
import type { RateKVKey } from './types';
import type {
  BankFDRate,
  NBFCRate,
  GovtSchemeRate,
  USCDRate,
  USHYSARate,
  USTreasuryRate,
  USMoneyMarketRate,
  RateDirectory,
} from '@/types';

// Static JSON imports as fallback
import indiaFDRates from '@/data/rates/india-fd-rates.json';
import indiaNBFCRates from '@/data/rates/india-nbfc-rates.json';
import indiaGovtSchemes from '@/data/rates/india-govt-schemes.json';
import usCDRates from '@/data/rates/us-cd-rates.json';
import usHYSARates from '@/data/rates/us-hysa-rates.json';
import usTreasuryRates from '@/data/rates/us-treasury-rates.json';
import usMoneyMarketRates from '@/data/rates/us-money-market.json';

// ---------- Blob path mapping ----------

const BLOB_PATH: Record<RateKVKey, string> = {
  'rates:india-fd': 'rates/india-fd.json',
  'rates:india-nbfc': 'rates/india-nbfc.json',
  'rates:india-govt': 'rates/india-govt.json',
  'rates:us-cd': 'rates/us-cd.json',
  'rates:us-hysa': 'rates/us-hysa.json',
  'rates:us-treasury': 'rates/us-treasury.json',
  'rates:us-money-market': 'rates/us-money-market.json',
};

// ---------- Static fallback map ----------

const STATIC_FALLBACK: Record<RateKVKey, unknown[]> = {
  'rates:india-fd': indiaFDRates as BankFDRate[],
  'rates:india-nbfc': indiaNBFCRates as NBFCRate[],
  'rates:india-govt': indiaGovtSchemes as GovtSchemeRate[],
  'rates:us-cd': usCDRates as USCDRate[],
  'rates:us-hysa': usHYSARates as USHYSARate[],
  'rates:us-treasury': usTreasuryRates as USTreasuryRate[],
  'rates:us-money-market': usMoneyMarketRates as USMoneyMarketRate[],
};

// ---------- Helpers ----------

function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/** Auth headers for private blob store reads. */
function blobAuthHeaders(): HeadersInit {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Find a blob by its pathname prefix and fetch its JSON content.
 */
async function fetchBlob<T>(path: string): Promise<T[] | null> {
  try {
    const { blobs } = await list({ prefix: path, limit: 1 });
    if (blobs.length === 0) return null;

    const res = await fetch(blobs[0].downloadUrl, { headers: blobAuthHeaders() });
    if (!res.ok) return null;

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) return data as T[];
  } catch {
    // Blob not found or network error — caller handles fallback
  }
  return null;
}

// ---------- Public API ----------

/**
 * Get rates from Vercel Blob, falling back to static JSON.
 */
export async function getRates<T>(key: RateKVKey): Promise<T[]> {
  if (isBlobConfigured()) {
    try {
      const data = await fetchBlob<T>(BLOB_PATH[key]);
      if (data) return data;
    } catch (err) {
      console.error(`Blob read error for ${key}:`, err);
    }
  }

  return (STATIC_FALLBACK[key] ?? []) as T[];
}

/**
 * Write rates to Vercel Blob.
 */
export async function setRates<T>(key: RateKVKey, data: T[]): Promise<boolean> {
  if (!isBlobConfigured()) {
    console.warn(`Blob not configured — skipping write for ${key}`);
    return false;
  }

  try {
    await put(BLOB_PATH[key], JSON.stringify(data), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    });
    return true;
  } catch (err) {
    console.error(`Blob write error for ${key}:`, err);
    return false;
  }
}

/**
 * Merge new scraped records with existing blob data.
 * Keeps existing records for institutions that failed to scrape.
 * Uses `idField` to match records (e.g. 'institutionId', 'schemeId', 'fundId').
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function mergeRates<T extends Record<string, any>>(
  key: RateKVKey,
  newRecords: T[],
  minNew: number,
  idField: string,
): Promise<{ merged: boolean; reason?: string }> {
  if (newRecords.length < minNew) {
    return {
      merged: false,
      reason: `Only ${newRecords.length} records (minimum: ${minNew}). Preserving existing data.`,
    };
  }

  const existing = await getRates<T>(key);

  // Build set of IDs we have new data for
  const newIds = new Set(newRecords.map((r) => String(r[idField])));

  // Merge: new records + existing records for missing IDs
  const merged = [...newRecords, ...existing.filter((r) => !newIds.has(String(r[idField])))];

  const written = await setRates(key, merged);
  return { merged: written };
}

export interface AllRatesResult {
  directory: RateDirectory;
  sources: Partial<Record<RateKVKey, 'blob' | 'static'>>;
}

/**
 * Get all rates as a RateDirectory (for the /api/rates route).
 * Uses a single blob list call + parallel fetches for efficiency.
 * Returns source info per key (blob vs static fallback).
 */
export async function getAllRates(): Promise<AllRatesResult> {
  const sources: Partial<Record<RateKVKey, 'blob' | 'static'>> = {};

  if (!isBlobConfigured()) {
    for (const key of Object.keys(BLOB_PATH) as RateKVKey[]) {
      sources[key] = 'static';
    }
    return { directory: staticDirectory(), sources };
  }

  try {
    // Single list call to discover all rate blobs
    const { blobs } = await list({ prefix: 'rates/' });
    const blobMap = new Map(blobs.map((b) => [b.pathname, b.downloadUrl]));

    const headers = blobAuthHeaders();
    const fetchOrFallback = async <T>(key: RateKVKey): Promise<T[]> => {
      const url = blobMap.get(BLOB_PATH[key]);
      if (!url) {
        sources[key] = 'static';
        return (STATIC_FALLBACK[key] ?? []) as T[];
      }
      try {
        const res = await fetch(url, { headers });
        if (!res.ok) {
          sources[key] = 'static';
          return (STATIC_FALLBACK[key] ?? []) as T[];
        }
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          sources[key] = 'blob';
          return data as T[];
        }
      } catch {
        // fall through to static
      }
      sources[key] = 'static';
      return (STATIC_FALLBACK[key] ?? []) as T[];
    };

    const [indiaFD, indiaNBFC, indiaGovt, usCD, usHYSA, usTreasury, usMoneyMarket] =
      await Promise.all([
        fetchOrFallback<BankFDRate>('rates:india-fd'),
        fetchOrFallback<NBFCRate>('rates:india-nbfc'),
        fetchOrFallback<GovtSchemeRate>('rates:india-govt'),
        fetchOrFallback<USCDRate>('rates:us-cd'),
        fetchOrFallback<USHYSARate>('rates:us-hysa'),
        fetchOrFallback<USTreasuryRate>('rates:us-treasury'),
        fetchOrFallback<USMoneyMarketRate>('rates:us-money-market'),
      ]);

    return {
      directory: {
        indiaFDRates: indiaFD,
        indiaNBFCRates: indiaNBFC,
        indiaGovtSchemes: indiaGovt,
        usCDRates: usCD,
        usHYSARates: usHYSA,
        usTreasuryRates: usTreasury,
        usMoneyMarketRates: usMoneyMarket,
      },
      sources,
    };
  } catch (err) {
    console.error('Blob getAllRates error:', err);
    for (const key of Object.keys(BLOB_PATH) as RateKVKey[]) {
      sources[key] = 'static';
    }
    return { directory: staticDirectory(), sources };
  }
}

// ---------- Static directory helper ----------

function staticDirectory(): RateDirectory {
  return {
    indiaFDRates: STATIC_FALLBACK['rates:india-fd'] as BankFDRate[],
    indiaNBFCRates: STATIC_FALLBACK['rates:india-nbfc'] as NBFCRate[],
    indiaGovtSchemes: STATIC_FALLBACK['rates:india-govt'] as GovtSchemeRate[],
    usCDRates: STATIC_FALLBACK['rates:us-cd'] as USCDRate[],
    usHYSARates: STATIC_FALLBACK['rates:us-hysa'] as USHYSARate[],
    usTreasuryRates: STATIC_FALLBACK['rates:us-treasury'] as USTreasuryRate[],
    usMoneyMarketRates: STATIC_FALLBACK['rates:us-money-market'] as USMoneyMarketRate[],
  };
}
