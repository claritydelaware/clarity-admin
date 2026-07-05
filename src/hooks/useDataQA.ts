import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useDataQA() {
  return useQuery({
    queryKey: ['qa-anomalies'],
    queryFn: () => api.qa.anomalies(),
    staleTime: 5 * 60 * 1000,
  })
}
