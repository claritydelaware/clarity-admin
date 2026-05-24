import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function usePayerPerformance() {
  return useQuery({
    queryKey: ['analytics-payer-performance'],
    queryFn: () => api.analytics.payerPerformance(),
    staleTime: 5 * 60 * 1000,
  })
}
