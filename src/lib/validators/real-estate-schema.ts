import { z } from 'zod/v4';

export const propertyInputSchema = z.object({
  region: z.enum(['india', 'abroad']),
  city: z.string().min(1, 'City is required'),
  propertyType: z.enum(['apartment', 'house', 'commercial', 'plot']),
  purchasePrice: z.number().positive('Purchase price must be positive'),
  registrationAndStampDuty: z.number().min(0),
  annualRentalIncome: z.number().min(0),
  annualMaintenanceCost: z.number().min(0),
  annualPropertyTax: z.number().min(0),
  expectedAppreciationPercent: z.number().min(-10).max(30),
  holdingPeriodYears: z.number().int().min(1).max(50),
  loanAmountPercent: z.number().min(0).max(90),
  loanInterestRate: z.number().min(0).max(25),
  loanTenureYears: z.number().int().min(0).max(30),
  isNRI: z.boolean(),
});

export type PropertyInputRequest = z.infer<typeof propertyInputSchema>;
