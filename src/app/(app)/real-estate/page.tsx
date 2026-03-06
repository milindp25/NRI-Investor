'use client';

import { useState } from 'react';
import { PropertyInputForm } from './_components/property-input-form';
import { PropertyResults } from './_components/property-results';
import type { PropertyInput, PropertyResult } from '@/types';

export default function RealEstatePage() {
  const [result, setResult] = useState<PropertyResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isNRI, setIsNRI] = useState(true);
  const [error, setError] = useState('');

  async function handleCalculate(input: PropertyInput) {
    setIsLoading(true);
    setError('');
    setIsNRI(input.isNRI);
    try {
      const res = await fetch('/api/calculate/real-estate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Calculation failed');
        return;
      }
      setResult(data.data);
      // Scroll to results
      setTimeout(() => {
        document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch {
      setError('Failed to calculate. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Real <span className="font-serif italic gold-gradient-text">Estate</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Property investment analysis with rental yield, appreciation, EMI, and FEMA repatriation
        </p>
      </div>

      <PropertyInputForm onCalculate={handleCalculate} isLoading={isLoading} />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {result && (
        <div id="results">
          <PropertyResults result={result} isNRI={isNRI} />
        </div>
      )}

      {/* Disclaimer */}
      <footer className="text-center space-y-1 pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          Estimates based on simplified assumptions. Actual returns may vary.
        </p>
        <p className="text-[10px] text-muted-foreground/60">
          Capital gains tax uses simplified indexation. Consult a CA for precise calculations.
        </p>
      </footer>
    </div>
  );
}
