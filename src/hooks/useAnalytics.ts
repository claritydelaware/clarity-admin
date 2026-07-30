import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { TrendGranularity, Clinician } from '../types'

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

export function useTrend(granularity: TrendGranularity, from?: string, to?: string, clinician?: Clinician) {
  return useQuery({
    queryKey: ['analytics', 'trend', granularity, from ?? '', to ?? '', clinician ?? ''],
    queryFn: () => api.analytics.trend(granularity, from, to, clinician),
    staleTime: 2 * 60 * 1000,
  })
}
