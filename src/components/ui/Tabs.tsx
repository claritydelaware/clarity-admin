import { useRef, useLayoutEffect, useState } from 'react'

interface Tab {
  value: string
  label: string
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  value: string
  onChange: (value: string) => void
  size?: 'sm' | 'md'
  className?: string
}

export default function Tabs({ tabs, value, onChange, size = 'md', className = '' }: TabsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  useLayoutEffect(() => {
    if (!containerRef.current) return
    const active = containerRef.current.querySelector<HTMLElement>('[data-tab-active="true"]')
    if (active) {
      setIndicator({
        left: active.offsetLeft,
        width: active.offsetWidth,
      })
    }
  }, [value])

  const sizeCls = size === 'sm' ? 'text-xs h-8 px-3' : 'text-sm h-9 px-4'

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center bg-surface-sunken rounded-lg p-1 ${className}`}
      role="tablist"
    >
      <div
        className="absolute top-1 h-[calc(100%-8px)] bg-white rounded-md shadow-xs transition-all duration-200 ease-out"
        style={{ left: indicator.left, width: indicator.width }}
      />
      {tabs.map(tab => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          data-tab-active={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={[
            'relative z-10 inline-flex items-center gap-1.5 font-ui font-medium rounded-md whitespace-nowrap',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal',
            sizeCls,
            value === tab.value ? 'text-ink' : 'text-muted hover:text-ink',
          ].join(' ')}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={[
              'text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
              value === tab.value ? 'bg-teal-pale text-teal' : 'bg-gray-200 text-muted',
            ].join(' ')}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
