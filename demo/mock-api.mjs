// Synthetic demo data for `npm run dev:demo`. Everything here is invented — no real
// claims, clients, or financials. Served by a dev-only Vite middleware (see
// vite.config.ts); in demo mode nothing is proxied to the live Worker.

// ─── helpers ────────────────────────────────────────────────────────────────
let seed = 20261021
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
const round2 = (n) => Math.round(n * 100) / 100
const DAY = 864e5

const today = new Date()
today.setHours(0, 0, 0, 0)
const addDays = (d, n) => new Date(d.getTime() + n * DAY)
const mdy = (d) => `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const sunday = (d) => addDays(d, -d.getDay())
const monthStart = (offset) => new Date(today.getFullYear(), today.getMonth() + offset, 1)
const MONTH = (d) => d.toLocaleDateString('en-US', { month: 'short' })
const hex = () => Array.from({ length: 16 }, () => '0123456789abcdef'[Math.floor(rnd() * 16)]).join('')

const CLINICIANS = ['Shannon', 'Jen', 'Emily', 'Shana']
const by = (a, b, c, d) => ({ Shannon: a, Jen: b, Emily: c, Shana: d })
const PAYERS = [['BCBS', 30], ['Aetna', 22], ['United', 12], ['Health Options', 10], ['Medicare', 5], ['Meritain', 5], ['Self-Pay', 6], ['United-MA', 4], ['Delaware First', 3]]
const pickPayer = () => {
  let r = rnd() * PAYERS.reduce((s, p) => s + p[1], 0)
  for (const [n, w] of PAYERS) { if ((r -= w) <= 0) return n }
  return 'BCBS'
}
const RATE = { BCBS: 138, Aetna: 125, United: 122, 'Health Options': 98, Medicare: 112, Meritain: 118, 'Self-Pay': 150, 'United-MA': 120, 'Delaware First': 96 }

// ─── claims ─────────────────────────────────────────────────────────────────
const claims = []
for (let i = 0; i < 260; i++) {
  const age = Math.floor(rnd() * 130)
  const cd = addDays(today, -age)
  if (cd.getDay() === 0) continue
  const clinician = pick(['Shannon', 'Shannon', 'Jen', 'Jen', 'Emily', 'Shana'])
  const insurance = pickPayer()
  const selfPay = insurance === 'Self-Pay'
  const insuranceAmount = selfPay ? 0 : round2(RATE[insurance] * (0.82 + rnd() * 0.12))
  const clientAmount = selfPay ? RATE[insurance] : rnd() < 0.3 ? pick([20, 25, 30, 40]) : 0
  const lag = selfPay ? 0 : 14 + Math.floor(rnd() * 20)
  const forecast = addDays(cd, lag)
  let status
  if (selfPay) status = 'Payment Received'
  else if (age > 55) status = rnd() < 0.04 ? 'Denied' : rnd() < 0.7 ? 'Finalized' : 'Payment Received'
  else if (age > 30) status = rnd() < 0.9 ? 'Payment Received' : rnd() < 0.6 ? 'Pending' : 'Payment Pending'
  else status = rnd() < 0.12 ? 'Payment Pending' : rnd() < 0.05 ? 'Deductible' : 'Pending'
  if (status === 'Pending' && forecast < today && rnd() < 0.92) status = 'Payment Received'
  const received = ['Payment Received', 'Finalized'].includes(status)
  const paid = received ? addDays(cd, lag + Math.floor(rnd() * 6) - 3) : null
  const stripeFees = clientAmount > 0 ? round2(clientAmount * 0.029 + 0.3) : 0
  claims.push({
    rowIndex: 0,
    claimId: selfPay ? undefined : String(870000 + i * 7),
    clientId: hex(),
    clinician,
    insurance,
    claimDate: mdy(cd),
    week: mdy(sunday(cd)),
    payPeriod: mdy(new Date(cd.getFullYear(), cd.getMonth() - (cd.getDate() < 16 ? 1 : 0), 16)),
    submissionMethod: selfPay ? 'Cash' : 'Electronic',
    serviceCode: pick(['90837', '90837', '90837', '90834', '90834', '90832', '90847', '90791']),
    status,
    clientAmount,
    trueClientAmount: round2(clientAmount - stripeFees),
    stripeFees,
    insuranceAmount,
    insurancePaidHHO: insurance === 'Health Options' && received ? round2(insuranceAmount * 0.9) : undefined,
    overUnderHHO: insurance === 'Health Options' && received ? round2(-insuranceAmount * 0.1) : undefined,
    totalPayment: round2(clientAmount + insuranceAmount),
    paymentDateReceived: paid ? mdy(paid) : undefined,
    lagDays: paid ? lag : undefined,
    timeToReceivePayment: paid ? lag : undefined,
    forecastPaymentDate: mdy(forecast),
    forecastWeek: mdy(sunday(forecast)),
    receivedWeek: paid ? mdy(sunday(paid)) : undefined,
    notes: rnd() < 0.08 ? 'Copay received' : '',
  })
}
claims.sort((a, b) => new Date(b.claimDate) - new Date(a.claimDate))
claims.forEach((c, i) => { c.rowIndex = i + 2 })

// ─── staff ──────────────────────────────────────────────────────────────────
const lic = (days) => iso(addDays(today, days))
const staff = [
  { id: 'st-1', name: 'Shannon Tarolli', role: 'partner', npi: '1000000001', licenseType: 'LPCMH', licenseNumber: 'DE-100001', licenseState: 'DE', licenseExpiration: lic(52), hireDate: '2023-01-01', compensationType: 'salary', annualSalary: 96000, sessionRate: null, adminHourlyRate: null, active: true, notes: '', caqhId: '10000001', therapySessionRate: null, otherSessionRate: null, noShowRate: null, targetCapacity: 25 },
  { id: 'st-2', name: 'Jen Meehan', role: 'partner', npi: '1000000002', licenseType: 'LCSW', licenseNumber: 'DE-100002', licenseState: 'DE', licenseExpiration: lic(310), hireDate: '2023-01-01', compensationType: 'salary', annualSalary: 96000, sessionRate: null, adminHourlyRate: null, active: true, notes: '', caqhId: '10000002', therapySessionRate: null, otherSessionRate: null, noShowRate: null, targetCapacity: 25 },
  { id: 'st-3', name: 'Emily Bryant', role: 'w2', npi: '1000000003', licenseType: 'LCSW', licenseNumber: 'DE-100003', licenseState: 'DE', licenseExpiration: lic(420), hireDate: '2026-02-16', compensationType: 'session-rate', annualSalary: null, sessionRate: 45, adminHourlyRate: 25, active: true, notes: '', caqhId: '10000003', therapySessionRate: 45, otherSessionRate: 35, noShowRate: 25, targetCapacity: 10 },
  { id: 'st-4', name: 'Shana Petruccelli', role: 'w2', npi: '1000000004', licenseType: 'LPCMH', licenseNumber: 'DE-100004', licenseState: 'DE', licenseExpiration: lic(205), hireDate: '2026-06-15', compensationType: 'session-rate', annualSalary: null, sessionRate: 50, adminHourlyRate: 25, active: true, notes: '', caqhId: '10000004', therapySessionRate: 50, otherSessionRate: 38, noShowRate: 25, targetCapacity: 20 },
]
const licenses = staff.map((s) => ({ id: `lic-${s.id}`, staffId: s.id, licenseType: s.licenseType, licenseNumber: s.licenseNumber, licenseState: s.licenseState, effectiveDate: '2024-01-01', expirationDate: s.licenseExpiration, active: true }))
const pursuits = [{ id: 'pur-1', staffId: 'st-2', state: 'PA', credential: 'LCSW', status: 'In Progress', targetDate: lic(120), notes: '', active: true }]
const steps = [
  { id: 'stp-1', pursuitId: 'pur-1', label: 'Submit application', status: 'Done', dueDate: lic(-20), link: null, notes: '', active: true, sortOrder: 1 },
  { id: 'stp-2', pursuitId: 'pur-1', label: 'Background check', status: 'In Progress', dueDate: lic(25), link: null, notes: '', active: true, sortOrder: 2 },
  { id: 'stp-3', pursuitId: 'pur-1', label: 'Verify supervision hours', status: 'Not Started', dueDate: lic(60), link: null, notes: '', active: true, sortOrder: 3 },
]

// ─── credentialing / CE ─────────────────────────────────────────────────────
const CRED_STATUS = ['Effective', 'Effective', 'Submitted', 'Confirmed', 'Additional Info Requested', 'Not Started']
const credentialing = []
for (const [pi, p] of ['BCBS', 'Aetna', 'United', 'Health Options', 'Medicare', 'Meritain'].entries())
  for (const [ci, c] of CLINICIANS.entries())
    if ((pi + ci) % 5 !== 4)
      credentialing.push({ rowIndex: credentialing.length + 2, clinician: c, payer: p, status: CRED_STATUS[(pi * 2 + ci) % CRED_STATUS.length], dateSubmitted: '2025-11-03', dateEffective: '2026-01-01', providerIdentifier: `PRV-${pi}${ci}77`, caqhLinked: true })

const ceStatus = [
  { clinician: 'Shannon', licenseType: 'LPCMH', licenseState: 'DE', ceHoursRequired: 40, hoursCompleted: 14, ethicsHoursRequired: 3, ethicsHoursCompleted: 0, otherSubRequirementLabel: 'Suicide prevention', otherSubRequirementHours: 3, otherSubRequirementHoursCompleted: 0, cycleStart: '2025-01-01', cycleEnd: '2026-12-31', status: 'At Risk' },
  { clinician: 'Jen', licenseType: 'LCSW', licenseState: 'DE', ceHoursRequired: 40, hoursCompleted: 31, ethicsHoursRequired: 3, ethicsHoursCompleted: 3, otherSubRequirementHours: 0, otherSubRequirementHoursCompleted: 0, cycleStart: '2025-01-01', cycleEnd: '2026-12-31', status: 'On Track' },
  { clinician: 'Emily', licenseType: 'LCSW', licenseState: 'DE', ceHoursRequired: 40, hoursCompleted: 18, ethicsHoursRequired: 3, ethicsHoursCompleted: 3, otherSubRequirementHours: 0, otherSubRequirementHoursCompleted: 0, cycleStart: '2025-01-01', cycleEnd: '2027-12-31', status: 'Behind Pace' },
  { clinician: 'Shana', licenseType: 'LPCMH', licenseState: 'DE', ceHoursRequired: 40, hoursCompleted: 22, ethicsHoursRequired: 3, ethicsHoursCompleted: 3, otherSubRequirementHours: 0, otherSubRequirementHoursCompleted: 0, cycleStart: '2025-01-01', cycleEnd: '2027-12-31', status: 'On Track' },
]
const ceLog = [
  { rowIndex: 2, clinician: 'Jen', activityTitle: 'Couples Therapy Intensive', provider: 'Gottman Institute', dateCompleted: iso(addDays(today, -40)), hours: 12, category: 'Clinical' },
  { rowIndex: 3, clinician: 'Shannon', activityTitle: 'ERP for OCD', provider: 'IOCDF', dateCompleted: iso(addDays(today, -75)), hours: 8, category: 'Clinical' },
  { rowIndex: 4, clinician: 'Emily', activityTitle: 'Ethics in Telehealth', provider: 'NASW', dateCompleted: iso(addDays(today, -20)), hours: 3, category: 'Ethics' },
]

// ─── periods / pay ──────────────────────────────────────────────────────────
const periods = []
for (let i = 7; i >= 0; i--) {
  const start = new Date(today.getFullYear(), today.getMonth() - Math.floor(i / 2) - (today.getDate() < 16 ? 1 : 0), i % 2 ? 1 : 16)
  const s = i % 2 ? new Date(start.getFullYear(), start.getMonth(), 1) : new Date(start.getFullYear(), start.getMonth(), 16)
  const e = i % 2 ? new Date(s.getFullYear(), s.getMonth(), 15) : new Date(s.getFullYear(), s.getMonth() + 1, 0)
  periods.push({ periodStart: mdy(s), periodEnd: mdy(e), payDate: mdy(addDays(e, 5)) })
}
const payPeriods = periods.map((p) => ({ start: p.periodStart, end: p.periodEnd, payDate: p.payDate }))

const partnerSummary = (p) => ['Shannon', 'Jen'].map((c, i) => {
  const revenue = round2(6800 + i * 900 + rnd() * 700)
  const periodSalary = 4000
  const overheadCosts = round2(1150 + rnd() * 120)
  const stripeFeesCost = round2(40 + rnd() * 20)
  const totalExpenses = round2(periodSalary + overheadCosts + stripeFeesCost)
  return { clinician: c, ...p, sessions: 44 + i * 4, revenue, receivedRevenue: round2(revenue * 0.84), pendingRevenue: round2(revenue * 0.16), annualSalary: 96000, periodSalary, overheadCosts, overheadSource: 'formula', stripeFeesCost, totalExpenses, profit: round2(revenue - totalExpenses), profitMargin: round2((revenue - totalExpenses) / revenue) }
})
const hourlySummary = (p, clinician) => {
  const revenue = round2((clinician === 'Emily' ? 2600 : 3300) + rnd() * 500)
  const therapySessions = clinician === 'Emily' ? 18 : 26
  const therapyPay = therapySessions * (clinician === 'Emily' ? 45 : 50)
  const overheadCosts = round2(130 + rnd() * 25)
  const totalPay = round2(therapyPay + 60 + 40)
  const totalExpenses = round2(totalPay + overheadCosts + 22)
  return {
    ...p, claimCount: therapySessions + 2, sessions: therapySessions, revenue, paymentsReceived: round2(revenue * 0.8), pctReceivedToDate: 80, paymentsReceivedByPayDate: round2(revenue * 0.55), pctReceivedByPayDate: 55, unreceivedPayments: round2(revenue * 0.2),
    therapySessions, claimsTherapySessions: therapySessions, therapySessionRate: clinician === 'Emily' ? 45 : 50, therapyPay, otherSessions: 2, claimsOtherSessions: 2, otherSessionRate: 35, otherPay: 70, noShows: 1, claimsNoShows: 1, noShowRate: 25, noShowPay: 25, noShowsConfirmed: true, savedNotes: '',
    consultations: 1, consultPay: 25, meetingHours: 1, trainingHours: 1, overheadCosts, overheadTaxRate: 0.0956, overheadFixedAmount: 110.8, overheadSource: 'formula', stripeFeesCost: 22, totalExpenses, claimsPerCode: { '90837': 14, '90834': 4, '90832': 2 }, priorPeriodAvgSessions: therapySessions - 1, isFinalized: false,
    sessionRate: 45, sessionPay: therapyPay, adminHourlyRate: 25, adminHours: 2, adminPay: 50, bonusPay: 0, totalPay, profit: round2(revenue - totalExpenses), profitMargin: round2((revenue - totalExpenses) / revenue), priorPeriodMargins: [0.38, 0.41, 0.36],
  }
}
const hourlyHistory = (clinician) => periods.slice(0, 7).map((p) => {
  const s = hourlySummary(p, clinician)
  const { claimCount, sessions, revenue, paymentsReceived, pctReceivedToDate, paymentsReceivedByPayDate, pctReceivedByPayDate, therapyPay, otherPay, noShowPay, consultPay, adminPay, sessionPay, bonusPay, totalPay, overheadCosts, stripeFeesCost, totalExpenses, profit, profitMargin } = s
  void claimCount
  return { periodStart: p.periodStart, periodEnd: p.periodEnd, payDate: p.payDate, sessions, revenue, paymentsReceived, pctReceivedToDate, paymentsReceivedByPayDate, pctReceivedByPayDate, therapyPay, otherPay, noShowPay, consultPay, adminPay, sessionPay, bonusPay, totalPay, overheadCosts, stripeFeesCost, totalExpenses, profit, profitMargin }
})

// ─── financial series ───────────────────────────────────────────────────────
const months6 = Array.from({ length: 6 }, (_, i) => monthStart(i - 5))
const revFor = (i) => 54000 + i * 2600 + (i === 3 ? -5200 : 0)

const overhead = months6.slice(0, 5).map((m, i) => ({
  month: iso(m), totalIncome: revFor(i) * 0.93, payrollExpenses: 24500 + i * 300, operationalExpenses: 6200 + i * 90, totalExpenses: 30700 + i * 390, netIncome: revFor(i) * 0.93 - (30700 + i * 390),
  lineItems: [{ account: 'Software', amount: 1450, category: 'operational' }, { account: 'Rent & Office', amount: 2100, category: 'operational' }, { account: 'Payroll', amount: 24500, category: 'payroll' }],
  importSource: 'qbo-import', notes: '',
}))
const payroll = months6.slice(0, 5).map((m, i) => ({ month: iso(m), grossEarnings: 23000 + i * 250, employerTaxes: 2200, totalPayrollCost: 25200 + i * 250, partnerDistributions: 4200, employeeCount: 4, breakdown: [], importSource: 'gusto-import', notes: '' }))

const caseloadTrends = months6.map((m, i) => {
  const sess = { shannon: 96 + i, jen: 84 + (i % 3), emily: 22 + i * 2, shana: i >= 4 ? 30 + i : 0 }
  const total = Object.values(sess).reduce((a, b) => a + b, 0)
  const rev = revFor(i)
  return {
    month: iso(m), emilySessions: sess.emily, shannonSessions: sess.shannon, jenSessions: sess.jen, shanaSessions: sess.shana, totalSessions: total,
    emilyClients: 8 + i, shannonClients: 34, jenClients: 31, shanaClients: i >= 4 ? 14 : 0, totalClients: 73 + i,
    emilyAvgPerWeek: 5 + i * 0.4, shannonAvgPerWeek: 22 + i * 0.2, jenAvgPerWeek: 20, shanaAvgPerWeek: i >= 4 ? 15 : null, totalAvgPerWeek: total / 4.3,
    emilyUtilPct: 0.55 + i * 0.03, shannonUtilPct: 0.88 + i * 0.01, jenUtilPct: 0.8, shanaUtilPct: i >= 4 ? 0.75 : null, totalUtilPct: 0.82,
    emilyRevenue: rev * 0.12, shannonRevenue: rev * 0.4, jenRevenue: rev * 0.36, shanaRevenue: i >= 4 ? rev * 0.12 : 0, totalRevenue: rev, revenuePerSession: rev / total,
    payrollCosts: 25200, operationalOverhead: 6300, totalOverhead: 31500, grossMargin: rev - 31500, grossMarginPct: (rev - 31500) / rev, payrollMargin: rev - 25200, payrollMarginPct: (rev - 25200) / rev,
    income: rev * 0.93, incomePct: 0.93, collectionVariance: Math.round((rnd() - 0.5) * 3600), weeks: 4.3,
  }
})

const quarterly = [0, 1, 2, 3].map((k) => {
  const q = ((today.getMonth() / 3) | 0) + 1 - (3 - k)
  const qn = ((q - 1 + 8) % 4) + 1
  const yr = today.getFullYear() - (q <= 0 ? 1 : 0)
  const revenue = 156000 + k * 9000
  const overheadT = 94000 + k * 1500
  return { year: yr, quarter: qn, label: `Q${qn} ${yr}`, revenue, income: revenue * 0.94, operationalOverhead: 19000, payrollOverhead: 75000 + k * 1500, totalOverhead: overheadT, profit: revenue - overheadT, marginPct: (revenue - overheadT) / revenue, payrollProfit: revenue - 75000, payrollMarginPct: 0.5, sessions: 640 + k * 30, byClinicianRevenue: { Shannon: revenue * 0.4, Jen: revenue * 0.36, Emily: revenue * 0.12, Shana: revenue * 0.12 }, byClinicianSessions: { Shannon: 270, Jen: 240, Emily: 70, Shana: 60 }, missingOverheadMonths: [] }
})

const quarterProjection = {
  quarterLabel: `Q${((today.getMonth() / 3) | 0) + 1} ${today.getFullYear()}`, elapsedDays: 21, totalQuarterDays: 92, missingOverheadMonths: [],
  actualRevenue: 41200, actualIncome: 37800, actualOverhead: 22400, actualProfit: 14800,
  projectedRemainingRevenue: 122000, projectedRemainingIncome: 115000, projectedRemainingOverhead: 70000, projectedRemainingProfit: 45000,
  projectedTotalRevenue: 163200, projectedTotalIncome: 152800, projectedTotalOverhead: 92400, projectedTotalProfit: 59800, projectedMarginPct: 0.366,
  qtdLabel: 'Q4 to date', priorQtdLabel: 'Q3 to date', priorRevenue: 38100, priorIncome: 35000, priorOverhead: 21900, priorProfit: 13100,
}

const payerPerformance = PAYERS.map(([payer], i) => ({ payer, totalClaims: 120 - i * 9, avgDaysToPay: payer === 'Self-Pay' ? 0 : 17 + i * 2, collectionRate: 0.97 - i * 0.015, pendingCount: 14 - i, oldestPendingDays: 22 + i * 9 }))

const valuation = {
  trailingTwelveMonthsRevenue: 668000,
  payerConcentration: [['BCBS', 31], ['Aetna', 22], ['United', 12], ['Health Options', 10], ['Medicare', 6], ['Other', 19]].map(([payer, p]) => ({ payer, revenue: 668000 * p / 100, pctOfTotal: p })),
  top1PayerPct: 31, top3PayerPct: 65, herfindahlIndex: 1790,
  overheadToRevenueTrend: months6.map((m, i) => ({ month: iso(m), ratio: 0.58 - i * 0.012 })),
  cashConversionTrend: months6.map((m, i) => ({ month: iso(m), ratio: 0.9 + (i % 3) * 0.025 })),
  byClinicianRevenue: { Shannon: 268000, Jen: 240000, Emily: 82000, Shana: 78000 },
  marginTrendDirection: 'improving', marginTrendSlopePctPerMonth: 0.62, dataComplete: true,
}

const forecastAccuracy = Array.from({ length: 12 }, (_, i) => {
  const forecast = 6800 + (i % 4) * 400
  const actual = forecast + Math.round((rnd() - 0.45) * 1400)
  return { weekStart: iso(sunday(addDays(today, -7 * (12 - i)))), forecast, actual, difference: actual - forecast, cumulative: 0 }
})

const capacityWeeks = [3, 2, 1].map((n) => ({ weekStart: iso(sunday(addDays(today, -7 * n))), emilySessions: 6, shannonSessions: 24, jenSessions: 22, shanaSessions: 21, emilyUtilPct: 0.62, shannonUtilPct: 0.97, jenUtilPct: 0.88, shanaUtilPct: 1.04 }))

const caseloadAnalysis = Array.from({ length: 48 }, () => {
  const clinician = pick(CLINICIANS)
  const sessionCount = 3 + Math.floor(rnd() * 30)
  return { clientId: hex(), clinician, sessionCount, lastSessionDate: mdy(addDays(today, -Math.floor(rnd() * 40))), primaryPayer: pickPayer(), totalRevenue: round2(sessionCount * (100 + rnd() * 40)), isActive: rnd() > 0.15, avgDaysToPayment: rnd() > 0.1 ? 14 + Math.floor(rnd() * 14) : null }
})
const caseloads = caseloadAnalysis.map((c) => ({ clientId: c.clientId, clinician: c.clinician }))

const contractRates = ['BCBS', 'Aetna', 'United', 'Health Options', 'Medicare'].map((payer) => ({ payer, effectiveDate: '2026-01-01', rates: { '90837': RATE[payer], '90834': round2(RATE[payer] * 0.8), '90832': round2(RATE[payer] * 0.55), '90791': round2(RATE[payer] * 1.2), '90847': round2(RATE[payer] * 1.05) } }))

let hhoLog = Array.from({ length: 5 }, (_, i) => {
  const date = addDays(today, -7 * (5 - i) * 2)
  const deposited = round2(900 + rnd() * 600)
  const trueRate = round2(deposited + 220 + rnd() * 80)
  return { rowIndex: i + 2, eraDate: iso(date), eraReference: `EPP-${100 + i}`, actualDeposited: deposited, trueRateTotal: trueRate, netTransfer: round2(trueRate - deposited), direction: 'to-savings', runningReserveBalance: round2(2400 + i * 260), residualDueToHHO: 0, openingBalance: 2400, notes: '' }
})

// ─── dashboard ──────────────────────────────────────────────────────────────
const metrics = (k) => ({
  sessions: Math.round(214 * k), sessionsByClinician: by(Math.round(92 * k), Math.round(81 * k), Math.round(26 * k), Math.round(15 * k)),
  revenue: round2(31840 * k), revenueByClinician: by(round2(13200 * k), round2(11900 * k), round2(3900 * k), round2(2840 * k)),
  receivedByClinician: by(round2(11300 * k), round2(10100 * k), round2(3300 * k), round2(2510 * k)),
  pendingCount: 142, pendingAmount: 18420, receivedAmount: round2(27210 * k),
  utilizationByClinician: by(88, 97, 64, 103),
})
function dashboard(window) {
  const k = { mtd: 0.55, qtd: 1.1, ytd: 4.4, 'last-month': 1, 'last-quarter': 3 }[window] ?? 0.55
  return {
    currentMonth: metrics(k), priorPeriod: metrics(k * 0.9), priorPeriodLabel: 'prior period', priorPeriodFull: metrics(k * 1.05), priorPeriodFullLabel: 'prior full period',
    sixMonthTrend: months6.map((m, i) => ({ month: MONTH(m), revenue: revFor(i), sessionsByClinician: by(92 + i, 82, 22 + i, i >= 4 ? 14 : 0) })),
    aging: { bucket0_30: { count: 96, total: 12100 }, bucket31_60: { count: 31, total: 4300 }, bucket61_90: { count: 11, total: 1520 }, bucket90plus: { count: 4, total: 500 } },
    payerMix: [['BCBS', 14200], ['Aetna', 8100], ['United', 4300], ['Health Options', 3100], ['Medicare', 1100], ['Self-Pay', 1040]].map(([payer, amount]) => ({ payer, amount })),
    incomingPayments: { count: 18, amount: 2310 }, collectionRate: 85, avgDaysToPayment: 21,
  }
}

function trend(granularity) {
  const n = { day: 30, week: 12, month: 12, quarter: 6, year: 3 }[granularity] ?? 12
  return Array.from({ length: n }, (_, i) => {
    const base = { day: 1400, week: 7800, month: 33000, quarter: 99000, year: 400000 }[granularity] ?? 33000
    const rev = round2(base * (0.85 + rnd() * 0.3))
    const t = (sessions, revenue, income) => ({ sessions, revenue, income })
    return {
      label: `${granularity[0].toUpperCase()}${i + 1}`, periodStart: iso(addDays(today, -(n - i) * ({ day: 1, week: 7, month: 30, quarter: 91, year: 365 }[granularity] ?? 30))),
      ...t(Math.round(rev / 140), rev, round2(rev * 0.92)),
      byClinician: { Shannon: t(Math.round(rev / 350), rev * 0.4, rev * 0.37), Jen: t(Math.round(rev / 390), rev * 0.36, rev * 0.33), Emily: t(Math.round(rev / 1100), rev * 0.12, rev * 0.11), Shana: t(Math.round(rev / 1100), rev * 0.12, rev * 0.11) },
    }
  })
}

// ─── router ─────────────────────────────────────────────────────────────────
const findClaim = (row) => claims.find((c) => c.rowIndex === Number(row))
const merge = (target, patch) => { Object.assign(target, patch); return target }

export function handle(method, pathname, params, body) {
  const p = pathname.replace(/^\/api/, '').replace(/\/$/, '') || '/'
  const m = (re) => p.match(re)
  let r

  // claims
  if (p === '/claims') {
    if (method === 'POST') {
      const created = { ...claims[0], ...body, rowIndex: claims.length + 2, status: body.status ?? 'Pending', totalPayment: (body.clientAmount ?? 0) + (body.insuranceAmount ?? 0) }
      claims.unshift(created)
      return created
    }
    return claims.filter((c) => (!params.get('clinician') || c.clinician === params.get('clinician')) && (!params.get('payer') || c.insurance === params.get('payer')))
  }
  if (p === '/claims/bulk' && method === 'PATCH') {
    return body.rowIndices.map((i) => findClaim(i)).filter(Boolean).map((c) => merge(c, body.update))
  }
  if ((r = m(/^\/claims\/(\d+)$/))) {
    const c = findClaim(r[1])
    if (!c) return undefined
    if (method === 'DELETE') { claims.splice(claims.indexOf(c), 1); return { ok: true } }
    if (method === 'GET') return c
    merge(c, body)
    c.totalPayment = round2((c.clientAmount || 0) + (c.insuranceAmount || 0))
    return c
  }
  if (p === '/export/claims') return [['Claim ID', 'Clinician', 'Payer', 'Date', 'Status', 'Total'], ...claims.map((c) => [c.claimId ?? '', c.clinician, c.insurance, c.claimDate, c.status, String(c.totalPayment)])]
  if (p === '/maintenance/recalculate-forecasts') return { updated: 0, total: claims.length }

  // dashboard / analytics
  if (p === '/dashboard') return dashboard(params.get('window'))
  if (p === '/pay-periods') return payPeriods
  if (p === '/caseloads') return method === 'POST' ? body : caseloads
  if (p === '/caseloads/analysis') return caseloadAnalysis
  if (p === '/analytics/caseload-trends') return caseloadTrends
  if (p === '/analytics/forecast-accuracy') return forecastAccuracy
  if (p === '/analytics/capacity-recent-weeks') return capacityWeeks
  if (p === '/analytics/quarterly-summary') return quarterly
  if (p === '/analytics/quarter-projection') return quarterProjection
  if (p === '/analytics/payer-performance') return payerPerformance
  if (p === '/analytics/valuation-snapshot') return valuation
  if (p === '/analytics/trend') return trend(params.get('granularity'))
  if (p === '/analytics/hourly-performance') return { Emily: hourlyHistory('Emily'), Shana: hourlyHistory('Shana') }

  // staff
  if (p === '/staff') return method === 'POST' ? (staff.push(body), body) : staff
  if ((r = m(/^\/staff\/([^/]+)\/licenses(?:\/([^/]+))?$/))) return method === 'GET' ? licenses.filter((l) => l.staffId === r[1]) : { ...body, ok: true }
  if ((r = m(/^\/staff\/([^/]+)\/pursuits(?:\/([^/]+))?$/))) return method === 'GET' ? pursuits.filter((x) => x.staffId === r[1]) : { ...body, ok: true }
  if ((r = m(/^\/pursuits\/([^/]+)\/steps(?:\/.*)?$/))) return method === 'GET' ? steps.filter((s) => s.pursuitId === r[1]) : { ...body, ok: true }
  if ((r = m(/^\/staff\/([^/]+)$/))) {
    const s = staff.find((x) => x.id === r[1])
    return s ? (method === 'PUT' ? merge(s, body) : s) : undefined
  }

  // pay
  if (p === '/pay-periods/list') return { salaryPeriods: periods, hourlyPeriods: periods }
  if (p === '/pay-periods/summary') {
    const per = periods.find((x) => x.periodStart === params.get('periodStart')) ?? periods[periods.length - 1]
    return params.get('type') === 'salary' ? partnerSummary(per) : hourlySummary(per, params.get('clinician') ?? 'Emily')
  }
  if (p === '/pay-periods/record') return { ok: true }
  if (p === '/emily/submission' || p === '/hourly/submission') return null
  if (p === '/emily/payment-analysis' || p === '/hourly/payment-analysis') {
    return periods.slice(0, 7).map((per) => { const h = hourlySummary(per, params.get('clinician') ?? 'Emily'); return { periodStart: per.periodStart, periodEnd: per.periodEnd, payDate: per.payDate, claimCount: h.claimCount, revenue: h.revenue, paymentsReceived: h.paymentsReceived, pctReceivedByPayDate: h.pctReceivedByPayDate, unreceivedPayments: h.unreceivedPayments, sessionPay: h.sessionPay, adminHours: h.adminHours, adminPay: h.adminPay, bonusPay: 0, overheadCosts: h.overheadCosts, totalExpenses: h.totalExpenses, profit: h.profit, profitMargin: h.profitMargin } })
  }
  if (p === '/overhead') return method === 'GET' ? overhead : body
  if (p.startsWith('/overhead/')) return body
  if (p === '/payroll') return method === 'GET' ? payroll : body
  if (p === '/config') return { w2PayrollTaxRate: 0.0956, w2FixedOverheadPerPeriod: 110.8 }
  if (p === '/contract-rates') return contractRates

  // hho / credentialing / ce
  if (p === '/hho-era-log') { if (method === 'POST') { hhoLog = [...hhoLog, { ...hhoLog[hhoLog.length - 1], ...body, rowIndex: hhoLog.length + 2 }]; return hhoLog[hhoLog.length - 1] } return hhoLog }
  if (p === '/credentialing') return method === 'POST' ? { ...body, rowIndex: credentialing.length + 2 } : credentialing
  if ((r = m(/^\/credentialing\/(\d+)$/))) { const c = credentialing.find((x) => x.rowIndex === Number(r[1])); return c ? merge(c, body) : undefined }
  if (p === '/ce/log') return method === 'POST' ? { ...body, rowIndex: ceLog.length + 2 } : ceLog
  if (p.startsWith('/ce/log/')) return { ...ceLog[0], ...body }
  if (p === '/ce/status') return ceStatus

  return undefined
}
