'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { useStore } from 'zustand';
import { createSettingsStore, type SettingsStore } from './settings-store';
import { createComparisonStore, type ComparisonStore } from './comparison-store';

// Settings Store Context
const SettingsStoreContext = createContext<SettingsStore | null>(null);

export function SettingsStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createSettingsStore());
  return <SettingsStoreContext.Provider value={store}>{children}</SettingsStoreContext.Provider>;
}

export function useSettingsStore<T>(
  selector: (state: ReturnType<SettingsStore['getState']>) => T,
): T {
  const store = useContext(SettingsStoreContext);
  if (!store) throw new Error('useSettingsStore must be used within SettingsStoreProvider');
  return useStore(store, selector);
}

// Comparison Store Context
const ComparisonStoreContext = createContext<ComparisonStore | null>(null);

export function ComparisonStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createComparisonStore());
  return (
    <ComparisonStoreContext.Provider value={store}>{children}</ComparisonStoreContext.Provider>
  );
}

export function useComparisonStore<T>(
  selector: (state: ReturnType<ComparisonStore['getState']>) => T,
): T {
  const store = useContext(ComparisonStoreContext);
  if (!store) throw new Error('useComparisonStore must be used within ComparisonStoreProvider');
  return useStore(store, selector);
}
