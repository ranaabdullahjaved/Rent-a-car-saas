import Link from 'next/link'
import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import * as investorService from '@/lib/modules/investor/investor.service'
import * as agreementService from '@/lib/modules/investor/agreement.service'
import { AGREEMENT_TYPE_LABELS } from '@/lib/modules/investor/agreement.validation'
import { requireTenantOrRedirect } from '@/lib/tenant'

export const metadata: Metadata = { title: 'Investors' }

export default async function InvestorsPage() {
  const { tenantId } = await requireTenantOrRedirect()

  const [investors, agreements] = await Promise.all([
    investorService.listInvestors(tenantId),
    agreementService.listAgreements(tenantId),
  ])

  const byInvestor = new Map<string, typeof agreements>()
  for (const a of agreements) {
    const key = String(a.investorId)
    byInvestor.set(key, [...(byInvestor.get(key) ?? []), a])
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Investors"
        description={
          investors.length === 0
            ? 'No investors yet.'
            : `${investors.length} investor${investors.length === 1 ? '' : 's'} · ${agreements.length} agreement${agreements.length === 1 ? '' : 's'}`
        }
      />

      {investors.length === 0 ? (
        <div className="rounded-lg border p-12 text-center text-muted-foreground">
          No investors yet. Add one, then attach an agreement to each car they own.
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {investors.map((inv) => {
            const theirs = byInvestor.get(String(inv.id)) ?? []
            return (
              <section key={String(inv.id)} className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/investors/${inv.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {inv.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {inv.phone ?? 'no phone'} · settles {inv.settlementCycle}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {theirs.length} car{theirs.length === 1 ? '' : 's'}
                  </span>
                </div>

                {theirs.length > 0 && (
                  <ul className="mt-3 divide-y text-sm">
                    {theirs.map((a) => (
                      <li key={String(a.id)} className="flex justify-between gap-4 py-1.5">
                        <span>{a.vehicleRegistration}</span>
                        <span className="text-muted-foreground">
                          {a.agreementType === 'fixed_rent'
                            ? `${a.fixedMonthlyAmount}/month`
                            : `${a.sharePercent}% · ${AGREEMENT_TYPE_LABELS[a.agreementType]}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
