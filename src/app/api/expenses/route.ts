import { NextRequest } from 'next/server'
import { apiError, jsonOk } from '@/lib/api'
import { requireCan, requireTenant } from '@/lib/tenant'
import { ValidationError } from '@/lib/errors'
import * as expenseService from '@/lib/modules/finance/expense.service'
import { expenseFilterSchema, recordExpenseSchema } from '@/lib/modules/finance/expense.validation'

export async function GET(request: NextRequest) {
  try {
    const { tenantId, role } = await requireTenant()
    requireCan({ role }, 'reports.view')

    const params = request.nextUrl.searchParams
    const filters = expenseFilterSchema.safeParse({
      category: params.get('category') ?? undefined,
      vehicleId: params.get('vehicleId') ?? undefined,
      from: params.get('from') ?? undefined,
      to: params.get('to') ?? undefined,
    })
    if (!filters.success) throw new ValidationError(filters.error.issues[0]?.message ?? 'Bad filters')

    return jsonOk(await expenseService.listExpenses(tenantId, filters.data))
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, role } = await requireTenant()
    requireCan({ role }, 'expenses.record')
    const parsed = recordExpenseSchema.safeParse(await request.json())
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid expense')

    const expense = await expenseService.recordExpense(tenantId, parsed.data)
    return jsonOk(expense, 201)
  } catch (err) {
    return apiError(err)
  }
}
