import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'

export function usePayPeriodList() {
  return useQuery({
    queryKey: ['pay-periods-full'],
    queryFn: () => api.payPeriodsFull.list(),
    staleTime: Infinity,
  })
}

export function usePartnerSummary(periodStart: string) {
  return useQuery({
    queryKey: ['pay-period-summary', 'salary', periodStart],
    queryFn: () => api.payPeriodsFull.summary('salary', periodStart),
    enabled: Boolean(periodStart),
    staleTime: 2 * 60 * 1000,
  })
}

export function useEmilySummary(periodStart: string) {
  return useQuery({
    queryKey: ['pay-period-summary', 'hourly', periodStart],
    queryFn: () => api.payPeriodsFull.summary('hourly', periodStart),
    enabled: Boolean(periodStart),
    staleTime: 2 * 60 * 1000,
  })
}

export function useSavePayrollRecord() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (data: Parameters<typeof api.payPeriodsFull.saveRecord>[0]) =>
      api.payPeriodsFull.saveRecord(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pay-period-summary'] })
      toast.success('Payroll record saved')
    },
    onError: () => toast.error('Save failed — please try again'),
  })
}
