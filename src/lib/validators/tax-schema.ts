import { z } from 'zod/v4';

export const taxCalculationRequestSchema = z.object({
  residenceCountry: z.enum(['US', 'UK', 'CA', 'AU', 'SG', 'AE', 'DE']),
  incomeType: z.enum([
    'interest',
    'dividend',
    'capital-gains-st',
    'capital-gains-lt',
    'rental',
    'salary',
  ]),
  grossIncome: z.number().positive('Income must be positive'),
  applyDTAA: z.boolean(),
  hasTRC: z.boolean(),
  accountType: z.enum(['NRE', 'NRO']).optional(),
});

export type TaxCalculationRequest = z.infer<typeof taxCalculationRequestSchema>;
