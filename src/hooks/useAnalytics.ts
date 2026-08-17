import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { TrendGranularity } from '../types'

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

export function useCapacityRecentWeeks() {
  return useQuery({
    queryKey: ['analytics', 'capacity-recent-weeks'],
    queryFn: () => api.analytics.capacityRecentWeeks(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useTrend(granularity: TrendGranularity, from?: string, to?: string) {
  return useQuery({
    queryKey: ['analytics', 'trend', granularity, from ?? '', to ?? ''],
    queryFn: () => api.analytics.trend(granularity, from, to),
    staleTime: 2 * 60 * 1000,
  })
}

export function useHourlyPerformance() {
  return useQuery({
    queryKey: ['analytics', 'hourly-performance'],
    queryFn: () => api.analytics.hourlyPerformance(),
    staleTime: 5 * 60 * 1000,
  })
}
