import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'
import type { SpEntryLine, SpEntryImportRow } from '../types'

const KEY = ['sp-entry']

export function useSpEntry() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api.spEntry.list(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useImportSpEntry() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ rows, replace, keepDone }: { rows: SpEntryImportRow[]; replace: boolean; keepDone: boolean }) => api.spEntry.import(rows, replace, keepDone),
    onSuccess: res => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success(`Imported ${res.imported} lines${res.preservedDone ? ` (${res.preservedDone} done flags kept)` : ''}`)
    },
    onError: err => toast.error((err as Error).message.includes('409') ? 'SP Entry already has data' : 'Import failed — please try again'),
  })
}

// Ticking a line must feel instant (hundreds of lines get worked through in a row), so the cache is
// updated optimistically and rolled back if the Sheet write fails.
export function useSetSpEntryDone() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ rowIndexes, done }: { rowIndexes: number[]; done: boolean }) => api.spEntry.setDone(rowIndexes, done),
    onMutate: async ({ rowIndexes, done }) => {
      await qc.cancelQueries({ queryKey: KEY })
      const prev = qc.getQueryData<SpEntryLine[]>(KEY)
      const set = new Set(rowIndexes)
      const now = new Date().toISOString()
      qc.setQueryData<SpEntryLine[]>(KEY, old =>
        (old ?? []).map(l => (set.has(l.rowIndex) ? { ...l, done, doneAt: done ? now : undefined } : l)))
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEY, ctx.prev)
      toast.error('Could not save — that change was undone')
    },
  })
}

// Check/EFT # applies to every line of an ERA.
export function useSetSpEntryEft() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ era, checkEft, checkDate }: { era: string; checkEft: string; checkDate: string }) => api.spEntry.setEft(era, checkEft, checkDate),
    onSuccess: (_r, v) => {
      qc.setQueryData<SpEntryLine[]>(KEY, old =>
        (old ?? []).map(l => (l.era === v.era ? { ...l, checkEft: v.checkEft || undefined, checkDate: v.checkEft ? v.checkDate || undefined : undefined } : l)))
      toast.success('Check/EFT # saved')
    },
    onError: err => toast.error((err as Error).message.includes('400') ? 'Check/EFT # must be 6-12 digits' : 'Save failed — please try again'),
  })
}
