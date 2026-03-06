export type RateCountry = 'india' | 'us';
export type IndiaProductType = 'fd-nre' | 'fd-nro' | 'nbfc-fd' | 'post-office' | 'rbi-bond';
export type USProductType = 'cd' | 'hysa' | 'treasury' | 'money-market';
export type ProductType = IndiaProductType | USProductType;

export interface TenureRate {
  months: number;
  rate: number;
}

export interface BankFDRate {
  institution: string;
  institutionId: string;
  accountType: 'NRE' | 'NRO';
  tenures: TenureRate[];
  specialRateForSeniors?: boolean;
  minDeposit?: number;
  maxDeposit?: number;
  lastUpdated: string;
}

export interface NBFCRate {
  institution: string;
  institutionId: string;
  tenures: TenureRate[];
  creditRating: string;
  minDeposit?: number;
  lastUpdated: string;
}

export interface GovtSchemeRate {
  schemeName: string;
  schemeId: string;
  currentRate: number;
  rateType: 'fixed' | 'floating';
  minTenureMonths: number;
  maxTenureMonths: number;
  minInvestment: number;
  maxInvestment?: number;
  nriEligible: boolean;
  taxFree: boolean;
  lastUpdated: string;
}

export interface USCDRate {
  institution: string;
  institutionId: string;
  tenures: Array<{ months: number; apy: number }>;
  minDeposit?: number;
  fdicInsured: boolean;
  lastUpdated: string;
}

export interface USHYSARate {
  institution: string;
  institutionId: string;
  apy: number;
  minBalance: number;
  fdicInsured: boolean;
  lastUpdated: string;
}

export interface USTreasuryRate {
  type: 'T-Bill' | 'T-Note' | 'T-Bond' | 'I-Bond' | 'TIPS';
  term: string;
  yield: number;
  lastAuctionDate?: string;
  lastUpdated: string;
}

export interface USMoneyMarketRate {
  fund: string;
  fundId: string;
  provider: string;
  sevenDayYield: number;
  minInvestment: number;
  expenseRatio: number;
  lastUpdated: string;
}

export interface RateDirectory {
  indiaFDRates: BankFDRate[];
  indiaNBFCRates: NBFCRate[];
  indiaGovtSchemes: GovtSchemeRate[];
  usCDRates: USCDRate[];
  usHYSARates: USHYSARate[];
  usTreasuryRates: USTreasuryRate[];
  usMoneyMarketRates: USMoneyMarketRate[];
}
