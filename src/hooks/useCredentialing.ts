import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'
import type { CredentialingRecord, CredentialingInput } from '../types'

export function useCredentialing() {
  return useQuery({
    queryKey: ['credentialing'],
    queryFn: () => api.credentialing.list(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateCredentialing() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (data: CredentialingInput) => api.credentialing.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credentialing'] })
      toast.success('Credentialing record added')
    },
    onError: () => toast.error('Save failed — please try again'),
  })
}

export function useUpdateCredentialing() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ rowIndex, data }: { rowIndex: number; data: Partial<CredentialingRecord> }) =>
      api.credentialing.update(rowIndex, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credentialing'] })
      toast.success('Credentialing record updated')
    },
    onError: () => toast.error('Save failed — please try again'),
  })
}
