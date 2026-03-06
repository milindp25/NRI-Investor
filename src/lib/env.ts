import { z } from 'zod/v4';

const envSchema = z.object({
  EXCHANGE_RATE_API_URL: z.url().default('https://api.frankfurter.dev'),
  MF_API_BASE_URL: z.url().default('https://api.mfapi.in'),
  TREASURY_API_URL: z
    .url()
    .default('https://api.fiscaldata.treasury.gov/services/api/fiscal_service'),
  ADMIN_API_SECRET: z.string().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  CHROME_EXECUTABLE_PATH: z.string().optional(),
});

// Only validate on server side
export const env = envSchema.parse({
  EXCHANGE_RATE_API_URL: process.env.EXCHANGE_RATE_API_URL,
  MF_API_BASE_URL: process.env.MF_API_BASE_URL,
  TREASURY_API_URL: process.env.TREASURY_API_URL,
  ADMIN_API_SECRET: process.env.ADMIN_API_SECRET,
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
  CHROME_EXECUTABLE_PATH: process.env.CHROME_EXECUTABLE_PATH,
});
