import { NotFoundError, fromDbError } from '@/lib/errors'
import * as customerRepository from './customer.repository'
import type { CreateCustomerInput, UpdateCustomerInput } from './customer.validation'

export async function listCustomers(tenantId: bigint) {
  return customerRepository.listCustomers(tenantId)
}

export async function getCustomer(tenantId: bigint, id: bigint) {
  const customer = await customerRepository.findCustomerById(tenantId, id)
  if (!customer) throw new NotFoundError('Customer')
  return customer
}

export async function createCustomer(tenantId: bigint, input: CreateCustomerInput) {
  try {
    return await customerRepository.createCustomer({ ...input, tenantId })
  } catch (err) {
    throw fromDbError(err)
  }
}

export async function updateCustomer(tenantId: bigint, id: bigint, input: UpdateCustomerInput) {
  await getCustomer(tenantId, id)
  try {
    return await customerRepository.updateCustomer(tenantId, id, input)
  } catch (err) {
    throw fromDbError(err)
  }
}
