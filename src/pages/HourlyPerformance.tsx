import { useHourlyPerformance, useCaseloadTrends } from '../hooks/useAnalytics'
import PageHeader from '../components/layout/PageHeader'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorBanner from '../components/ui/ErrorBanner'
import EmptyState from '../components/ui/EmptyState'
import HourlySummaryCards from '../components/hourly/HourlySummaryCards'
import HourlyMarginTrendChart from '../components/hourly/HourlyMarginTrendChart'
import HourlyRevenueVsProfitChart from '../components/hourly/HourlyRevenueVsProfitChart'
import HourlyRevenueContribution from '../components/hourly/HourlyRevenueContribution'
import HourlyCostBreakdown from '../components/hourly/HourlyCostBreakdown'
import HourlyHistoryTable from '../components/hourly/HourlyHistoryTable'

export default function HourlyPerformance() {
  const { data: history, isLoading, isError, error } = useHourlyPerformance()
  const { data: months } = useCaseloadTrends()

  if (isLoading) return <LoadingSpinner size={20} label="Loading hourly performance…" />
  if (isError) return <ErrorBanner message={(error as Error).message} />

  const hasData = !!history && (history.Emily.length > 0 || history.Shana.length > 0)
  if (!hasData) {
    return (
      <EmptyState
        title="No completed pay periods yet"
        description="History appears here once at least one hourly pay period has fully closed."
      />
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Hourly Performance"
        subtitle="Historical margin, revenue contribution, and cost structure for Emily and Shana"
      />
      <HourlySummaryCards history={history} />
      <HourlyMarginTrendChart history={history} />
      <HourlyRevenueVsProfitChart history={history} />
      <HourlyRevenueContribution months={months ?? []} />
      <HourlyCostBreakdown history={history} />
      <HourlyHistoryTable history={history} />
    </div>
  )
}
