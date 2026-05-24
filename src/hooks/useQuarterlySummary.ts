import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useQuarterlySummary() {
  return useQuery({
    queryKey: ['analytics-quarterly'],
    queryFn: () => api.analytics.quarterlySummary(),
    staleTime: 5 * 60 * 1000,
  })
}
