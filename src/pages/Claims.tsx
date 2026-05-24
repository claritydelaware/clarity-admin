import { Link } from 'react-router-dom'

export default function Claims() {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted font-body">Claims module — coming in Phase 1C.</p>
      <Link
        to="/claims/new"
        className="px-4 py-2 bg-teal text-white text-sm font-body rounded hover:bg-teal-mid transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
      >
        New Claim
      </Link>
    </div>
  )
}
