import { fromDbError } from '@/lib/errors'
import * as financeRepository from './finance.repository'
import type { CreateLedgerEntryInput } from './finance.validation'

// Every income/expense event in the system should flow through this function
// so ledger_entries stays the single source of truth for financial reports.
export async function postLedgerEntry(tenantId: bigint, input: CreateLedgerEntryInput) {
  try {
    return await financeRepository.insertLedgerEntry({ ...input, tenantId })
  } catch (err) {
    throw fromDbError(err)
  }
}

export async function listLedgerEntries(tenantId: bigint) {
  return financeRepository.listLedgerEntries(tenantId)
}
