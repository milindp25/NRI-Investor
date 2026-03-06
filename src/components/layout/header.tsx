'use client';

import Link from 'next/link';
import { IndianRupee } from 'lucide-react';

export function Header() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/50 px-4">
      <Link
        href="/dashboard"
        className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
      >
        <div className="flex aspect-square size-7 items-center justify-center rounded-lg gold-gradient-bg text-[#0A0E15]">
          <IndianRupee className="size-3.5" />
        </div>
        <span className="text-sm font-semibold tracking-tight">
          NRI <span className="font-serif italic text-gold">Investor</span>
        </span>
      </Link>
    </header>
  );
}
