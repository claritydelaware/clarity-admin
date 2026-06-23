import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  hint,
  options,
  placeholder,
  className = '',
  id,
  ...props
}, ref) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className={className}>
      {label && (
        <label htmlFor={selectId} className="block text-xs font-medium font-ui text-muted mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className={[
            'w-full h-9 rounded-lg border bg-white pl-3 pr-8 text-sm font-body text-ink appearance-none',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-teal focus:border-teal',
            'disabled:opacity-50 disabled:bg-gray-50',
            error ? 'border-error' : 'border-border hover:border-border-strong',
          ].join(' ')}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
      </div>
      {error && <p className="mt-1 text-xs text-error font-ui">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-muted font-ui">{hint}</p>}
    </div>
  )
})

Select.displayName = 'Select'
export default Select
