import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  iconLeft?: ReactNode
  iconRight?: ReactNode
  inputClassName?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  iconLeft,
  iconRight,
  className = '',
  inputClassName = '',
  id,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium font-ui text-muted mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {iconLeft && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            {iconLeft}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'w-full h-9 rounded-lg border bg-white px-3 text-sm font-body text-ink',
            'placeholder:text-muted/50',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-teal focus:border-teal',
            'disabled:opacity-50 disabled:bg-gray-50',
            error ? 'border-error' : 'border-border hover:border-border-strong',
            iconLeft ? 'pl-9' : '',
            iconRight ? 'pr-9' : '',
            inputClassName,
          ].join(' ')}
          {...props}
        />
        {iconRight && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            {iconRight}
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-error font-ui">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-muted font-ui">{hint}</p>}
    </div>
  )
})

Input.displayName = 'Input'
export default Input
