import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'
import type { HhoEraLogInput } from '../types'

export function useHhoEraLog() {
  return useQuery({
    queryKey: ['hho-era-log'],
    queryFn: () => api.hhoEraLog.list(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateHhoEraLogEntry() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (data: HhoEraLogInput) => api.hhoEraLog.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hho-era-log'] })
      toast.success('ERA logged')
    },
    onError: () => toast.error('Save failed — please try again'),
  })
}
