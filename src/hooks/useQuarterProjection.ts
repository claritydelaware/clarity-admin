import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useQuarterProjection() {
  return useQuery({
    queryKey: ['quarter-projection'],
    queryFn: () => api.analytics.quarterProjection(),
    staleTime: 5 * 60 * 1000,
  })
}
