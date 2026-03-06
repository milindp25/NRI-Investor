'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface CompareFloatingBarProps {
  selectedCount: number;
  onClear: () => void;
}

export function CompareFloatingBar({ selectedCount, onClear }: CompareFloatingBarProps) {
  const router = useRouter();

  if (selectedCount < 2) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-full border bg-background/95 px-6 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <span className="text-sm font-medium">{selectedCount} items selected</span>
        <Button onClick={() => router.push('/compare/fixed-deposits')} size="sm">
          Compare Selected
        </Button>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}
