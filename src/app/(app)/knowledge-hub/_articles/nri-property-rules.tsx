import Link from 'next/link';

export function NRIPropertyArticle() {
  return (
    <div className="space-y-6">
      <div className="premium-card p-6 space-y-3">
        <h2 className="text-lg font-semibold">Can NRIs Buy Property in India?</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Yes, NRIs and PIOs (Persons of Indian Origin) can purchase residential and commercial
          property in India without any special RBI permission. However, there are restrictions on
          agricultural land, plantation property, and farmhouses.
        </p>
      </div>

      <div className="premium-card p-6 space-y-3">
        <h2 className="text-lg font-semibold">FEMA Restrictions</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-teal shrink-0">&#10003;</span> Can buy any number of
            residential/commercial properties
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal shrink-0">&#10003;</span> Payment must be from NRE/NRO/FCNR
            account or inward remittance
          </li>
          <li className="flex items-start gap-2">
            <span className="text-destructive shrink-0">&#10007;</span> Cannot buy agricultural
            land, plantation, or farmhouse
          </li>
          <li className="flex items-start gap-2">
            <span className="text-destructive shrink-0">&#10007;</span> Cannot purchase property
            jointly with a resident Indian (except spouse)
          </li>
        </ul>
      </div>

      <div className="premium-card p-6 space-y-3">
        <h2 className="text-lg font-semibold">Tax on Property Sale</h2>
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-secondary/30">
            <p className="text-sm font-medium">Short-Term (held &lt; 2 years)</p>
            <p className="text-xs text-muted-foreground">
              Taxed at 30% (slab rate for NRIs) + surcharge + cess
            </p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30">
            <p className="text-sm font-medium">Long-Term (held &ge; 2 years)</p>
            <p className="text-xs text-muted-foreground">
              20% with indexation OR 12.5% without indexation (choose lower)
            </p>
          </div>
        </div>
      </div>

      <div className="premium-card p-6 space-y-3">
        <h2 className="text-lg font-semibold">Repatriation of Sale Proceeds</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-gold shrink-0">1.</span> If purchased with NRE/FCNR funds: sale
            proceeds (up to 2 properties) are fully repatriable
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gold shrink-0">2.</span> If purchased with NRO funds: repatriation
            limited to $1M/year from NRO
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gold shrink-0">3.</span> Capital gains tax must be paid before
            repatriation
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gold shrink-0">4.</span> CA certificate (Form 15CB) and
            self-declaration (Form 15CA) required
          </li>
        </ul>
      </div>

      <div className="premium-card p-6 space-y-3">
        <h2 className="text-lg font-semibold">Tax Saving Options</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-teal shrink-0">&#10003;</span> <strong>Section 54:</strong>{' '}
            Reinvest in another residential property within 2 years
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal shrink-0">&#10003;</span> <strong>Section 54EC:</strong>{' '}
            Invest up to ₹50L in specified bonds (NHAI/REC) within 6 months
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal shrink-0">&#10003;</span> <strong>Section 54F:</strong> For
            non-residential property, invest net consideration in residential property
          </li>
        </ul>
      </div>

      <div className="premium-card p-5 border-l-4" style={{ borderLeftColor: 'var(--gold)' }}>
        <p className="text-sm font-medium mb-1">Calculate Your Property Returns</p>
        <p className="text-sm text-muted-foreground">
          Use our{' '}
          <Link href="/real-estate" className="text-gold hover:underline">
            Real Estate Calculator
          </Link>{' '}
          to analyze rental yield, appreciation, and repatriation for any property.
        </p>
      </div>
    </div>
  );
}
