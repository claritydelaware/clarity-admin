import { useState, useRef, useCallback } from 'react'

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  maxWidth?: number
  disabled?: boolean
  variant?: 'dark' | 'card'
}

export default function Tooltip({ content, children, maxWidth = 280, disabled = false, variant = 'dark' }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback(() => {
    if (disabled) return
    timerRef.current = setTimeout(() => setVisible(true), 300)
  }, [disabled])

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
  }, [])

  return (
    <span
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && (
        <span
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none"
          style={{ maxWidth: variant === 'card' ? undefined : maxWidth }}
        >
          {variant === 'card' ? (
            <div
              className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
              style={{ minWidth: 240, maxWidth }}
            >
              {content}
            </div>
          ) : (
            <span className="block bg-ink text-white text-xs rounded-md px-2 py-1.5 shadow-lg whitespace-pre-wrap wrap-break-word leading-snug">
              {content}
            </span>
          )}
        </span>
      )}
    </span>
  )
}
