import { useState, useRef, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface DropdownProps {
  trigger: ReactNode
  children: ReactNode
  align?: 'left' | 'right'
  className?: string
}

export default function Dropdown({ trigger, children, align = 'left', className = '' }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function toggle() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setCoords({
        top: rect.bottom + 4,
        left: align === 'right' ? rect.right : rect.left,
        width: rect.width,
      })
    }
    setOpen(v => !v)
  }

  return (
    <div ref={triggerRef} className="relative inline-block">
      <div
        onClick={toggle}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() } }}
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-expanded={open}
        className="cursor-pointer"
      >
        {trigger}
      </div>
      {open && coords && createPortal(
        <div
          role="menu"
          className={[
            'fixed z-60 bg-white rounded-lg border border-border shadow-lg py-1 animate-slide-down',
            className,
          ].join(' ')}
          style={{
            top: coords.top,
            ...(align === 'right'
              ? { right: window.innerWidth - coords.left }
              : { left: coords.left }),
            minWidth: Math.max(coords.width, 160),
          }}
        >
          {children}
        </div>,
        document.body
      )}
    </div>
  )
}

interface DropdownItemProps {
  children: ReactNode
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
}

export function DropdownItem({ children, onClick, danger, disabled }: DropdownItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={[
        'w-full text-left px-3 py-1.5 text-sm font-ui transition-colors',
        'focus-visible:outline-none focus-visible:bg-surface-sunken',
        disabled ? 'opacity-40 pointer-events-none' : '',
        danger
          ? 'text-error hover:bg-red-50'
          : 'text-ink hover:bg-surface-sunken',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
