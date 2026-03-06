import Link from 'next/link';

export function DTAAExplainedArticle() {
  return (
    <div className="space-y-6">
      <div className="premium-card p-6 space-y-3">
        <h2 className="text-lg font-semibold">What is DTAA?</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Double Taxation Avoidance Agreement (DTAA) is a treaty between two countries to prevent
          the same income from being taxed twice. India has DTAA treaties with over 90 countries
          including the US, UK, Canada, Australia, Singapore, UAE, and Germany.
        </p>
      </div>

      <div className="premium-card p-6 space-y-3">
        <h2 className="text-lg font-semibold">How DTAA Benefits NRIs</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-gold shrink-0">1.</span> <strong>Reduced TDS:</strong> Interest
            income TDS can drop from 30% to 10-15% depending on country
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gold shrink-0">2.</span> <strong>Foreign Tax Credit:</strong> Tax
            paid in India can be credited against tax in your residence country
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gold shrink-0">3.</span> <strong>Exemptions:</strong> Certain
            income types may be exempt from tax in one country
          </li>
        </ul>
      </div>

      <div className="premium-card p-6 space-y-3">
        <h2 className="text-lg font-semibold">How to Claim DTAA Benefits</h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center size-6 rounded-full gold-gradient-bg text-[#0A0E15] text-xs font-bold shrink-0">
              1
            </span>
            <div>
              <p className="font-medium text-foreground">Obtain Tax Residency Certificate (TRC)</p>
              <p>
                Get this from your country of residence&apos;s tax authority (e.g., IRS for US, HMRC
                for UK)
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center size-6 rounded-full gold-gradient-bg text-[#0A0E15] text-xs font-bold shrink-0">
              2
            </span>
            <div>
              <p className="font-medium text-foreground">Fill Form 10F</p>
              <p>Self-declaration form required by Indian banks/deductors along with TRC</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center size-6 rounded-full gold-gradient-bg text-[#0A0E15] text-xs font-bold shrink-0">
              3
            </span>
            <div>
              <p className="font-medium text-foreground">Submit to Bank/Deductor</p>
              <p>
                Provide TRC + Form 10F to your Indian bank before the financial year starts for
                reduced TDS
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center size-6 rounded-full gold-gradient-bg text-[#0A0E15] text-xs font-bold shrink-0">
              4
            </span>
            <div>
              <p className="font-medium text-foreground">Claim Foreign Tax Credit</p>
              <p>
                When filing taxes in your residence country, claim credit for taxes paid in India
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="premium-card p-5 border-l-4" style={{ borderLeftColor: 'var(--gold)' }}>
        <p className="text-sm font-medium mb-1">Calculate Your DTAA Benefit</p>
        <p className="text-sm text-muted-foreground">
          Use our{' '}
          <Link href="/tax-advisor" className="text-gold hover:underline">
            DTAA Calculator
          </Link>{' '}
          to see exactly how much you save with your country&apos;s treaty.
        </p>
      </div>
    </div>
  );
}
