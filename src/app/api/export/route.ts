import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '@/lib/api'
import { requireCan, requireTenant } from '@/lib/tenant'
import { ValidationError } from '@/lib/errors'
import { listLedgerEntries } from '@/lib/modules/finance/ledger.service'
import { categoryLabel } from '@/lib/modules/finance/ledger.categories'
import * as expenseService from '@/lib/modules/finance/expense.service'
import * as reportService from '@/lib/modules/report/report.service'
import { monthToDate } from '@/lib/modules/report/report.periods'

function csvCell(value: unknown): string {
  const s = String(value ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function csvResponse(filename: string, header: string[], rows: unknown[][]) {
  // The BOM makes Excel read the file as UTF-8, so Urdu names survive.
  const body =
    '﻿' +
    [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') +
    '\r\n'
  return new NextResponse(body, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
    },
  })
}

/** CSV downloads for the accountant: the ledger, expenses, or per-vehicle profit. */
export async function GET(request: NextRequest) {
  try {
    const { tenantId, role } = await requireTenant()
    requireCan({ role }, 'reports.view')

    const what = request.nextUrl.searchParams.get('what') ?? 'ledger'
    const today = new Date().toISOString().slice(0, 10)

    if (what === 'ledger') {
      const rows = await listLedgerEntries(tenantId, 5000)
      return csvResponse(
        `ledger-${today}.csv`,
        ['Date', 'Direction', 'Category', 'Amount', 'Description', 'Source', 'Reversal'],
        rows.map((e) => [
          e.entryDate,
          e.direction,
          categoryLabel(e.category),
          e.amount,
          e.description ?? '',
          e.sourceType,
          e.isReversal ? 'yes' : '',
        ])
      )
    }

    if (what === 'expenses') {
      const rows = await expenseService.listExpenses(tenantId)
      return csvResponse(
        `expenses-${today}.csv`,
        ['Date', 'Category', 'Amount', 'Vehicle', 'Paid to', 'Description'],
        rows.map((e) => [
          e.expenseDate,
          categoryLabel(e.category),
          e.amount,
          e.vehicleRegistration ?? '',
          e.paidTo ?? '',
          e.description ?? '',
        ])
      )
    }

    if (what === 'vehicles') {
      const rows = await reportService.getVehicleProfitability(tenantId, monthToDate())
      return csvResponse(
        `vehicle-profit-${today}.csv`,
        ['Registration', 'Make', 'Model', 'Owner', 'Days out', 'Revenue', 'Costs', 'Net'],
        rows.map((v) => [
          v.registrationNo,
          v.make,
          v.model,
          v.investorName ?? v.ownershipType,
          v.daysOnRoad,
          v.revenue,
          v.directCosts,
          v.net,
        ])
      )
    }

    throw new ValidationError('Unknown export')
  } catch (err) {
    return apiError(err)
  }
}
