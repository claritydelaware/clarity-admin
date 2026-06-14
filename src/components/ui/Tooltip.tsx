import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  maxWidth?: number
  disabled?: boolean
  variant?: 'dark' | 'card'
}

export default function Tooltip({ content, children, maxWidth = 280, disabled = false, variant = 'dark' }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)

  const show = useCallback(() => {
    if (disabled) return
    timerRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        setCoords({
          top: rect.top + window.scrollY - 8,
          left: rect.left + window.scrollX + rect.width / 2,
        })
      }
      setVisible(true)
    }, 300)
  }, [disabled])

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
  }, [])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return (
    <span
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && coords && createPortal(
        <span
          className="fixed z-[9999] pointer-events-none -translate-x-1/2 -translate-y-full"
          style={{ top: coords.top, left: coords.left, maxWidth: variant === 'card' ? undefined : maxWidth }}
        >
          {variant === 'card' ? (
            <div
              className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden mb-1.5"
              style={{ minWidth: 240, maxWidth }}
            >
              {content}
            </div>
          ) : (
            <span className="block bg-ink text-white text-xs rounded-md px-2 py-1.5 shadow-lg whitespace-pre-wrap wrap-break-word leading-snug mb-1.5">
              {content}
            </span>
          )}
        </span>,
        document.body
      )}
    </span>
  )
}
