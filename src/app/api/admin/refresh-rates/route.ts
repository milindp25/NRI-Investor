import { NextRequest, NextResponse } from 'next/server';
import { runScraper, runAllScrapers, VALID_SCRAPER_TYPES } from '@/lib/scrapers';
import type { ScraperType } from '@/lib/scrapers/types';
import { launchBrowser } from '@/lib/scrapers/browser';

export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  // Vercel Cron sends this header automatically
  const cronSecret = request.headers.get('x-vercel-cron-secret');
  if (cronSecret && cronSecret === process.env.CRON_SECRET) return true;

  // Manual trigger with admin secret
  const authHeader = request.headers.get('authorization');
  const adminSecret = process.env.ADMIN_API_SECRET;

  if (adminSecret && authHeader === `Bearer ${adminSecret}`) return true;

  // Allow in development when no secrets are configured
  if (!adminSecret && !process.env.CRON_SECRET) return true;

  return false;
}

async function handleRefresh(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const type = request.nextUrl.searchParams.get('type');
  let browser = null;

  try {
    // Launch headless browser for scrapers that need it
    browser = await launchBrowser();

    if (type) {
      if (!VALID_SCRAPER_TYPES.includes(type as ScraperType)) {
        return NextResponse.json(
          {
            error: `Invalid scraper type. Must be one of: ${VALID_SCRAPER_TYPES.join(', ')}`,
            code: 'INVALID_TYPE',
          },
          { status: 400 },
        );
      }

      const result = await runScraper(type as ScraperType, browser);
      return NextResponse.json({ data: { [type]: result } });
    }

    const results = await runAllScrapers(browser);

    const summary = Object.entries(results).map(([key, val]) => ({
      type: key,
      success: val.success,
      records: val.data.length,
      errors: val.errors.length,
    }));

    return NextResponse.json({ data: results, summary });
  } catch (error) {
    console.error('Refresh rates error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Scraper failed',
        code: 'SCRAPER_ERROR',
      },
      { status: 500 },
    );
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

// Vercel Cron sends GET requests
export async function GET(request: NextRequest) {
  return handleRefresh(request);
}

// Manual trigger via POST (curl, Postman, etc.)
export async function POST(request: NextRequest) {
  return handleRefresh(request);
}
