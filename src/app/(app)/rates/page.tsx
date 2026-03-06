'use client';

import { useCallback, useState } from 'react';
import useSWR from 'swr';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import type { ApiSuccessResponse, RateDirectory } from '@/types';
import {
  RateHighlightCards,
  IndiaFDTable,
  IndiaNBFCTable,
  IndiaGovtTable,
  USCDTable,
  USHYSATable,
  USTreasuryTable,
  USMoneyMarketTable,
  CompareFloatingBar,
} from './_components';

const fetcher = (url: string) =>
  fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error('Failed to fetch rates');
      return res.json();
    })
    .then((json: ApiSuccessResponse<RateDirectory>) => json.data);

export default function RatesPage() {
  const { data, isLoading } = useSWR('/api/rates', fetcher, {
    revalidateOnFocus: false,
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-6 py-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Rate <span className="font-serif italic gold-gradient-text">Directory</span>
        </h1>
        <p className="mt-1 text-muted-foreground">
          Compare current rates across banks and institutions. Sorted by best returns.
        </p>
      </div>

      {/* Highlight Cards */}
      <RateHighlightCards
        indiaFDRates={data?.indiaFDRates}
        usCDRates={data?.usCDRates}
        usHYSARates={data?.usHYSARates}
        isLoading={isLoading}
      />

      {/* Country Tabs */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <Tabs defaultValue="india" className="w-full">
          <TabsList>
            <TabsTrigger value="india">India</TabsTrigger>
            <TabsTrigger value="us">United States</TabsTrigger>
          </TabsList>

          {/* ----- India Tab ----- */}
          <TabsContent value="india" className="space-y-2">
            <Tabs defaultValue="fd-nre" className="w-full">
              <TabsList variant="line">
                <TabsTrigger value="fd-nre">Bank FDs (NRE)</TabsTrigger>
                <TabsTrigger value="fd-nro">Bank FDs (NRO)</TabsTrigger>
                <TabsTrigger value="nbfc">NBFCs</TabsTrigger>
                <TabsTrigger value="govt">Govt Schemes</TabsTrigger>
              </TabsList>

              <TabsContent value="fd-nre" className="mt-4">
                <IndiaFDTable
                  rates={data?.indiaFDRates ?? []}
                  accountType="NRE"
                  isLoading={isLoading}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                />
              </TabsContent>

              <TabsContent value="fd-nro" className="mt-4">
                <IndiaFDTable
                  rates={data?.indiaFDRates ?? []}
                  accountType="NRO"
                  isLoading={isLoading}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                />
              </TabsContent>

              <TabsContent value="nbfc" className="mt-4">
                <IndiaNBFCTable
                  rates={data?.indiaNBFCRates ?? []}
                  isLoading={isLoading}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                />
              </TabsContent>

              <TabsContent value="govt" className="mt-4">
                <IndiaGovtTable schemes={data?.indiaGovtSchemes ?? []} isLoading={isLoading} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* ----- US Tab ----- */}
          <TabsContent value="us" className="space-y-2">
            <Tabs defaultValue="cd" className="w-full">
              <TabsList variant="line">
                <TabsTrigger value="cd">CDs</TabsTrigger>
                <TabsTrigger value="hysa">High-Yield Savings</TabsTrigger>
                <TabsTrigger value="treasury">Treasury</TabsTrigger>
                <TabsTrigger value="money-market">Money Market</TabsTrigger>
              </TabsList>

              <TabsContent value="cd" className="mt-4">
                <USCDTable
                  rates={data?.usCDRates ?? []}
                  isLoading={isLoading}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                />
              </TabsContent>

              <TabsContent value="hysa" className="mt-4">
                <USHYSATable
                  rates={data?.usHYSARates ?? []}
                  isLoading={isLoading}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                />
              </TabsContent>

              <TabsContent value="treasury" className="mt-4">
                <USTreasuryTable rates={data?.usTreasuryRates ?? []} isLoading={isLoading} />
              </TabsContent>

              <TabsContent value="money-market" className="mt-4">
                <USMoneyMarketTable rates={data?.usMoneyMarketRates ?? []} isLoading={isLoading} />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      )}

      {/* Floating Compare Bar */}
      <CompareFloatingBar selectedCount={selectedIds.size} onClear={handleClearSelection} />
    </div>
  );
}
