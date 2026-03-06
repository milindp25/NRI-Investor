export function TaxFilingArticle() {
  return (
    <div className="space-y-6">
      <div className="premium-card p-6 space-y-3">
        <h2 className="text-lg font-semibold">Do NRIs Need to File ITR in India?</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          NRIs must file an Income Tax Return (ITR) in India if their Indian income exceeds the
          basic exemption limit (₹3,00,000 for FY 2025-26) or if they want to claim a TDS refund.
          Even if TDS has been deducted, filing ITR is recommended to claim refunds and maintain
          compliance.
        </p>
      </div>

      <div className="premium-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Filing Checklist</h2>
        <div className="space-y-3">
          {[
            {
              task: 'Determine NRI status (182-day rule)',
              detail: 'If you stayed in India < 182 days in the FY, you are NRI for tax purposes',
            },
            {
              task: 'Collect Form 16A from banks',
              detail: 'TDS certificates for FD interest, rent, etc.',
            },
            {
              task: 'Gather Form 26AS / AIS',
              detail: 'Annual Information Statement showing all TDS, income, and transactions',
            },
            {
              task: 'Get TRC if claiming DTAA',
              detail: 'Tax Residency Certificate from your residence country',
            },
            {
              task: 'Choose correct ITR form',
              detail: 'ITR-2 for NRIs with capital gains, ITR-1 not available for NRIs',
            },
            {
              task: 'Report all Indian income',
              detail: 'FD interest, rental, capital gains, dividends',
            },
            {
              task: 'Claim Foreign Tax Credit',
              detail: 'If paying tax in both countries, file Form 67',
            },
            {
              task: 'File before deadline',
              detail: 'July 31 for non-audit cases, October 31 for audit cases',
            },
          ].map(({ task, detail }, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
              <span className="flex items-center justify-center size-6 rounded-full gold-gradient-bg text-[#0A0E15] text-xs font-bold shrink-0">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium">{task}</p>
                <p className="text-xs text-muted-foreground">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="premium-card p-6 space-y-3">
        <h2 className="text-lg font-semibold">Which ITR Form?</h2>
        <div className="space-y-2">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
            <span className="type-psu text-xs shrink-0">ITR-2</span>
            <p className="text-sm text-muted-foreground">
              Most NRIs — salary, FD interest, capital gains, rental income, foreign assets
            </p>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
            <span className="type-pvt text-xs shrink-0">ITR-3</span>
            <p className="text-sm text-muted-foreground">
              NRIs with business/professional income in India
            </p>
          </div>
        </div>
      </div>

      <div className="premium-card p-6 space-y-3">
        <h2 className="text-lg font-semibold">Common Mistakes</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-destructive shrink-0">&#10007;</span> Using ITR-1 (Sahaj) — not
            available for NRIs
          </li>
          <li className="flex items-start gap-2">
            <span className="text-destructive shrink-0">&#10007;</span> Not reporting foreign bank
            accounts in Schedule FA
          </li>
          <li className="flex items-start gap-2">
            <span className="text-destructive shrink-0">&#10007;</span> Missing Form 67 deadline for
            Foreign Tax Credit
          </li>
          <li className="flex items-start gap-2">
            <span className="text-destructive shrink-0">&#10007;</span> Not claiming TDS refund on
            NRO FD interest
          </li>
          <li className="flex items-start gap-2">
            <span className="text-destructive shrink-0">&#10007;</span> Filing under wrong
            residential status
          </li>
        </ul>
      </div>

      <div className="premium-card p-6 space-y-3">
        <h2 className="text-lg font-semibold">Key Deadlines (FY 2025-26)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-secondary/30 text-center">
            <p className="text-xs text-muted-foreground">ITR Filing</p>
            <p className="text-sm font-medium text-gold">July 31, 2026</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30 text-center">
            <p className="text-xs text-muted-foreground">Belated Return</p>
            <p className="text-sm font-medium text-warm">December 31, 2026</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30 text-center">
            <p className="text-xs text-muted-foreground">Form 67 (FTC)</p>
            <p className="text-sm font-medium text-gold">Before ITR filing</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30 text-center">
            <p className="text-xs text-muted-foreground">Advance Tax</p>
            <p className="text-sm font-medium text-warm">Quarterly (June/Sep/Dec/Mar)</p>
          </div>
        </div>
      </div>

      <div className="premium-card p-5 border-l-4" style={{ borderLeftColor: 'var(--warm)' }}>
        <p className="text-sm font-semibold text-warm mb-1">Important</p>
        <p className="text-sm text-muted-foreground">
          Late filing attracts penalty of ₹5,000 (₹1,000 if income &lt; ₹5L) plus interest on unpaid
          tax. File on time even if you have no tax liability to maintain clean compliance records.
        </p>
      </div>
    </div>
  );
}
