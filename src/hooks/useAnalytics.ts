import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useCaseloadTrends() {
  return useQuery({
    queryKey: ['analytics', 'caseload-trends'],
    queryFn: () => api.analytics.caseloadTrends(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useForecastAccuracy() {
  return useQuery({
    queryKey: ['analytics', 'forecast-accuracy'],
    queryFn: () => api.analytics.forecastAccuracy(),
    staleTime: 5 * 60 * 1000,
  })
}
