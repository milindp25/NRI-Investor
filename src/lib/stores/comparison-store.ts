import { createStore } from 'zustand/vanilla';
import { persist } from 'zustand/middleware';
import type { ComparisonResult, FixedDepositInput, FixedDepositResult } from '@/types';

type FDComparison = ComparisonResult<FixedDepositInput, FixedDepositResult>;

interface ComparisonState {
  savedComparisons: FDComparison[];
  saveComparison: (comparison: FDComparison) => void;
  removeComparison: (id: string) => void;
  clearAll: () => void;
}

export const createComparisonStore = () =>
  createStore<ComparisonState>()(
    persist(
      (set) => ({
        savedComparisons: [],
        saveComparison: (comparison) =>
          set((state) => ({
            savedComparisons: [comparison, ...state.savedComparisons].slice(0, 20),
          })),
        removeComparison: (id) =>
          set((state) => ({
            savedComparisons: state.savedComparisons.filter((c) => c.id !== id),
          })),
        clearAll: () => set({ savedComparisons: [] }),
      }),
      { name: 'nri-investor-comparisons' },
    ),
  );

export type ComparisonStore = ReturnType<typeof createComparisonStore>;
