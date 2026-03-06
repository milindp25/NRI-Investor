import type { Browser } from 'puppeteer-core';
import * as cheerio from 'cheerio';

export type { Browser } from 'puppeteer-core';

export interface FetchHtmlOptions {
  waitForSelector?: string;
  waitMs?: number;
  blockImages?: boolean;
}

/**
 * Launch a headless Chromium browser.
 * - On Vercel: uses @sparticuz/chromium (Lambda-optimized binary)
 * - Locally: uses system Chrome via CHROME_EXECUTABLE_PATH env var
 */
export async function launchBrowser(): Promise<Browser> {
  const puppeteer = await import('puppeteer-core');

  // Vercel / Lambda: use @sparticuz/chromium
  if (process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL) {
    const chromium = await import('@sparticuz/chromium');
    const executablePath = await chromium.default.executablePath();

    return puppeteer.default.launch({
      args: chromium.default.args,
      defaultViewport: { width: 1280, height: 800 },
      executablePath,
      headless: true,
    });
  }

  // Local development: use system Chrome
  const executablePath =
    process.env.CHROME_EXECUTABLE_PATH ||
    (process.platform === 'win32'
      ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      : process.platform === 'darwin'
        ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        : '/usr/bin/google-chrome');

  return puppeteer.default.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    defaultViewport: { width: 1280, height: 800 },
    executablePath,
    headless: true,
  });
}

/**
 * Fetch a URL using headless Chrome and return a cheerio instance.
 * Opens a new page, navigates, waits for content, extracts HTML, closes page.
 */
export async function fetchHtmlWithBrowser(
  browser: Browser,
  url: string,
  opts: FetchHtmlOptions = {},
): Promise<cheerio.CheerioAPI> {
  const { waitForSelector, waitMs = 3000, blockImages = true } = opts;

  const page = await browser.newPage();

  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    );

    if (blockImages) {
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const type = req.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
          req.abort();
        } else {
          req.continue();
        }
      });
    }

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });

    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 10000 }).catch(() => {
        // Selector not found — proceed with whatever loaded
      });
    } else {
      // Default wait for content to render
      await new Promise((r) => setTimeout(r, waitMs));
    }

    const html = await page.content();
    return cheerio.load(html);
  } finally {
    await page.close();
  }
}
