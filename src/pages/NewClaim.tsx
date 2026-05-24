import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function NewClaim() {
  return (
    <div>
      <Link
        to="/claims"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-teal font-body mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Claims
      </Link>
      <p className="text-sm text-muted font-body">New Claim form — coming in Phase 1C.</p>
    </div>
  )
}
