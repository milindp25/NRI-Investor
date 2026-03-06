import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Exclude heavy native packages from the Next.js bundle —
  // they run in Node.js serverless functions, not in the browser.
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],

  // Explicitly include Chromium brotli binaries in the serverless function.
  // Next.js file tracer doesn't pick up .br files automatically.
  outputFileTracingIncludes: {
    '/api/admin/refresh-rates': ['./node_modules/@sparticuz/chromium/**/*'],
  },
};

export default nextConfig;
