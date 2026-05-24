import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'
import type { OverheadEntry } from '../types'

export function useOverhead() {
  return useQuery({
    queryKey: ['overhead'],
    queryFn: () => api.overhead.list(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useImportOverhead() {
  return useQuery({
    queryKey: ['overhead-import'],
    queryFn: () => api.overhead.importFromSheet(),
    enabled: false,
    retry: false,
  })
}

export function useSaveOverhead() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (data: OverheadEntry) => api.overhead.save(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['overhead'] })
      qc.invalidateQueries({ queryKey: ['analytics-quarterly'] })
      toast.success('Overhead saved')
    },
    onError: () => toast.error('Save failed — please try again'),
  })
}

export function useUpdateOverhead() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ month, data }: { month: string; data: Partial<OverheadEntry> }) =>
      api.overhead.update(month, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['overhead'] })
      qc.invalidateQueries({ queryKey: ['analytics-quarterly'] })
      toast.success('Overhead saved')
    },
    onError: () => toast.error('Save failed — please try again'),
  })
}
