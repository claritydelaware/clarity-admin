import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:   'bg-teal text-white hover:bg-teal-mid active:bg-teal focus-visible:ring-teal',
  secondary: 'bg-white text-teal border border-border hover:bg-surface-sunken active:bg-gray-100 focus-visible:ring-teal',
  ghost:     'bg-transparent text-muted hover:bg-surface-sunken hover:text-ink active:bg-gray-100 focus-visible:ring-teal',
  danger:    'bg-error text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-error',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-md',
  md: 'h-9 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-sm gap-2 rounded-lg',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center font-ui font-medium whitespace-nowrap',
        'transition-colors duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        'disabled:opacity-50 disabled:pointer-events-none',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      ].join(' ')}
      {...props}
    >
      {loading ? <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" /> : icon}
      {children}
    </button>
  )
})

Button.displayName = 'Button'
export default Button
