import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'
import type { PayrollEntry } from '../types'

export function usePayroll() {
  return useQuery({
    queryKey: ['payroll'],
    queryFn: () => api.payroll.list(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useSavePayroll() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (data: PayrollEntry) => api.payroll.save(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll'] })
      qc.invalidateQueries({ queryKey: ['caseload-trends'] })
      toast.success('Payroll saved')
    },
    onError: () => toast.error('Save failed — please try again'),
  })
}
