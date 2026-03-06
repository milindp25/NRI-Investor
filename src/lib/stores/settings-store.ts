import { createStore } from 'zustand/vanilla';
import { persist } from 'zustand/middleware';
import type { UserPreferences, SupportedCountry } from '@/types';

interface SettingsState extends UserPreferences {
  setResidenceCountry: (country: SupportedCountry) => void;
  setTaxBracketIndia: (rate: number) => void;
  setTaxBracketAbroad: (rate: number) => void;
  setPreferredCurrency: (currency: string) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  reset: () => void;
}

const DEFAULT_SETTINGS: UserPreferences = {
  residenceCountry: 'US',
  taxBracketIndia: 30,
  taxBracketAbroad: 24,
  preferredCurrency: 'USD',
  theme: 'system',
};

export const createSettingsStore = () =>
  createStore<SettingsState>()(
    persist(
      (set) => ({
        ...DEFAULT_SETTINGS,
        setResidenceCountry: (country) => set({ residenceCountry: country }),
        setTaxBracketIndia: (rate) => set({ taxBracketIndia: rate }),
        setTaxBracketAbroad: (rate) => set({ taxBracketAbroad: rate }),
        setPreferredCurrency: (currency) => set({ preferredCurrency: currency }),
        setTheme: (theme) => set({ theme }),
        reset: () => set(DEFAULT_SETTINGS),
      }),
      { name: 'nri-investor-settings' },
    ),
  );

export type SettingsStore = ReturnType<typeof createSettingsStore>;
