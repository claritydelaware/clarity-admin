import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'
import type { CELogRecord, CELogInput } from '../types'

export function useCEStatus() {
  return useQuery({
    queryKey: ['ce-status'],
    queryFn: () => api.ceStatus.list(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCELog() {
  return useQuery({
    queryKey: ['ce-log'],
    queryFn: () => api.ceLog.list(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateCELog() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (data: CELogInput) => api.ceLog.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ce-log'] })
      qc.invalidateQueries({ queryKey: ['ce-status'] })
      toast.success('CE activity logged')
    },
    onError: () => toast.error('Save failed — please try again'),
  })
}

export function useUpdateCELog() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ rowIndex, data }: { rowIndex: number; data: Partial<CELogRecord> }) =>
      api.ceLog.update(rowIndex, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ce-log'] })
      qc.invalidateQueries({ queryKey: ['ce-status'] })
      toast.success('CE activity updated')
    },
    onError: () => toast.error('Save failed — please try again'),
  })
}
