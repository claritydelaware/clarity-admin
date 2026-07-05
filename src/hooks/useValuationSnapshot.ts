import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useValuationSnapshot() {
  return useQuery({
    queryKey: ['valuation-snapshot'],
    queryFn: () => api.analytics.valuationSnapshot(),
    staleTime: 5 * 60 * 1000,
  })
}
