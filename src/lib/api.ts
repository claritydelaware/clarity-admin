import type { Claim, NewClaimInput, ClaimUpdateInput, ClaimFullEditInput, PayPeriod, CaseloadEntry, DashboardData, CaseloadTrendMonth, ForecastAccuracyWeek } from '../types'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, init)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export interface ClaimsFilter {
  clinician?: string
  payer?: string
  status?: string
  serviceCode?: string
  from?: string   // YYYY-MM-DD
  to?: string     // YYYY-MM-DD
  search?: string // client-side only — not sent to API
}

export const api = {
  claims: {
    list(filter?: ClaimsFilter): Promise<Claim[]> {
      // Strip search — it is client-side only and must not be forwarded to the API
      const { search: _search, ...apiFilter } = filter ?? {}
      const params = new URLSearchParams(
        Object.entries(apiFilter).filter((e): e is [string, string] => Boolean(e[1]))
      )
      return apiFetch<Claim[]>(`/claims${params.size ? `?${params}` : ''}`)
    },
    get(rowIndex: number): Promise<Claim> {
      return apiFetch<Claim>(`/claims/${rowIndex}`)
    },
    create(data: NewClaimInput): Promise<Claim> {
      return apiFetch<Claim>('/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    },
    update(rowIndex: number, data: ClaimUpdateInput): Promise<Claim> {
      return apiFetch<Claim>(`/claims/${rowIndex}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    },
    fullEdit(rowIndex: number, data: ClaimFullEditInput): Promise<Claim> {
      return apiFetch<Claim>(`/claims/${rowIndex}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    },
    patch(rowIndex: number, data: Partial<ClaimUpdateInput & ClaimFullEditInput>): Promise<Claim> {
      return apiFetch<Claim>(`/claims/${rowIndex}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    },
    exportRaw(): Promise<string[][]> {
      return apiFetch<string[][]>('/export/claims')
    },
  },
  maintenance: {
    recalculateForecasts(): Promise<{ updated: number; total: number }> {
      return apiFetch('/maintenance/recalculate-forecasts', { method: 'POST' })
    },
  },
  dashboard: {
    get: (): Promise<DashboardData> => apiFetch<DashboardData>('/dashboard'),
  },
  payPeriods: {
    list: (): Promise<PayPeriod[]> => apiFetch<PayPeriod[]>('/pay-periods'),
  },
  caseloads: {
    list: (): Promise<CaseloadEntry[]> => apiFetch<CaseloadEntry[]>('/caseloads'),
  },
  analytics: {
    caseloadTrends: (): Promise<CaseloadTrendMonth[]> => apiFetch<CaseloadTrendMonth[]>('/analytics/caseload-trends'),
    forecastAccuracy: (): Promise<ForecastAccuracyWeek[]> => apiFetch<ForecastAccuracyWeek[]>('/analytics/forecast-accuracy'),
  },
}
