export const CLINICIANS = ['Shannon', 'Jen', 'Emily'] as const
export type Clinician = typeof CLINICIANS[number]

export const SERVICE_CODES = ['90837', '90832', '90834', '90847', '90791', '90785', '96127', '96136'] as const
export type ServiceCode = typeof SERVICE_CODES[number]

export const SUBMISSION_METHODS = ['Manual', 'Electronic', 'Cash', 'Secondary'] as const
export type SubmissionMethod = typeof SUBMISSION_METHODS[number]

export const CLAIM_STATUSES = ['Pending', 'Payment Pending', 'Finalized', 'Deductible', 'Sent to Secondary', 'Payment Received', 'Denied'] as const
export type ClaimStatus = typeof CLAIM_STATUSES[number]

export const KNOWN_PAYERS = [
  'BCBS', 'Aetna', 'United', 'United-MA', 'United-Surest', 'Medicare',
  'Health Options', 'Delaware First', 'Amerihealth VIP', 'Mutual of Omaha',
  'Self-Pay', 'Late Cancellation', 'Meritain',
] as const

export interface Claim {
  rowIndex: number
  claimId?: string
  clientId: string
  clinician: Clinician
  insurance: string
  claimDate: string          // M/D/YYYY
  week: string               // calculated: Sunday of week
  payPeriod: string          // calculated: from Pay Periods sheet
  submissionMethod: SubmissionMethod
  serviceCode: ServiceCode
  status: ClaimStatus
  clientAmount: number
  trueClientAmount: number   // calculated: clientAmount - stripeFees
  stripeFees: number         // calculated: (clientAmount × 0.029) + 0.30
  insuranceAmount: number
  insurancePaidHHO?: number  // HHO-specific, col P
  overUnderHHO?: number      // HHO-specific, col Q
  totalPayment: number       // clientAmount + insuranceAmount
  paymentDateReceived?: string
  timeToReceivePayment?: number
  lagDays?: number           // calculated on payment recording
  forecastPaymentDate: string
  forecastWeek: string
  receivedWeek?: string
  notes?: string
}

export interface NewClaimInput {
  claimDate: string
  clinician: Clinician
  clientId?: string
  insurance: string
  claimId?: string
  serviceCode: ServiceCode
  submissionMethod: SubmissionMethod
  status?: ClaimStatus
  clientAmount?: number
  insuranceAmount?: number
  notes?: string
}

export interface ClaimUpdateInput {
  status?: ClaimStatus
  paymentDateReceived?: string
  totalPayment?: number
  insuranceAmount?: number
  clientAmount?: number
  notes?: string
}

export interface ClaimFullEditInput {
  claimDate?: string
  clinician?: Clinician
  clientId?: string
  insurance?: string
  claimId?: string
  serviceCode?: ServiceCode
  submissionMethod?: SubmissionMethod
  status?: ClaimStatus
  clientAmount?: number
  insuranceAmount?: number
  paymentDateReceived?: string
  totalPayment?: number
  notes?: string
}

export interface PayPeriod {
  start: string
  end: string
  payDate: string
}

export interface CaseloadEntry {
  clientId: string
  clinician: Clinician
}

export interface AgingBucket {
  count: number
  total: number
}

export interface PayerMixEntry {
  payer: string
  amount: number
}

export interface MonthlyAggregate {
  month: string
  sessionsByClinician: Record<Clinician, number>
  revenue: number
}

export interface CaseloadTrendMonth {
  month: string
  emilySessions: number | null
  shannonSessions: number | null
  jenSessions: number | null
  totalSessions: number | null
  emilyClients: number | null
  shannonClients: number | null
  jenClients: number | null
  totalClients: number | null
  emilyAvgPerWeek: number | null
  shannonAvgPerWeek: number | null
  jenAvgPerWeek: number | null
  totalAvgPerWeek: number | null
  emilyUtilPct: number | null
  shannonUtilPct: number | null
  jenUtilPct: number | null
  totalUtilPct: number | null
  emilyRevenue: number | null
  shannonRevenue: number | null
  jenRevenue: number | null
  totalRevenue: number | null
  revenuePerSession: number | null
  payrollCosts: number | null
  operationalOverhead: number | null
  totalOverhead: number | null
  grossMargin: number | null
  grossMarginPct: number | null
  income: number | null
  incomePct: number | null
  collectionVariance: number | null
  weeks: number | null
}

export interface ForecastAccuracyWeek {
  weekStart: string
  forecast: number | null
  actual: number | null
  difference: number | null
  cumulative: number | null
}

export interface DashboardPeriodMetrics {
  sessions: number
  sessionsByClinician: Record<Clinician, number>
  revenue: number
  revenueByClinician: Record<Clinician, number>
  pendingCount: number
  pendingAmount: number
  receivedAmount: number
  utilizationByClinician: Record<Clinician, number>
}

export interface DashboardData {
  currentMonth: DashboardPeriodMetrics
  priorPeriod?: DashboardPeriodMetrics
  sixMonthTrend: MonthlyAggregate[]
  aging: {
    bucket0_30: AgingBucket
    bucket31_60: AgingBucket
    bucket61_90: AgingBucket
    bucket90plus: AgingBucket
  }
  payerMix: PayerMixEntry[]
}

// ─── PHASE 4 TYPES ────────────────────────────────────────────────────────────

export type DateWindow = 'mtd' | 'qtd' | 'ytd' | 'last-month' | 'last-quarter'

export interface QuarterlySummary {
  year: number
  quarter: 1 | 2 | 3 | 4
  label: string
  revenue: number
  income: number
  operationalOverhead: number
  payrollOverhead: number
  totalOverhead: number
  profit: number
  marginPct: number | null
  sessions: number
  byClinicianRevenue: Record<string, number>
  byClinicianSessions: Record<string, number>
  missingOverheadMonths: string[]
}

export interface OverheadLineItem {
  account: string
  amount: number
  category: 'income' | 'payroll' | 'operational' | 'other'
}

export interface XeroImportPreview {
  month: string
  periodLabel: string
  totalIncome: number
  payrollExpenses: number
  operationalExpenses: number
  totalExpenses: number
  netIncome: number
  lineItems: OverheadLineItem[]
}

export interface OverheadEntry {
  month: string
  totalIncome: number
  payrollExpenses: number
  operationalExpenses: number
  totalExpenses: number
  netIncome: number
  lineItems: OverheadLineItem[]
  importSource: 'xero-import' | 'manual'
  notes: string
}

export interface SalaryPayPeriod {
  periodStart: string
  periodEnd: string
  payDate: string
}

export interface HourlyPayPeriod {
  periodStart: string
  periodEnd: string
  payDate: string
}

export interface PartnerPeriodSummary {
  clinician: string
  periodStart: string
  periodEnd: string
  payDate: string
  sessions: number
  revenue: number
  receivedRevenue: number
  pendingRevenue: number
  annualSalary: number
  periodSalary: number
}

export interface EmilyPayPeriodSummary {
  periodStart: string
  periodEnd: string
  payDate: string
  claimCount: number
  sessions: number
  revenue: number
  paymentsReceived: number
  pctReceivedByPayDate: number
  unreceivedPayments: number
  sessionRate: number
  sessionPay: number
  adminHourlyRate: number
  adminHours: number
  adminPay: number
  bonusPay: number
  totalPay: number
  profit: number
  profitMargin: number
  priorPeriodMargins: number[]
}

export interface PayerPerformance {
  payer: string
  totalClaims: number
  avgDaysToPay: number | null
  collectionRate: number | null
  pendingCount: number
  oldestPendingDays: number | null
}

export interface StaffMember {
  id: string
  name: string
  role: 'partner' | 'w2'
  npi: string
  licenseType: string
  licenseNumber: string
  licenseState: string
  licenseExpiration: string | null
  hireDate: string
  compensationType: 'salary' | 'session-rate'
  annualSalary: number | null
  sessionRate: number | null
  adminHourlyRate: number | null
  active: boolean
  notes: string
}
