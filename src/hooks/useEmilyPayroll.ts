import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

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
