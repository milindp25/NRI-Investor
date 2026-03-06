export function FEMAGuideArticle() {
  return (
    <div className="space-y-6">
      <div className="premium-card p-6 space-y-3">
        <h2 className="text-lg font-semibold">What is FEMA?</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The Foreign Exchange Management Act (FEMA) governs all foreign exchange transactions in
          India. For NRIs, FEMA sets the rules on how much money can be sent to and from India, what
          investments are allowed, and repatriation limits.
        </p>
      </div>

      <div className="premium-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Key Repatriation Limits</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
            <div className="flex-1">
              <p className="text-sm font-medium">NRE Account</p>
              <p className="text-xs text-muted-foreground">
                Principal + interest fully repatriable. No limit.
              </p>
            </div>
            <span className="rating-best text-xs shrink-0">Fully Free</span>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
            <div className="flex-1">
              <p className="text-sm font-medium">NRO Account</p>
              <p className="text-xs text-muted-foreground">
                Up to USD 1 million per financial year (April-March)
              </p>
            </div>
            <span className="type-psu text-xs shrink-0">$1M/yr</span>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
            <div className="flex-1">
              <p className="text-sm font-medium">FCNR Account</p>
              <p className="text-xs text-muted-foreground">
                Principal + interest fully repatriable (held in foreign currency)
              </p>
            </div>
            <span className="rating-best text-xs shrink-0">Fully Free</span>
          </div>
        </div>
      </div>

      <div className="premium-card p-6 space-y-3">
        <h2 className="text-lg font-semibold">What NRIs Can Invest In</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { item: 'Fixed Deposits (NRE/NRO/FCNR)', allowed: true },
            { item: 'Mutual Funds', allowed: true },
            { item: 'Stocks & ETFs (via PIS)', allowed: true },
            { item: 'Government Bonds', allowed: true },
            { item: 'Residential Property (up to 2)', allowed: true },
            { item: 'Commercial Property', allowed: true },
            { item: 'Agricultural Land', allowed: false },
            { item: 'Plantation Property', allowed: false },
          ].map(({ item, allowed }) => (
            <div key={item} className="flex items-center gap-2 text-sm">
              <span className={allowed ? 'text-teal' : 'text-destructive'}>
                {allowed ? '✓' : '✗'}
              </span>
              <span className={allowed ? '' : 'text-muted-foreground'}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="premium-card p-6 space-y-3">
        <h2 className="text-lg font-semibold">Reporting Requirements</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-gold shrink-0">&#8250;</span> File ITR in India if Indian income
            exceeds basic exemption limit
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gold shrink-0">&#8250;</span> Report foreign assets in Schedule FA
            if filing Indian tax return
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gold shrink-0">&#8250;</span> US residents: Report Indian accounts
            on FBAR (FinCEN 114) if aggregate &gt; $10,000
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gold shrink-0">&#8250;</span> US residents: FATCA Form 8938 if
            Indian assets exceed thresholds
          </li>
        </ul>
      </div>

      <div className="premium-card p-5 border-l-4" style={{ borderLeftColor: 'var(--warm)' }}>
        <p className="text-sm font-semibold text-warm mb-1">Important</p>
        <p className="text-sm text-muted-foreground">
          FEMA violations can result in penalties up to 3x the amount involved. Always ensure
          compliance with both Indian and residence country regulations.
        </p>
      </div>
    </div>
  );
}
