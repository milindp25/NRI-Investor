'use client';

export function StocksTab() {
  return (
    <div className="space-y-6">
      <div className="premium-card p-6">
        <h2 className="text-xl font-semibold mb-1">Stocks &amp; ETFs</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Compare index fund and ETF returns across US and Indian markets. Coming soon.
        </p>

        <div className="premium-card-highlight p-8 text-center">
          <div className="text-4xl mb-4">&#128200;</div>
          <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            We&apos;re building a comprehensive stocks and ETF comparison tool for NRI investors.
            Compare S&amp;P 500, Nifty 50, and other index funds with tax-adjusted cross-border
            returns.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
            <div className="bg-secondary rounded-xl p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">S&amp;P 500</div>
              <div className="text-sm font-semibold text-teal">+24.5% YTD</div>
            </div>
            <div className="bg-secondary rounded-xl p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Nifty 50</div>
              <div className="text-sm font-semibold text-teal">+18.2% YTD</div>
            </div>
            <div className="bg-secondary rounded-xl p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">VOO (ETF)</div>
              <div className="text-sm font-semibold text-gold">0.03% ER</div>
            </div>
            <div className="bg-secondary rounded-xl p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Nifty BeES</div>
              <div className="text-sm font-semibold text-gold">0.05% ER</div>
            </div>
          </div>
        </div>
      </div>

      {/* What's planned */}
      <div className="premium-card p-6">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          What&apos;s Coming
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-secondary rounded-xl p-4">
            <h4 className="text-sm font-semibold mb-1">US Market</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>&#8226; S&amp;P 500 / Nasdaq 100 index returns</li>
              <li>&#8226; Top ETFs (VOO, VTI, QQQ, SCHD)</li>
              <li>&#8226; Tax implications for NRIs</li>
              <li>&#8226; Estate tax considerations ($60K threshold)</li>
            </ul>
          </div>
          <div className="bg-secondary rounded-xl p-4">
            <h4 className="text-sm font-semibold mb-1">India Market</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>&#8226; Nifty 50 / Sensex returns</li>
              <li>&#8226; NRI-eligible mutual funds</li>
              <li>&#8226; LTCG / STCG tax for NRIs</li>
              <li>&#8226; Repatriation rules for equity gains</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
