import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Clinician } from '../types'

export function useEmilySubmission(periodStart: string) {
  return useQuery({
    queryKey: ['emily-submission', periodStart],
    queryFn: () => api.emily.submission(periodStart),
    enabled: Boolean(periodStart),
    staleTime: 5 * 60 * 1000,
  })
}

export function useEmilyPaymentAnalysis() {
  return useQuery({
    queryKey: ['emily-payment-analysis'],
    queryFn: () => api.emily.paymentAnalysis(),
    staleTime: 10 * 60 * 1000,
  })
}

export function useHourlySubmission(clinician: Clinician, periodStart: string) {
  return useQuery({
    queryKey: ['hourly-submission', clinician, periodStart],
    queryFn: () => api.hourly.submission(clinician, periodStart),
    enabled: Boolean(periodStart),
    staleTime: 5 * 60 * 1000,
  })
}

export function useHourlyPaymentAnalysis(clinician: Clinician) {
  return useQuery({
    queryKey: ['hourly-payment-analysis', clinician],
    queryFn: () => api.hourly.paymentAnalysis(clinician),
    staleTime: 10 * 60 * 1000,
  })
}
