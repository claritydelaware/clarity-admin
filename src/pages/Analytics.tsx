import { useMemo } from 'react'
import { useCaseloadTrends } from '../hooks/useAnalytics'
import PageHeader from '../components/layout/PageHeader'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorBanner from '../components/ui/ErrorBanner'
import EmptyState from '../components/ui/EmptyState'
import FinancialSection from '../components/analytics/FinancialSection'
import ProductivitySection from '../components/analytics/ProductivitySection'
import CollectionSection from '../components/analytics/CollectionSection'
import QuarterProjectionCard from '../components/analytics/QuarterProjectionCard'
import PayerPerformanceSection from '../components/analytics/PayerPerformanceSection'

export default function Analytics() {
  const { data: rawMonths, isLoading, isError, error } = useCaseloadTrends()

  const months = useMemo(() => {
    if (!rawMonths) return []
    return rawMonths.filter(m => m.month)
  }, [rawMonths])

  if (isLoading) return <LoadingSpinner size={20} label="Loading analytics…" />

  if (isError) return <ErrorBanner message={(error as Error).message} />

  if (months.length === 0) {
    return <EmptyState title="No analytics data available" />
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Analytics" />
      <FinancialSection months={months} />
      <ProductivitySection months={months} />
      <CollectionSection months={months} />
      <QuarterProjectionCard />
      <PayerPerformanceSection />
    </div>
  )
}
