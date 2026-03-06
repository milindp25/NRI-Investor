import { z } from 'zod/v4';

export const fixedDepositInputSchema = z.object({
  region: z.enum(['india', 'abroad']),
  bankName: z.string().optional(),
  principal: z.number().positive('Principal must be positive'),
  interestRateAnnual: z.number().min(0).max(25, 'Rate seems too high'),
  tenureMonths: z.number().int().min(1).max(120),
  compoundingFrequency: z.enum(['monthly', 'quarterly', 'half-yearly', 'yearly']),
  accountType: z.enum(['NRE', 'NRO', 'regular']).optional(),
  isTaxFree: z.boolean().optional(),
});

export const forexAssumptionSchema = z.object({
  annualAppreciationRate: z.number().min(-20).max(20),
  hedgingCostPercent: z.number().min(0).max(10),
  useHistoricalAverage: z.boolean(),
});

export const fdCompareRequestSchema = z.object({
  indiaFD: fixedDepositInputSchema,
  abroadFD: fixedDepositInputSchema,
  forexAssumption: forexAssumptionSchema,
  exchangeRate: z.number().positive().optional(),
});

export type FDCompareRequest = z.infer<typeof fdCompareRequestSchema>;
