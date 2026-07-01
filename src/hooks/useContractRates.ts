import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { ContractRate } from '../types'

// Maps dropdown payer values → payer name as it appears in column A of the Insurance Rates sheet.
// BCBS-MA excluded per Bruce (different schedule). Self-Pay/Late Cancellation excluded (no insurance portion).
export const PAYER_RATE_GROUP: Record<string, string> = {
  'BCBS':           'BCBS',
  'Aetna':          'Aetna',
  'Meritain':       'Aetna',
  'United':         'United',
  'United-MA':      'United-MA',
  'United-Surest':  'United',
  'UMR':            'United',
  'Medicare':       'Medicare',
  'Health Options': 'HHO',
}

export function useContractRates() {
  return useQuery<ContractRate[]>({
    queryKey: ['contract-rates'],
    queryFn: () => api.contractRates.list(),
    staleTime: 1000 * 60 * 60,  // 1 hour — rates change rarely
    gcTime:    1000 * 60 * 60 * 24,
  })
}

