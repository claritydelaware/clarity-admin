export const CLINICIANS = ['Shannon', 'Jen', 'Emily', 'Shana'] as const
export type Clinician = typeof CLINICIANS[number]

export const SERVICE_CODES = ['90837', '90832', '90834', '90847', '90791', '90785', '96127', '96136'] as const
export type ServiceCode = typeof SERVICE_CODES[number]

export const SUBMISSION_METHODS = ['Manual', 'Electronic', 'Cash', 'Secondary'] as const
export type SubmissionMethod = typeof SUBMISSION_METHODS[number]

export const CLAIM_STATUSES = ['Pending', 'Payment Pending', 'Finalized', 'Deductible', 'Sent to Secondary', 'Payment Received', 'Denied'] as const
export type ClaimStatus = typeof CLAIM_STATUSES[number]

export const KNOWN_PAYERS = [
  'BCBS', 'Aetna', 'United', 'United-MA', 'United-Surest', 'UMR', 'Medicare',
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
  paymentDateReceived?: string
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
  insurancePaidHHO?: number
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

export interface CaseloadClientStat {
  clientId: string
  clinician: string
  sessionCount: number
  lastSessionDate: string
  primaryPayer: string
  totalRevenue: number
  isActive: boolean
  avgDaysToPayment: number | null
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
  shanaSessions: number | null
  totalSessions: number | null
  emilyClients: number | null
  shannonClients: number | null
  jenClients: number | null
  shanaClients: number | null
  totalClients: number | null
  emilyAvgPerWeek: number | null
  shannonAvgPerWeek: number | null
  jenAvgPerWeek: number | null
  shanaAvgPerWeek: number | null
  totalAvgPerWeek: number | null
  emilyUtilPct: number | null
  shannonUtilPct: number | null
  jenUtilPct: number | null
  shanaUtilPct: number | null
  totalUtilPct: number | null
  emilyRevenue: number | null
  shannonRevenue: number | null
  jenRevenue: number | null
  shanaRevenue: number | null
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
  incomingPayments?: { count: number; amount: number }
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
  // multi-rate fields (Phase 5.5)
  therapySessions: number        // saved override, or live Claims count
  claimsTherapySessions: number  // always from Claims (for reconciliation)
  therapySessionRate: number
  therapyPay: number
  otherSessions: number
  claimsOtherSessions: number
  otherSessionRate: number
  otherPay: number
  noShows: number
  claimsNoShows: number
  noShowRate: number
  noShowPay: number
  savedNotes: string
  consultations: number
  consultPay: number
  meetingHours: number
  trainingHours: number
  overheadCosts: number
  totalExpenses: number
  // backward-compat fields
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
  caqhId: string
  therapySessionRate: number | null
  otherSessionRate: number | null
  noShowRate: number | null
}

export interface StaffLicense {
  id: string
  staffId: string
  licenseType: string
  licenseNumber: string
  licenseState: string
  effectiveDate: string | null
  expirationDate: string | null
  active: boolean
}

export interface EmilySubmission {
  periodStart: string
  periodEnd: string
  payDate: string
  submissionDate: string
  counts: {
    '90837': number
    '90791': number
    '90834': number
    '90832': number
    '90847': number
    '90846': number
    totalSessions: number
    lateCancel: number
    medicaidNoShow: number
  }
  adminHours: {
    meeting: number
    training: number
    consultations: number
  }
  emilySelfCalc: {
    sessionPay: number
    noShowPay: number
    adminPay: number
    totalPay: number
  }
  notes: string
}

export interface QuarterProjection {
  quarterLabel: string
  elapsedDays: number
  totalQuarterDays: number
  missingOverheadMonths: string[]

  actualRevenue: number
  actualIncome: number
  actualOverhead: number
  actualProfit: number

  projectedRemainingRevenue: number
  projectedRemainingIncome: number
  projectedRemainingOverhead: number
  projectedRemainingProfit: number

  projectedTotalRevenue: number
  projectedTotalIncome: number
  projectedTotalOverhead: number
  projectedTotalProfit: number
  projectedMarginPct: number | null

  qtdLabel: string
  priorQtdLabel: string
  priorRevenue: number
  priorIncome: number
  priorOverhead: number
  priorProfit: number
}

export interface EmilyPaymentAnalysisRow {
  periodStart: string
  periodEnd: string
  payDate: string
  claimCount: number
  revenue: number
  paymentsReceived: number
  pctReceivedByPayDate: number
  unreceivedPayments: number
  sessionPay: number
  adminHours: number
  adminPay: number
  bonusPay: number
  overheadCosts: number
  totalExpenses: number
  profit: number
  profitMargin: number
}
