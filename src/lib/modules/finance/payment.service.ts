import { fromDbError } from '@/lib/errors'
import * as financeRepository from './finance.repository'
import type { CreatePaymentInput } from './finance.validation'

export async function listPayments(tenantId: bigint) {
  return financeRepository.listPayments(tenantId)
}

export async function recordPayment(tenantId: bigint, input: CreatePaymentInput) {
  try {
    return await financeRepository.insertPayment({ ...input, tenantId })
  } catch (err) {
    throw fromDbError(err)
  }
}
