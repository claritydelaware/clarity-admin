// STAGED — not wired into the app. See README.md in this folder.
import { useQuery } from '@tanstack/react-query'

export interface QaAnomalyClaim {
  rowIndex: number
  claimId?: string
  clientId: string
  detail: string
}

export interface QaAnomalyRule {
  rule: string
  severity: 'error' | 'warning'
  claims: QaAnomalyClaim[]
}

async function fetchAnomalies(): Promise<QaAnomalyRule[]> {
  const res = await fetch('/api/qa/anomalies')
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
  return res.json() as Promise<QaAnomalyRule[]>
}

export function useDataQA() {
  return useQuery({
    queryKey: ['qa-anomalies'],
    queryFn: fetchAnomalies,
    staleTime: 5 * 60 * 1000,
  })
}
