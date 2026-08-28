import { and, desc, eq, gte, isNull, lte, sql, type SQL } from 'drizzle-orm'
import { db } from '@/db/client'
import { employees, expenses, ledgerEntries, vehicles, vendors } from '@/db/schema'
import { AppError, NotFoundError, fromDbError } from '@/lib/errors'
import { money } from '@/lib/money'
import { postLedgerEntry, reverseLedgerEntry } from './ledger.service'
import type { LedgerCategory } from './ledger.categories'
import type { ExpenseFilters, RecordExpenseInput } from './expense.validation'

function scope(tenantId: bigint): SQL {
  return and(eq(expenses.tenantId, tenantId), isNull(expenses.deletedAt))!
}

/**
 * Records money going out, and its ledger entry, in one transaction.
 *
 * Same rule as payments: an expense that exists without its ledger row makes
 * every profit figure too high, and nothing downstream would reveal it.
 */
export async function recordExpense(tenantId: bigint, input: RecordExpenseInput) {
  const amount = money(input.amount)

  try {
    return await db.transaction(async (tx) => {
      const [expense] = await tx
        .insert(expenses)
        .values({
          tenantId,
          category: input.category,
          amount,
          expenseDate: input.expenseDate,
          paymentMethod: input.paymentMethod,
          paidTo: input.paidTo,
          description: input.description,
          vehicleId: input.vehicleId,
          employeeId: input.employeeId,
          vendorId: input.vendorId,
          isRecurring: input.isRecurring,
        })
        .returning()

      if (!expense) throw new AppError('Could not record the expense', 'EXPENSE_FAILED', 500)

      await postLedgerEntry(tx, tenantId, {
        entryDate: input.expenseDate,
        category: input.category as LedgerCategory,
        subcategory: input.paymentMethod,
        amount,
        sourceType: input.category === 'salary' ? 'salary' : 'expense',
        sourceId: expense.id,
        description: input.description ?? input.paidTo,
        vehicleId: input.vehicleId,
        employeeId: input.employeeId,
        vendorId: input.vendorId,
      })

      return expense
    })
  } catch (err) {
    if (err instanceof AppError) throw err
    throw fromDbError(err)
  }
}

/**
 * Voids an expense by soft-deleting it and writing a reversing ledger row.
 * The original stays visible; the ledger nets to zero.
 */
export async function voidExpense(tenantId: bigint, id: bigint, reason: string) {
  const existing = await getExpense(tenantId, id)

  return db.transaction(async (tx) => {
    await tx
      .update(expenses)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(expenses.tenantId, tenantId), eq(expenses.id, id)))

    // Find the entry this expense produced so it can be reversed rather than
    // deleted — the ledger is insert-only.
    const [original] = await tx
      .select()
      .from(ledgerEntries)
      .where(
        and(
          eq(ledgerEntries.tenantId, tenantId),
          eq(ledgerEntries.sourceId, id),
          sql`${ledgerEntries.sourceType} in ('expense','salary')`,
          eq(ledgerEntries.isReversal, false)
        )
      )
      .limit(1)

    if (original) {
      await reverseLedgerEntry(tx, tenantId, original, reason)
    }

    return existing
  })
}

export async function getExpense(tenantId: bigint, id: bigint) {
  const [row] = await db.select().from(expenses).where(and(scope(tenantId), eq(expenses.id, id))).limit(1)
  if (!row) throw new NotFoundError('Expense')
  return row
}

// Partial, because the schema's transform makes vehicleId always present once
// parsed, but callers listing everything pass nothing at all.
export async function listExpenses(tenantId: bigint, filters: Partial<ExpenseFilters> = {}) {
  const conditions: SQL[] = [scope(tenantId)]
  if (filters.category) conditions.push(eq(expenses.category, filters.category))
  if (filters.vehicleId) conditions.push(eq(expenses.vehicleId, filters.vehicleId))
  if (filters.from) conditions.push(gte(expenses.expenseDate, filters.from))
  if (filters.to) conditions.push(lte(expenses.expenseDate, filters.to))

  return db
    .select({
      id: expenses.id,
      category: expenses.category,
      amount: expenses.amount,
      expenseDate: expenses.expenseDate,
      paymentMethod: expenses.paymentMethod,
      paidTo: expenses.paidTo,
      description: expenses.description,
      vehicleId: expenses.vehicleId,
      vehicleRegistration: vehicles.registrationNo,
      employeeName: employees.name,
      vendorName: vendors.name,
    })
    .from(expenses)
    .leftJoin(vehicles, eq(vehicles.id, expenses.vehicleId))
    .leftJoin(employees, eq(employees.id, expenses.employeeId))
    .leftJoin(vendors, eq(vendors.id, expenses.vendorId))
    .where(and(...conditions))
    .orderBy(desc(expenses.expenseDate), desc(expenses.id))
    .limit(200)
}

/** Options for the pickers on the expense form. */
export async function getExpenseFormOptions(tenantId: bigint) {
  const [vehicleRows, employeeRows, vendorRows] = await Promise.all([
    db
      .select({ id: vehicles.id, registrationNo: vehicles.registrationNo, make: vehicles.make, model: vehicles.model })
      .from(vehicles)
      .where(and(eq(vehicles.tenantId, tenantId), isNull(vehicles.deletedAt)))
      .orderBy(vehicles.registrationNo),
    db
      .select({ id: employees.id, name: employees.name, designation: employees.designation })
      .from(employees)
      .where(and(eq(employees.tenantId, tenantId), isNull(employees.deletedAt), eq(employees.isActive, true)))
      .orderBy(employees.name),
    db
      .select({ id: vendors.id, name: vendors.name })
      .from(vendors)
      .where(and(eq(vendors.tenantId, tenantId), isNull(vendors.deletedAt)))
      .orderBy(vendors.name),
  ])
  return { vehicles: vehicleRows, employees: employeeRows, vendors: vendorRows }
}
