export type SupportedCountry = 'US' | 'UK' | 'CA' | 'AU' | 'SG' | 'AE' | 'DE';

export interface CountryMeta {
  code: SupportedCountry;
  name: string;
  currency: string;
  currencySymbol: string;
  flagEmoji: string;
  hasDTAA: boolean;
  taxYearStart: string;
}

export interface UserPreferences {
  residenceCountry: SupportedCountry;
  taxBracketIndia: number;
  taxBracketAbroad: number;
  preferredCurrency: string;
  theme: 'light' | 'dark' | 'system';
}
