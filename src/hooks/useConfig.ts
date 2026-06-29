import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'
import type { ConfigData } from '../types'

export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: () => api.config.get(),
    staleTime: 10 * 60 * 1000,
  })
}

export function useUpdateConfig() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (data: Partial<ConfigData>) => api.config.update(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config'] })
      qc.invalidateQueries({ queryKey: ['pay-period-summary'] })
      toast.success('Config saved')
    },
    onError: () => toast.error('Failed to save config'),
  })
}
