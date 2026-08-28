import { AppError, NotFoundError, fromDbError } from '@/lib/errors'
import * as customerRepository from './customer.repository'
import { formatCnic, type CreateCustomerInput, type CustomerFilters, type UpdateCustomerInput } from './customer.validation'

export async function listCustomers(tenantId: bigint, filters: CustomerFilters) {
  return customerRepository.listCustomers(tenantId, filters)
}

export async function getCustomerSummary(tenantId: bigint) {
  const rows = await customerRepository.countByRisk(tenantId)
  const byRisk = Object.fromEntries(rows.map((r) => [r.riskRating, r.count]))
  const total = rows.reduce((sum, r) => sum + r.count, 0)
  return { total, byRisk }
}

export async function getCustomer(tenantId: bigint, id: bigint) {
  const row = await customerRepository.findCustomerById(tenantId, id)
  if (!row) throw new NotFoundError('Customer')
  return row
}

export async function findPossibleDuplicates(
  tenantId: bigint,
  input: { cnic: string | null; phone: string },
  excludeId?: bigint
) {
  return customerRepository.findPossibleDuplicates(tenantId, input, excludeId)
}

function rethrowDuplicate(err: unknown, cnic: string | null): never {
  const mapped = fromDbError(err)
  if (mapped.code === 'DUPLICATE') {
    throw new AppError(
      `A customer with CNIC ${formatCnic(cnic)} already exists. Open that record instead of creating a second one.`,
      'DUPLICATE_CNIC',
      409
    )
  }
  throw mapped
}

export async function createCustomer(tenantId: bigint, input: CreateCustomerInput) {
  try {
    return await customerRepository.createCustomer({ ...input, tenantId })
  } catch (err) {
    rethrowDuplicate(err, input.cnic)
  }
}

export async function updateCustomer(tenantId: bigint, id: bigint, input: UpdateCustomerInput) {
  await getCustomer(tenantId, id)
  try {
    return await customerRepository.updateCustomer(tenantId, id, input)
  } catch (err) {
    rethrowDuplicate(err, input.cnic)
  }
}
