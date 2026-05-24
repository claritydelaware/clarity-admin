import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useDashboard(from?: string, to?: string) {
  return useQuery({
    queryKey: ['dashboard', from ?? '', to ?? ''],
    queryFn: () => api.dashboard.get(from, to),
    staleTime: 2 * 60 * 1000,
  })
}
