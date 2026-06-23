import { AlertTriangle } from 'lucide-react'
import Button from './Button'

interface ErrorBannerProps {
  message: string
  onRetry?: () => void
  className?: string
}

export default function ErrorBanner({ message, onRetry, className = '' }: ErrorBannerProps) {
  return (
    <div className={`flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl ${className}`}>
      <AlertTriangle size={18} className="text-error shrink-0" />
      <p className="text-sm text-red-700 font-body flex-1">{message}</p>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  )
}
