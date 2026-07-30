import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  maxWidth?: number
  disabled?: boolean
  variant?: 'dark' | 'card'
}

const VIEWPORT_MARGIN = 8

export default function Tooltip({ content, children, maxWidth = 280, disabled = false, variant = 'dark' }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [placement, setPlacement] = useState<{ top: number; left: number } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const bubbleRef = useRef<HTMLSpanElement>(null)

  const show = useCallback(() => {
    if (disabled) return
    timerRef.current = setTimeout(() => setVisible(true), 300)
  }, [disabled])

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
    setPlacement(null)
  }, [])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  // Measure the tooltip's actual rendered size before showing it, so it can be
  // clamped to the viewport (and flipped below the trigger if there's no room
  // above) instead of silently clipping off-screen.
  useLayoutEffect(() => {
    if (!visible || !triggerRef.current || !bubbleRef.current) return
    const triggerRect = triggerRef.current.getBoundingClientRect()
    const bubbleRect = bubbleRef.current.getBoundingClientRect()

    const fitsAbove = triggerRect.top - bubbleRect.height - VIEWPORT_MARGIN >= 0
    const top = fitsAbove
      ? triggerRect.top + window.scrollY - bubbleRect.height - 8
      : triggerRect.bottom + window.scrollY + 8

    let left = triggerRect.left + window.scrollX + triggerRect.width / 2 - bubbleRect.width / 2
    const minLeft = VIEWPORT_MARGIN
    const maxLeft = window.scrollX + window.innerWidth - bubbleRect.width - VIEWPORT_MARGIN
    left = Math.max(minLeft, Math.min(left, maxLeft))

    setPlacement({ top, left })
  }, [visible])

  return (
    <span
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && createPortal(
        <span
          ref={bubbleRef}
          className="fixed z-[9999] pointer-events-none"
          style={{
            top: placement?.top ?? -9999,
            left: placement?.left ?? -9999,
            visibility: placement ? 'visible' : 'hidden',
            maxWidth: variant === 'card' ? undefined : maxWidth,
          }}
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
