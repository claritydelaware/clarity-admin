import type { Claim, NewClaimInput, ClaimUpdateInput, PayPeriod, CaseloadEntry, DashboardData } from '../types'

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
  from?: string  // YYYY-MM-DD
  to?: string    // YYYY-MM-DD
}

export const api = {
  claims: {
    list(filter?: ClaimsFilter): Promise<Claim[]> {
      const params = new URLSearchParams(
        Object.entries(filter ?? {}).filter((e): e is [string, string] => Boolean(e[1]))
      )
      return apiFetch<Claim[]>(`/claims${params.size ? `?${params}` : ''}`)
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
}
