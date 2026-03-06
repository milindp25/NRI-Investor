import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Exclude heavy native packages from the Next.js bundle —
  // they run in Node.js serverless functions, not in the browser.
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
};

export default nextConfig;
