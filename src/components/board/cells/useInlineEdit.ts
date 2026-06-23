import { useState, useCallback, useRef, useEffect } from 'react'

export function useInlineEdit(rawValue: string, onSave?: (value: string) => Promise<void>) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(rawValue)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const start = useCallback(() => {
    if (!onSave) return
    setValue(rawValue)
    setError(null)
    setEditing(true)
  }, [rawValue, onSave])

  const cancel = useCallback(() => {
    setEditing(false)
    setError(null)
  }, [])

  const commit = useCallback(async (newVal?: string) => {
    const v = newVal ?? value
    if (v === rawValue) { setEditing(false); return }
    setSaving(true)
    setEditing(false)
    try {
      await onSave!(v)
    } catch {
      setError('Save failed')
      setTimeout(() => setError(null), 3000)
    } finally {
      setSaving(false)
    }
  }, [value, rawValue, onSave])

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); commit() }
    if (e.key === 'Escape') { e.preventDefault(); cancel() }
  }, [commit, cancel])

  return { editing, value, setValue, saving, error, start, cancel, commit, onKeyDown, inputRef }
}
