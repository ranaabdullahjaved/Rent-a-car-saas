import { NotFoundError, fromDbError } from '@/lib/errors'
import * as investorRepository from './investor.repository'
import type { CreateInvestorInput, UpdateInvestorInput } from './investor.validation'

export async function listInvestors(tenantId: bigint) {
  return investorRepository.listInvestors(tenantId)
}

export async function getInvestor(tenantId: bigint, id: bigint) {
  const investor = await investorRepository.findInvestorById(tenantId, id)
  if (!investor) throw new NotFoundError('Investor')
  return investor
}

export async function createInvestor(tenantId: bigint, input: CreateInvestorInput) {
  try {
    return await investorRepository.createInvestor({ ...input, tenantId })
  } catch (err) {
    throw fromDbError(err)
  }
}

export async function updateInvestor(tenantId: bigint, id: bigint, input: UpdateInvestorInput) {
  await getInvestor(tenantId, id)
  try {
    return await investorRepository.updateInvestor(tenantId, id, input)
  } catch (err) {
    throw fromDbError(err)
  }
}
