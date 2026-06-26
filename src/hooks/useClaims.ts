import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type ClaimsFilter } from '../lib/api'
import { useToast } from '../context/ToastContext'
import type { ClaimUpdateInput, ClaimFullEditInput, NewClaimInput, ClaimStatus } from '../types'

export type InlineEditField =
  | 'claimId'
  | 'notes'
  | 'insuranceAmount'
  | 'clientAmount'
  | 'serviceCode'
  | 'submissionMethod'
  | 'paymentDateReceived'
  | 'insurancePaidHHO'

export function useClaims(filter?: ClaimsFilter) {
  return useQuery({
    queryKey: ['claims', filter],
    queryFn: () => api.claims.list(filter),
  })
}

export function useCreateClaim() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (data: NewClaimInput) => api.claims.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['claims'] })
      toast.success('Claim created')
    },
    onError: () => toast.error('Save failed — please try again'),
  })
}

export function useUpdateClaim() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ rowIndex, data }: { rowIndex: number; data: ClaimUpdateInput }) =>
      api.claims.update(rowIndex, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['claims'] })
      toast.success('Status updated')
    },
    onError: () => toast.error('Save failed — please try again'),
  })
}

export function useClaim(rowIndex: number) {
  return useQuery({
    queryKey: ['claims', rowIndex],
    queryFn: () => api.claims.get(rowIndex),
    enabled: rowIndex > 0,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  })
}

export function useFullEditClaim() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ rowIndex, data }: { rowIndex: number; data: ClaimFullEditInput }) =>
      api.claims.fullEdit(rowIndex, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['claims'] })
      qc.setQueryData(['claims', updated.rowIndex], updated)
      toast.success('Claim saved')
    },
    onError: () => toast.error('Save failed — please try again'),
  })
}

export function useDeleteClaim() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (rowIndex: number) => api.claims.delete(rowIndex),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['claims'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Claim deleted')
    },
    onError: () => toast.error('Delete failed — please try again'),
  })
}

export function useInlineEditClaim() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ rowIndex, field, value }: { rowIndex: number; field: InlineEditField; value: string | number }) =>
      api.claims.patch(rowIndex, { [field]: value }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['claims'] })
      toast.success('Saved')
    },
    onError: () => toast.error('Save failed — please try again'),
  })
}

export function useBulkUpdateClaims() {
  const qc = useQueryClient()
  const toast = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const execute = useCallback(async (
    rowIndices: number[],
    update: { status: ClaimStatus; paymentDateReceived?: string },
  ): Promise<boolean> => {
    setIsSubmitting(true)
    try {
      await Promise.all(rowIndices.map(rowIndex => api.claims.patch(rowIndex, update)))
      qc.invalidateQueries({ queryKey: ['claims'] })
      toast.success(`Updated ${rowIndices.length} claim${rowIndices.length !== 1 ? 's' : ''} successfully`)
      return true
    } catch {
      toast.error('Some updates failed — please refresh and check')
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [qc, toast])

  return { execute, isSubmitting }
}

export function usePayPeriods() {
  return useQuery({
    queryKey: ['pay-periods'],
    queryFn: () => api.payPeriods.list(),
    staleTime: Infinity,
  })
}

export function useCaseloads() {
  return useQuery({
    queryKey: ['caseloads'],
    queryFn: () => api.caseloads.list(),
    staleTime: Infinity,
  })
}

export function useCaseloadAnalysis() {
  return useQuery({
    queryKey: ['caseloads-analysis'],
    queryFn: () => api.caseloads.analysis(),
  })
}

export function useCreateCaseload() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (data: { clientId: string; clinician: string }) => api.caseloads.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caseloads'] })
      toast.success('Client added to caseload')
    },
    onError: () => toast.error('Save failed — please try again'),
  })
}
