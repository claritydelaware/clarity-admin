import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'
import type { StaffMember } from '../types'

export function useStaff() {
  return useQuery({
    queryKey: ['staff'],
    queryFn: () => api.staff.list(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useStaffMember(id: string) {
  return useQuery({
    queryKey: ['staff', id],
    queryFn: () => api.staff.get(id),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateStaff() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (data: StaffMember) => api.staff.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] })
      toast.success('Staff record saved')
    },
    onError: () => toast.error('Save failed — please try again'),
  })
}

export function useUpdateStaff() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StaffMember> }) =>
      api.staff.update(id, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['staff'] })
      qc.setQueryData(['staff', updated.id], updated)
      toast.success('Staff record saved')
    },
    onError: () => toast.error('Save failed — please try again'),
  })
}
