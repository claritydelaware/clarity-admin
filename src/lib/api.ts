import type {
  Claim, NewClaimInput, ClaimUpdateInput, ClaimFullEditInput, PayPeriod, CaseloadEntry, CaseloadClientStat,
  DashboardData, CaseloadTrendMonth, ForecastAccuracyWeek,
  StaffMember, StaffLicense, OverheadEntry, PayrollEntry, QuarterlySummary, PayerPerformance,
  PartnerPeriodSummary, EmilyPayPeriodSummary, SalaryPayPeriod, HourlyPayPeriod,
  EmilySubmission, EmilyPaymentAnalysisRow, QuarterProjection,
  Clinician, ConfigData, ContractRate,
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
    delete(rowIndex: number): Promise<{ ok: boolean }> {
      return apiFetch<{ ok: boolean }>(`/claims/${rowIndex}`, { method: 'DELETE' })
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
    get: (from?: string, to?: string, window?: string): Promise<DashboardData> => {
      const p = new URLSearchParams()
      if (from)   p.set('from', from)
      if (to)     p.set('to', to)
      if (window) p.set('window', window)
      const qs = p.toString()
      return apiFetch<DashboardData>(qs ? `/dashboard?${qs}` : '/dashboard')
    },
  },
  payPeriods: {
    list: (): Promise<PayPeriod[]> => apiFetch<PayPeriod[]>('/pay-periods'),
  },
  caseloads: {
    list: (): Promise<CaseloadEntry[]> => apiFetch<CaseloadEntry[]>('/caseloads'),
    create: (data: { clientId: string; clinician: string }): Promise<CaseloadEntry> =>
      apiFetch<CaseloadEntry>('/caseloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    analysis: (): Promise<CaseloadClientStat[]> => apiFetch<CaseloadClientStat[]>('/caseloads/analysis'),
  },
  analytics: {
    caseloadTrends: (): Promise<CaseloadTrendMonth[]> => apiFetch<CaseloadTrendMonth[]>('/analytics/caseload-trends'),
    forecastAccuracy: (): Promise<ForecastAccuracyWeek[]> => apiFetch<ForecastAccuracyWeek[]>('/analytics/forecast-accuracy'),
    quarterlySummary: (): Promise<QuarterlySummary[]> => apiFetch<QuarterlySummary[]>('/analytics/quarterly-summary'),
    quarterProjection: (): Promise<QuarterProjection> => apiFetch<QuarterProjection>('/analytics/quarter-projection'),
    payerPerformance: (): Promise<PayerPerformance[]> => apiFetch<PayerPerformance[]>('/analytics/payer-performance'),
  },
  staff: {
    list: (): Promise<StaffMember[]> => apiFetch<StaffMember[]>('/staff'),
    get: (id: string): Promise<StaffMember> => apiFetch<StaffMember>(`/staff/${id}`),
    create: (data: Omit<StaffMember, 'id'> & { id: string }): Promise<StaffMember> =>
      apiFetch<StaffMember>('/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    update: (id: string, data: Partial<StaffMember>): Promise<StaffMember> =>
      apiFetch<StaffMember>(`/staff/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    licenses: {
      list: (staffId: string): Promise<StaffLicense[]> =>
        apiFetch<StaffLicense[]>(`/staff/${staffId}/licenses`),
      create: (staffId: string, data: Omit<StaffLicense, 'id' | 'staffId'>): Promise<StaffLicense> =>
        apiFetch<StaffLicense>(`/staff/${staffId}/licenses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
      update: (staffId: string, licenseId: string, data: Partial<StaffLicense>): Promise<StaffLicense> =>
        apiFetch<StaffLicense>(`/staff/${staffId}/licenses/${licenseId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
      remove: (staffId: string, licenseId: string): Promise<{ ok: boolean }> =>
        apiFetch<{ ok: boolean }>(`/staff/${staffId}/licenses/${licenseId}`, { method: 'DELETE' }),
    },
  },
  emily: {
    submission: (periodStart: string): Promise<EmilySubmission | null> =>
      apiFetch<EmilySubmission | null>(`/emily/submission?periodStart=${encodeURIComponent(periodStart)}`),
    paymentAnalysis: (): Promise<EmilyPaymentAnalysisRow[]> =>
      apiFetch<EmilyPaymentAnalysisRow[]>('/emily/payment-analysis'),
  },
  hourly: {
    submission: (clinician: Clinician, periodStart: string): Promise<EmilySubmission | null> =>
      apiFetch<EmilySubmission | null>(`/hourly/submission?clinician=${encodeURIComponent(clinician)}&periodStart=${encodeURIComponent(periodStart)}`),
    paymentAnalysis: (clinician: Clinician): Promise<EmilyPaymentAnalysisRow[]> =>
      apiFetch<EmilyPaymentAnalysisRow[]>(`/hourly/payment-analysis?clinician=${encodeURIComponent(clinician)}`),
  },
  overhead: {
    list: (): Promise<OverheadEntry[]> => apiFetch<OverheadEntry[]>('/overhead'),
    save: (data: OverheadEntry): Promise<OverheadEntry> =>
      apiFetch<OverheadEntry>('/overhead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    update: (month: string, data: Partial<OverheadEntry>): Promise<OverheadEntry> =>
      apiFetch<OverheadEntry>(`/overhead/${month}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  },
  payroll: {
    list: (): Promise<PayrollEntry[]> => apiFetch<PayrollEntry[]>('/payroll'),
    save: (data: PayrollEntry): Promise<PayrollEntry> =>
      apiFetch<PayrollEntry>('/payroll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  },
  payPeriodsFull: {
    list: (): Promise<{ salaryPeriods: SalaryPayPeriod[]; hourlyPeriods: HourlyPayPeriod[] }> =>
      apiFetch('/pay-periods/list'),
    summary: (type: 'salary' | 'hourly', periodStart: string, clinician?: Clinician): Promise<PartnerPeriodSummary[] | EmilyPayPeriodSummary> => {
      const p = new URLSearchParams({ type, periodStart })
      if (clinician) p.set('clinician', clinician)
      return apiFetch(`/pay-periods/summary?${p}`)
    },
    saveRecord: (data: {
      periodStart: string; periodEnd?: string; payDate?: string; clinician: string
      therapySessions?: number; otherSessions?: number; noShows?: number; consultations?: number
      meetingHours?: number; trainingHours?: number
      adminHours?: number; bonusPay?: number; notes?: string
    }): Promise<{ ok: boolean }> =>
      apiFetch('/pay-periods/record', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  },
  config: {
    get: (): Promise<ConfigData> => apiFetch<ConfigData>('/config'),
    update: (data: Partial<ConfigData>): Promise<ConfigData> =>
      apiFetch<ConfigData>('/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  },
  contractRates: {
    list: (): Promise<ContractRate[]> => apiFetch<ContractRate[]>('/contract-rates'),
  },
}
