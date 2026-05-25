import type {
  Claim, NewClaimInput, ClaimUpdateInput, ClaimFullEditInput, PayPeriod, CaseloadEntry,
  DashboardData, CaseloadTrendMonth, ForecastAccuracyWeek,
  StaffMember, OverheadEntry, QuarterlySummary, PayerPerformance,
  PartnerPeriodSummary, EmilyPayPeriodSummary, SalaryPayPeriod, HourlyPayPeriod,
} from '../types'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, init)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export async function apiFetchWithParams<T>(path: string, params: URLSearchParams): Promise<T> {
  const qs = params.toString()
  return apiFetch<T>(qs ? `${path}?${qs}` : path)
}

export interface ClaimsFilter {
  clinician?: string
  payer?: string
  status?: string  // client-side only — not sent to API
  serviceCode?: string
  from?: string   // YYYY-MM-DD
  to?: string     // YYYY-MM-DD
  search?: string // client-side only — not sent to API
}

export const api = {
  claims: {
    list(filter?: ClaimsFilter): Promise<Claim[]> {
      // Strip search and status — both are client-side only and must not be forwarded to the API
      const { search: _search, status: _status, ...apiFilter } = filter ?? {}
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
    get: (from?: string, to?: string): Promise<DashboardData> => {
      const p = new URLSearchParams()
      if (from) p.set('from', from)
      if (to) p.set('to', to)
      const qs = p.toString()
      return apiFetch<DashboardData>(qs ? `/dashboard?${qs}` : '/dashboard')
    },
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
    quarterlySummary: (): Promise<QuarterlySummary[]> => apiFetch<QuarterlySummary[]>('/analytics/quarterly-summary'),
    payerPerformance: (): Promise<PayerPerformance[]> => apiFetch<PayerPerformance[]>('/analytics/payer-performance'),
  },
  staff: {
    list: (): Promise<StaffMember[]> => apiFetch<StaffMember[]>('/staff'),
    get: (id: string): Promise<StaffMember> => apiFetch<StaffMember>(`/staff/${id}`),
    create: (data: Omit<StaffMember, 'id'> & { id: string }): Promise<StaffMember> =>
      apiFetch<StaffMember>('/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    update: (id: string, data: Partial<StaffMember>): Promise<StaffMember> =>
      apiFetch<StaffMember>(`/staff/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  },
  overhead: {
    list: (): Promise<OverheadEntry[]> => apiFetch<OverheadEntry[]>('/overhead'),
    save: (data: OverheadEntry): Promise<OverheadEntry> =>
      apiFetch<OverheadEntry>('/overhead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    update: (month: string, data: Partial<OverheadEntry>): Promise<OverheadEntry> =>
      apiFetch<OverheadEntry>(`/overhead/${month}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  },
  payPeriodsFull: {
    list: (): Promise<{ salaryPeriods: SalaryPayPeriod[]; hourlyPeriods: HourlyPayPeriod[] }> =>
      apiFetch('/pay-periods/list'),
    summary: (type: 'salary' | 'hourly', periodStart: string): Promise<PartnerPeriodSummary[] | EmilyPayPeriodSummary> =>
      apiFetch(`/pay-periods/summary?type=${type}&periodStart=${encodeURIComponent(periodStart)}`),
    saveRecord: (data: { periodStart: string; periodEnd?: string; payDate?: string; clinician: string; adminHours?: number; bonusPay?: number; notes?: string }): Promise<{ ok: boolean }> =>
      apiFetch('/pay-periods/record', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  },
}
