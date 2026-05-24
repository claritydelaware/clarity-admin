import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

interface ToastContextValue {
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const t = timers.current.get(id)
    if (t) { clearTimeout(t); timers.current.delete(id) }
  }, [])

  const add = useCallback((message: string, type: Toast['type']) => {
    const id = ++nextId
    setToasts(prev => {
      const next = [...prev, { id, message, type }]
      return next.length > 3 ? next.slice(next.length - 3) : next
    })
    const timer = setTimeout(() => dismiss(id), 3000)
    timers.current.set(id, timer)
  }, [dismiss])

  const success = useCallback((msg: string) => add(msg, 'success'), [add])
  const error   = useCallback((msg: string) => add(msg, 'error'),   [add])

  return (
    <ToastContext.Provider value={{ success, error }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={[
            'flex items-start gap-3 bg-white rounded-lg shadow-lg border-l-4 px-4 py-3 pointer-events-auto',
            'animate-in slide-in-from-right-full duration-200',
            t.type === 'success' ? 'border-l-success' : 'border-l-error',
          ].join(' ')}
          role="alert"
        >
          <span className={`mt-0.5 shrink-0 ${t.type === 'success' ? 'text-success' : 'text-error'}`}>
            {t.type === 'success' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            )}
          </span>
          <span className="flex-1 text-sm font-body text-ink">{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            className="text-muted hover:text-ink transition-colors shrink-0"
            aria-label="Dismiss"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
