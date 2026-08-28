import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { NotFoundError } from '@/lib/errors'
import * as investorService from '@/lib/modules/investor/investor.service'
import * as agreementService from '@/lib/modules/investor/agreement.service'
import * as fleetService from '@/lib/modules/fleet/fleet.service'
import { AGREEMENT_TYPE_LABELS } from '@/lib/modules/investor/agreement.validation'
import { fleetFilterSchema } from '@/lib/modules/fleet/fleet.validation'
import { formatPKR, money } from '@/lib/money'
import { requireTenantOrRedirect } from '@/lib/tenant'
import { AgreementForm } from '../agreement-form'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const metadata: Metadata = { title: 'Investor' }

/** Defaults the statement to the calendar month currently running. */
function defaultPeriod() {
  const now = new Date()
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

export default async function InvestorDetailPage({ params, searchParams }: Props) {
  const { tenantId } = await requireTenantOrRedirect()
  const { id } = await params
  const raw = await searchParams

  let investor
  try {
    investor = await investorService.getInvestor(tenantId, BigInt(id))
  } catch (err) {
    if (err instanceof NotFoundError) notFound()
    throw err
  }

  const period = defaultPeriod()
  const from = typeof raw.from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.from) ? raw.from : period.from
  const to = typeof raw.to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.to) ? raw.to : period.to

  const [agreements, statement, fleet] = await Promise.all([
    agreementService.listAgreements(tenantId, { investorId: BigInt(id) }),
    agreementService.buildPayoutStatement(tenantId, BigInt(id), from, to),
    fleetService.listVehicles(tenantId, fleetFilterSchema.parse({ sort: 'registrationNo', dir: 'asc' })),
  ])

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title={investor.name}
        description={`${investor.phone ?? 'no phone'} · settles ${investor.settlementCycle}`}
        actions={
          <Button asChild variant="outline">
            <Link href="/investors">Back to investors</Link>
          </Button>
        }
      />

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-sm font-medium">Statement</h2>
          <form className="flex flex-wrap items-center gap-2 text-sm">
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            />
            <span className="text-muted-foreground">to</span>
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            />
            <Button type="submit" size="sm" variant="outline">
              Recalculate
            </Button>
          </form>
        </div>

        {statement.lines.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No agreements cover this period, so there is nothing to settle.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Vehicle</th>
                    <th className="px-3 py-2 font-medium">Terms</th>
                    <th className="px-3 py-2 text-right font-medium">Revenue</th>
                    <th className="px-3 py-2 text-right font-medium">Deductions</th>
                    <th className="px-3 py-2 text-right font-medium">Base</th>
                    <th className="px-3 py-2 text-right font-medium">Their share</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.lines.map((l) => (
                    <tr key={String(l.vehicleId)} className="border-t">
                      <td className="px-3 py-2">
                        <Link href={`/fleet/${l.vehicleId}`} className="underline-offset-4 hover:underline">
                          {l.registrationNo}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{l.terms}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatPKR(l.revenue)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {formatPKR(l.deductions)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatPKR(l.base)}</td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">
                        {formatPKR(l.investorShare)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-baseline justify-end gap-6 text-sm">
              <span className="text-muted-foreground">
                revenue {formatPKR(statement.totalRevenue)} · deductions{' '}
                {formatPKR(statement.totalDeductions)}
              </span>
              <span className="text-base font-medium tabular-nums">
                Payable {formatPKR(statement.totalPayable)}
              </span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Revenue and costs come from the ledger, which records money that actually moved — so a
              charge the customer has not paid is not settled on.
            </p>
          </>
        )}
      </section>

      <section className="mt-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium">Agreements</h2>
        </div>
        {agreements.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No agreements yet. Add one per car this investor owns.
          </p>
        ) : (
          <ul className="divide-y text-sm">
            {agreements.map((a) => (
              <li key={String(a.id)} className="flex flex-wrap justify-between gap-3 py-2">
                <span>
                  <Link href={`/fleet/${a.vehicleId}`} className="underline-offset-4 hover:underline">
                    {a.vehicleRegistration}
                  </Link>
                  <span className="text-muted-foreground">
                    {' · '}
                    {a.vehicleMake} {a.vehicleModel}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {a.effectiveFrom} → {a.effectiveTo ?? 'open-ended'}
                    {a.agreementType === 'profit_share' &&
                      ` · investor absorbs ${[
                        a.investorAbsorbsMaintenance && 'maintenance',
                        a.investorAbsorbsDamage && 'damage',
                        a.investorAbsorbsChallans && 'challans',
                      ]
                        .filter(Boolean)
                        .join(', ') || 'nothing'}`}
                  </span>
                </span>
                <span className="tabular-nums">
                  {a.agreementType === 'fixed_rent'
                    ? `${formatPKR(money(a.fixedMonthlyAmount))} / month`
                    : `${a.sharePercent}%`}
                  <span className="block text-right text-xs text-muted-foreground">
                    {AGREEMENT_TYPE_LABELS[a.agreementType]}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}

        <AgreementForm
          investorId={id}
          vehicles={fleet.map((v) => ({
            id: String(v.id),
            registrationNo: v.registrationNo,
            make: v.make,
            model: v.model,
          }))}
        />
      </section>
    </div>
  )
}
