import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'
import type { StaffMember, StaffLicense } from '../types'

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

export function useStaffLicenses(staffId: string) {
  return useQuery({
    queryKey: ['staff-licenses', staffId],
    queryFn: () => api.staff.licenses.list(staffId),
    enabled: Boolean(staffId),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateLicense(staffId: string) {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (data: Omit<StaffLicense, 'id' | 'staffId'>) =>
      api.staff.licenses.create(staffId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-licenses', staffId] })
      toast.success('License added')
    },
    onError: () => toast.error('Failed to add license'),
  })
}

export function useUpdateLicense(staffId: string) {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ licenseId, data }: { licenseId: string; data: Partial<StaffLicense> }) =>
      api.staff.licenses.update(staffId, licenseId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-licenses', staffId] })
      toast.success('License updated')
    },
    onError: () => toast.error('Failed to update license'),
  })
}

export function useDeleteLicense(staffId: string) {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (licenseId: string) =>
      api.staff.licenses.remove(staffId, licenseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-licenses', staffId] })
      toast.success('License removed')
    },
    onError: () => toast.error('Failed to remove license'),
  })
}
