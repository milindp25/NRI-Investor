import Link from 'next/link';

export function NREvsNROArticle() {
  return (
    <div className="space-y-6">
      <div className="premium-card p-6 space-y-3">
        <h2 className="text-lg font-semibold">What are NRE and NRO Accounts?</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          NRE (Non-Resident External) and NRO (Non-Resident Ordinary) are two types of bank accounts
          that NRIs must maintain in India. Each serves a different purpose and has distinct tax and
          repatriation rules.
        </p>
      </div>

      <div className="premium-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                Feature
              </th>
              <th className="text-center py-3 px-4 text-xs font-medium text-teal uppercase">NRE</th>
              <th className="text-center py-3 px-4 text-xs font-medium text-warm uppercase">NRO</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Source of Funds', 'Foreign income only', 'Indian + Foreign income'],
              ['Tax on Interest', 'Tax-free in India', '30% TDS (DTAA may reduce)'],
              ['Repatriation', 'Fully repatriable', 'Up to $1M/year (FEMA limit)'],
              ['Currency Risk', 'Yes (INR conversion)', 'Yes (INR conversion)'],
              ['Joint Account', 'Only with another NRI', 'Can add resident Indian'],
              ['FD Rates', 'Slightly lower', 'Same as resident rates'],
              ['Ideal For', 'Saving foreign earnings', 'Managing India income'],
            ].map(([feature, nre, nro]) => (
              <tr key={feature} className="border-b border-border/50">
                <td className="py-2.5 px-4 font-medium">{feature}</td>
                <td className="py-2.5 px-4 text-center text-teal">{nre}</td>
                <td className="py-2.5 px-4 text-center text-warm">{nro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="premium-card p-6 space-y-3">
        <h2 className="text-lg font-semibold">When to Use NRE</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-teal shrink-0">&#10003;</span> Parking foreign salary or savings
            in India
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal shrink-0">&#10003;</span> FDs where you want tax-free
            interest
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal shrink-0">&#10003;</span> Funds you may want to repatriate
            back fully
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal shrink-0">&#10003;</span> Sending money to family in India
          </li>
        </ul>
      </div>

      <div className="premium-card p-6 space-y-3">
        <h2 className="text-lg font-semibold">When to Use NRO</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-warm shrink-0">&#10003;</span> Receiving rental income from Indian
            property
          </li>
          <li className="flex items-start gap-2">
            <span className="text-warm shrink-0">&#10003;</span> Dividends from Indian stocks or
            mutual funds
          </li>
          <li className="flex items-start gap-2">
            <span className="text-warm shrink-0">&#10003;</span> Pension or provident fund
            withdrawals
          </li>
          <li className="flex items-start gap-2">
            <span className="text-warm shrink-0">&#10003;</span> Sale proceeds from Indian assets
          </li>
        </ul>
      </div>

      <div className="premium-card p-5 border-l-4" style={{ borderLeftColor: 'var(--gold)' }}>
        <p className="text-sm font-medium mb-1">Pro Tip</p>
        <p className="text-sm text-muted-foreground">
          Most NRIs should maintain both accounts. Use NRE for foreign earnings (tax-free interest)
          and NRO for Indian income. Use our{' '}
          <Link href="/tax-advisor" className="text-gold hover:underline">
            Tax Advisor
          </Link>{' '}
          to calculate the exact tax difference.
        </p>
      </div>
    </div>
  );
}
