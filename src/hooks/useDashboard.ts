import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useDashboard(from?: string, to?: string, window?: string) {
  return useQuery({
    queryKey: ['dashboard', from ?? '', to ?? '', window ?? ''],
    queryFn: () => api.dashboard.get(from, to, window),
    staleTime: 2 * 60 * 1000,
  })
}
