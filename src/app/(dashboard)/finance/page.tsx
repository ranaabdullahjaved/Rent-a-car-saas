import Link from 'next/link'
import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import * as paymentService from '@/lib/modules/finance/payment.service'
import { listLedgerEntries } from '@/lib/modules/finance/ledger.service'
import * as expenseService from '@/lib/modules/finance/expense.service'
import * as vendorService from '@/lib/modules/vendor/vendor.service'
import { categoryLabel } from '@/lib/modules/finance/ledger.categories'
import { ZERO, addMoney, formatPKR, money, subtractMoney, type Money } from '@/lib/money'
import { requireTenantOrRedirect } from '@/lib/tenant'
import { cn } from '@/lib/utils'
import { ExpenseForm } from './expense-form'

export const metadata: Metadata = { title: 'Finance' }

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-medium tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

export default async function FinancePage() {
  const { tenantId } = await requireTenantOrRedirect()

  const [entries, receivables, expenseRows, options, outsourcing, outsourcingSummary] =
    await Promise.all([
      listLedgerEntries(tenantId, 100),
      paymentService.getReceivables(tenantId),
      expenseService.listExpenses(tenantId),
      expenseService.getExpenseFormOptions(tenantId),
      vendorService.getOutsourcingLedger(tenantId),
      vendorService.getOutsourcingSummary(tenantId),
    ])

  // Totals are summed through the Money type rather than by casting to number,
  // for the same reason the columns are numeric in the first place.
  let income: Money = ZERO
  let expense: Money = ZERO
  const byCategory = new Map<string, Money>()

  for (const e of entries) {
    if (e.isReversal) continue
    const amount = money(e.amount)
    if (e.direction === 'income') income = addMoney(income, amount)
    else expense = addMoney(expense, amount)
    byCategory.set(e.category, addMoney(byCategory.get(e.category) ?? ZERO, amount))
  }

  const net = subtractMoney(income, expense)
  const ranked = [...byCategory.entries()].sort((a, b) => Number(b[1]) - Number(a[1]))

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Finance"
        description="Every rupee that has moved, and what is still owed."
        actions={
          <ExpenseForm
            options={{
              vehicles: options.vehicles.map((v) => ({ ...v, id: String(v.id) })),
              employees: options.employees.map((e) => ({ ...e, id: String(e.id) })),
              vendors: options.vendors.map((v) => ({ ...v, id: String(v.id) })),
            }}
          />
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Money in" value={formatPKR(income)} hint="cash received" />
        <Stat label="Money out" value={formatPKR(expense)} hint="cash paid" />
        <Stat label="Net" value={formatPKR(net)} hint="in minus out" />
        <Stat
          label="Outstanding"
          value={formatPKR(receivables.outstanding)}
          hint={`${formatPKR(receivables.charged)} charged`}
        />
      </div>

      <div className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        The ledger is kept on a cash basis: a row appears when money actually moves. A booking
        charge is what a customer owes, not income — it becomes income when they pay. That is why
        &ldquo;outstanding&rdquo; is tracked separately rather than sitting in the ledger.
      </div>

      {ranked.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-medium">By category</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ranked.map(([cat, amount]) => (
              <div key={cat} className="flex items-baseline justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                <span>{categoryLabel(cat)}</span>
                <span className="tabular-nums">{formatPKR(amount)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {outsourcing.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-1 text-sm font-medium">Outsourcing</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            {outsourcingSummary.jobs} job{outsourcingSummary.jobs === 1 ? '' : 's'} ·{' '}
            {outsourcingSummary.inbound} taken from other operators · {outsourcingSummary.outbound}{' '}
            of your cars lent out · total margin {formatPKR(outsourcingSummary.margin)}
            {outsourcingSummary.lossMaking > 0
              ? ` · ${outsourcingSummary.lossMaking} lost money`
              : ''}
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Booking</th>
                  <th className="px-4 py-2.5 font-medium">Direction</th>
                  <th className="px-4 py-2.5 font-medium">Counterparty</th>
                  <th className="px-4 py-2.5 text-right font-medium">Revenue</th>
                  <th className="px-4 py-2.5 text-right font-medium">Cost</th>
                  <th className="px-4 py-2.5 text-right font-medium">Margin</th>
                </tr>
              </thead>
              <tbody>
                {outsourcing.map((o) => {
                  const loss = o.margin.startsWith('-')
                  return (
                    <tr key={String(o.bookingId)} className="border-t">
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/bookings/${o.bookingId}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {o.bookingNo}
                        </Link>
                        <span className="block text-xs text-muted-foreground">{o.customerName}</span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {o.direction === 'inbound' ? 'their car' : 'our car'}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{o.vendorName ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatPKR(o.customerRevenue)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {formatPKR(o.vendorCost)}
                      </td>
                      <td
                        className={cn(
                          'px-4 py-2.5 text-right tabular-nums',
                          loss && 'text-destructive'
                        )}
                      >
                        {loss ? '' : '+'}
                        {formatPKR(o.margin)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {expenseRows.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-medium">Expenses</h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Category</th>
                  <th className="px-4 py-2.5 font-medium">Attributed to</th>
                  <th className="px-4 py-2.5 font-medium">Paid to</th>
                  <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenseRows.map((e) => (
                  <tr key={String(e.id)} className="border-t">
                    <td className="px-4 py-2.5 tabular-nums">{e.expenseDate}</td>
                    <td className="px-4 py-2.5">{categoryLabel(e.category)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {e.vehicleRegistration ? (
                        <Link href={`/fleet/${e.vehicleId}`} className="underline underline-offset-4">
                          {e.vehicleRegistration}
                        </Link>
                      ) : (
                        (e.employeeName ?? e.vendorName ?? 'overhead')
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{e.paidTo ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {formatPKR(money(e.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-medium">Ledger</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 font-medium">Detail</th>
                <th className="px-4 py-2.5 font-medium">Source</th>
                <th className="px-4 py-2.5 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    Nothing yet. The ledger fills up as payments are recorded against{' '}
                    <Link href="/bookings" className="underline underline-offset-4">
                      bookings
                    </Link>
                    .
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={String(e.id)} className={cn('border-t', e.isReversal && 'opacity-60')}>
                    <td className="px-4 py-2.5 tabular-nums">{e.entryDate}</td>
                    <td className="px-4 py-2.5">
                      {categoryLabel(e.category)}
                      {e.isReversal && (
                        <span className="ml-2 text-xs text-destructive">reversal</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{e.description ?? '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {e.bookingId ? (
                        <Link
                          href={`/bookings/${e.bookingId}`}
                          className="underline underline-offset-4"
                        >
                          {e.sourceType}
                        </Link>
                      ) : (
                        e.sourceType
                      )}
                    </td>
                    <td
                      className={cn(
                        'px-4 py-2.5 text-right tabular-nums',
                        e.direction === 'expense' && 'text-muted-foreground'
                      )}
                    >
                      {e.direction === 'expense' ? '−' : ''}
                      {formatPKR(money(e.amount))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {entries.length === 100 && (
          <p className="mt-3 text-xs text-muted-foreground">Showing the 100 most recent entries.</p>
        )}
      </section>
    </div>
  )
}
