import Link from 'next/link';
import { IndianRupee } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ThemeProvider } from '@/components/layout/theme-provider';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <div className="flex min-h-svh flex-col">
        {/* Top navigation bar */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <IndianRupee className="size-4" />
              </div>
              <span className="text-lg font-semibold">NRI Investor</span>
            </Link>

            <Button asChild size="sm">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1">{children}</main>

        {/* Footer */}
        <footer className="border-t bg-muted/50">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <IndianRupee className="size-3" />
                  </div>
                  <span className="font-semibold">NRI Investor</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Compare investment returns across India and the US.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold">Product</h3>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>
                    <Link href="/rates" className="transition-colors hover:text-foreground">
                      Rate Directory
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/compare/fixed-deposits"
                      className="transition-colors hover:text-foreground"
                    >
                      FD vs CD Compare
                    </Link>
                  </li>
                  <li>
                    <Link href="/tax-advisor" className="transition-colors hover:text-foreground">
                      Tax Advisor
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold">Resources</h3>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>
                    <Link href="/knowledge-hub" className="transition-colors hover:text-foreground">
                      Knowledge Hub
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard" className="transition-colors hover:text-foreground">
                      Dashboard
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold">Legal</h3>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>
                    <span className="text-muted-foreground">Privacy Policy</span>
                  </li>
                  <li>
                    <span className="text-muted-foreground">Terms of Service</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8 border-t pt-4 text-center text-xs text-muted-foreground">
              <p>
                NRI Investor is an informational tool. Not financial advice. Consult a qualified
                advisor before making investment decisions.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}
