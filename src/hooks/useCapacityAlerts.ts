import { useMemo } from 'react'
import { useCaseloadTrends } from './useAnalytics'

interface CapacityAlert {
  name: string
  pct: number
  level: 'warning' | 'danger'
}

export function useCapacityAlerts(): CapacityAlert[] {
  const { data: trends } = useCaseloadTrends()

  return useMemo(() => {
    if (!trends || trends.length < 2) return []
    const today = new Date()
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
    const complete = trends.filter(m => m.month < currentMonthStart)
    const last2 = complete.slice(-2)
    if (last2.length < 1) return []

    const avg = (vals: (number | null)[]): number | null => {
      const valid = vals.filter((v): v is number => v !== null)
      return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null
    }

    const alerts: CapacityAlert[] = []
    const checks: { name: string; getter: (m: typeof last2[0]) => number | null }[] = [
      { name: 'Shannon', getter: m => m.shannonUtilPct },
      { name: 'Jen',     getter: m => m.jenUtilPct     },
      { name: 'Emily',   getter: m => m.emilyUtilPct   },
      { name: 'Shana',   getter: m => m.shanaUtilPct   },
    ]
    // utilPct fields are decimal fractions (0.94 = 94%); compare against
    // fraction thresholds and convert to a 0-100 display value separately.
    for (const { name, getter } of checks) {
      const a = avg(last2.map(getter))
      if (a === null) continue
      if (a >= 1) alerts.push({ name, pct: a * 100, level: 'danger' })
      else if (a >= 0.95) alerts.push({ name, pct: a * 100, level: 'warning' })
    }
    return alerts
  }, [trends])
}
