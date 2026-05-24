# Clarity Admin Portal — Phase 4 Specification

**Date authored:** 2026-05-24  
**Prerequisite:** Phase 3 complete and deployed (`Worker: 1f467e45-17bc-4096-a391-7df55469f0f3`)  
**Repo:** `clarity-admin` (frontend) + `clarity-admin-api` (Worker)

---

## Architectural Direction

Phase 4 establishes a new principle: **the portal owns its computations.** Rather than reading pre-calculated values from spreadsheet formula cells, all analytics are derived by the Worker directly from raw Claims data. The Google Sheet remains the data store, but the portal — not Sheet formulas — is now the authoritative source of truth for aggregated metrics.

This means several sheets Bruce currently maintains manually (the Dashboard formula cells, Emily Payment Analysis, the Distribution Calculator) no longer need active upkeep. They become legacy references and can be ignored going forward.

**Two new sheet tabs will be created in the workbook:**
- `Staff` — employee profiles and compensation configuration (source of truth for pay rates)
- `Overhead` — monthly operational overhead entries (the only figure that must still be entered manually, since it originates outside the Claims sheet)

The quarterly distribution calculator is **out of scope for Phase 4** and will be addressed in a dedicated future phase.

---

## Overview

| Track | Theme | Priority |
|---|---|---|
| Track 1 | UI Refresh — typography, loading states, feedback, density | Medium |
| Track 2 | Quarterly Analytics — flexible date windowing, QTD cards, Q-over-Q chart, forecast roll-up | High |
| Track 3 | Overhead Entry — replace manual Caseload Trends upkeep | High |
| Track 4 | Pay Period Summary — clinician payroll reference page | High |
| Track 5 | Staff Section — employee profiles and pay configuration | High |
| Track 6 | Payer Performance — new Analytics section | Medium |
| Track 7 | Quality of Life — saved filter presets | Low |

---

## Track 1 — UI Refresh

### 1A. Font Update

Replace the current heading font (**Playfair Display**) with **Fraunces** (Google Fonts). Fraunces is a variable optical-size serif that reads as contemporary and warm without sacrificing legibility at small sizes.

Update the `<link>` in `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&family=DM+Sans:wght@300;400;500&family=Lora:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
```

Update the `@theme {}` block in `src/index.css`: replace the heading `font-family` token from `'Playfair Display'` to `'Fraunces'`. DM Sans (body) and Lora (accent/labels) are unchanged.

Spot-check after: Dashboard metric card headings, Sidebar nav items, page `<h1>` elements, modal titles.

**Fallback:** If Fraunces reads as too editorial after review, **Instrument Serif** is the drop-in alternative — same swap procedure.

---

### 1B. Skeleton Loading States

Replace spinner/blank states on initial data load with skeleton screens.

| Component | Skeleton shape |
|---|---|
| Dashboard metric cards | 4 gray rounded rectangles at card dimensions |
| ClaimsTable | 10-row placeholder (alternating light gray bars matching row height) |
| Analytics charts | Gray rectangle at chart canvas height |
| Forecast week groups | 3 collapsed group placeholders |

Build a reusable `<Skeleton>` component in `src/components/ui/Skeleton.tsx` accepting `width`, `height`, and optional `className`. Use Tailwind's `animate-pulse` for the shimmer. Trigger on `isLoading === true` (first fetch only). Do **not** show skeletons on background refetch (`isFetching && !isLoading`) — stale data should remain visible.

---

### 1C. Toast Notification System

Add a lightweight context-based toast for mutation feedback. No third-party library.

**Files:**
- `src/components/ui/Toast.tsx` — visual component, fixed bottom-right, z-50
- `src/context/ToastContext.tsx` — `useToast()` hook with `toast.success(msg)` and `toast.error(msg)`

**Spec:** Auto-dismiss after 3 seconds. Success: green left border + Lucide `CheckCircle`. Error: red left border + Lucide `AlertCircle`. Max 3 visible simultaneously. Mount `<ToastContainer />` in `AppShell.tsx`.

**Trigger points:**
- `useCreateClaim` onSuccess → `"Claim created"`
- `useUpdateClaim` onSuccess → `"Status updated"`
- `useInlineEditClaim` onSuccess → `"Saved"`
- Any mutation onError → `"Save failed — please try again"`
- Forecast recalculate onSuccess → `"Forecasts recalculated (N updated)"`
- Overhead save onSuccess → `"Overhead saved"`
- Staff save onSuccess → `"Staff record saved"`

---

### 1D. Claims Table Density Toggle

Add a compact/comfortable row density toggle to the Claims page header alongside the Export CSV button.

- **Comfortable** (default): current row padding
- **Compact**: reduce vertical padding ~40%; shrink secondary field font size to `text-xs`
- Persist in `localStorage` under key `claimsTableDensity`
- Use Lucide `AlignJustify` / `List` icons; tooltip on hover, no label

---

## Track 2 — Quarterly Analytics

All quarterly and date-windowed metrics are **computed by the Worker from raw Claims data**. No pre-calculated Sheet cells are read for any metric in this track.

---

### 2A. Flexible Date Windowing on Dashboard *(prerequisite for 2B and 2C)*

Add a date range mode selector to the Dashboard page header.

| Mode | Behavior |
|---|---|
| MTD | Month-to-date (current behavior — default) |
| QTD | Quarter-to-date (Q start through today) |
| YTD | Jan 1 through today |
| Last Month | Full prior calendar month |
| Last Quarter | Full prior calendar quarter |

**Implementation:**
```typescript
// src/types/index.ts
export type DateWindow = 'mtd' | 'qtd' | 'ytd' | 'last-month' | 'last-quarter';
```

Add `useDateWindow()` hook in `src/hooks/useDateWindow.ts` returning `{ window, setWindow, startDate, endDate }`. Persist selection in `localStorage` under key `dashboardDateWindow`. Render as a small segmented button group, right-aligned in the Dashboard page header.

**Worker changes to `GET /api/dashboard`:**
- Accept optional `from` and `to` ISO date query params
- When present, filter the Claims dataset to that range before computing all metrics
- When absent, fall back to current calendar month (existing behavior)
- Extend response to include `priorPeriod` metrics (same duration, shifted back one period) for delta badges

---

### 2B. QTD Metric Cards with Period Comparison

The existing four metric cards switch content based on the active `DateWindow`. Label dynamically (e.g., "Q2 2026 to date" vs "May 2026").

Add a comparison delta badge per card showing change vs. the equivalent prior period:
- Green arrow up / red arrow down
- Format: `+16%` / `-12%`
- Grayed out if insufficient prior-period data

**Worker computation:**
- Current period: filter Claims by `(from, to)` → sum `totalPayment`, count sessions, sum pending, sum received
- Prior period: same duration shifted back (e.g., for QTD 54 days, compare against days 1–54 of the prior quarter)
- Return both as `currentPeriod` and `priorPeriod` in the dashboard response

---

### 2C. Quarter-over-Quarter Chart on Analytics

Add a fifth section to the Analytics page: **Quarterly Performance**.

**Worker endpoint:**
```
GET /api/analytics/quarterly-summary
Aggregates Claims by quarter. Also joins Overhead sheet for margin calculation.
Returns: QuarterlySummary[]
```

**Computation logic:**
- Group Claims rows by calendar quarter (derive from `claimDate`)
- Per quarter: sum `totalPayment` → `revenue`; count sessions (exclude add-on codes 90785, 96127, 96136); sum received (Status = Payment Received) → `income`
- Join with `Overhead!A:I` for each month in the quarter → sum `totalExpenses` (col E) → `quarterOverhead`
- `profit` = `income` − `quarterOverhead`; `marginPct` = `profit / income` (null if income = 0)
- If any month in the quarter has no Overhead entry, mark `marginPct` as `null` and surface a warning in the UI: "Overhead data missing for [month] — import from Xero to complete this quarter"

```typescript
export interface QuarterlySummary {
  year: number;
  quarter: 1 | 2 | 3 | 4;
  label: string;              // "Q1 2026"
  revenue: number;
  income: number;
  operationalOverhead: number;
  payrollOverhead: number;
  totalOverhead: number;
  profit: number;
  marginPct: number | null;
  sessions: number;
  byClinicianRevenue: Record<string, number>;
  byClinicianSessions: Record<string, number>;
}
```

**Chart:** Recharts `<BarChart>` — one group per quarter showing Revenue, Income, and Profit bars. Overlay margin % as a line on a secondary Y-axis.

---

### 2D. Quarterly Revenue Forecast Roll-up on Forecast Page

Add a collapsible summary card at the top of `/forecast`.

**Client-side computation (no new Worker endpoint):**
- Filter pending claims where `forecastWeek` falls within the current quarter
- Sum their expected `totalPayment`
- Display: `"Q2 2026 forecast: $X,XXX from N pending claims"`
- Sub-line: `"Includes N overdue claims (forecast date passed)"`

---

## Track 3 — Xero Import (Overhead & Net Income)

**Purpose:** Replace manual overhead entry entirely. Bruce downloads the monthly P&L from Xero and uploads it through the portal. The Worker parses it, extracts all expense line items and net income, and stores them. Once live, the Caseload Trends sheet no longer needs manual overhead maintenance.

**Primary workflow:** Download Excel P&L from Xero → upload in portal → review preview → confirm save. Manual editing remains available as a fallback for corrections.

---

### Xero Export Format (confirmed from `reporting/April_PL.xlsx`)

The Xero P&L Excel export has a fixed, consistent structure across months:

| Row | Col A | Col B |
|---|---|---|
| 1 | "Income Statement (Profit and Loss)" | — |
| 2 | Company name | — |
| 3 | "For the month ended [Month] [Day], [Year]" | — |
| 5 | "Account" | Period label (e.g. "Apr 2026") |
| 7 | "Income" (section header) | — |
| 8–N | Income line items | Amount |
| N+1 | "Total Income" | **formula cell → always 0 in raw XML; ignore** |
| — | "Gross Profit" | **formula cell → always 0; ignore** |
| — | "Operating Expenses" (section header) | — |
| — | Expense line items | Amount |
| — | "Total Operating Expenses" | **formula cell → always 0; ignore** |
| — | "Operating Income" | **formula cell → always 0; ignore** |
| — | "Other Income / (Expense)" (section header) | — |
| — | Other income items | Amount |
| — | "Net Income" | **formula cell → always 0; ignore** |

**Critical:** Xero does not cache formula results in the exported Excel file. All `Total` and subtotal rows resolve to `0` in the raw XML. The Worker **must compute all totals from individual line items** — never read the total rows.

**Known income accounts (April 2026 sample):**

| Account name | Type |
|---|---|
| Client Session Fees | Income |
| Insurance Overpayments | Income (may be negative — Xero accounting entries only) |
| Insurance Reimbursements | Income |

**Important:** The portal's revenue metrics (QTD cards, quarterly summary, dashboard) are always derived from the **Claims sheet** (`Total Payment` column), not from Xero income figures. The Claims sheet already reflects correct payment amounts — HHO overpayments and any other adjustments are handled there. Income lines parsed from the Xero import are stored for informational completeness and Net Income calculation only. The Worker must never substitute Xero income figures for Claims-derived revenue in any portal metric.

**Known expense accounts (April 2026 sample):**

| Account name | Category |
|---|---|
| Accounting Fees | Operational |
| Advertising | Operational |
| Compensation -  Clinicians | Payroll (note: two spaces before "Clinicians") |
| Compensation -  Officers | Payroll (note: two spaces before "Officers") |
| Dues & Licensure | Operational |
| EHR & Related Apps | Operational |
| Insurance - Workmans Comp | Operational |
| Marketing & Practice Promotions | Operational |
| Office Expense | Operational |
| Payroll Taxes -  Clinicians | Payroll (note: two spaces before "Clinicians") |
| Payroll Taxes -  Officers | Payroll (note: two spaces before "Officers") |
| Rent Expense | Operational |
| Software & Apps | Operational |
| Supplies | Operational |
| Telephone, Internet & Cable | Operational |

The double space in Compensation and Payroll Taxes account names is present in the actual export — match exactly when categorizing.

**Parser logic:**
1. Extract period from Row 3: parse "For the month ended April 30, 2026" → `2026-04-01`
2. Track current section as rows are read (`Income`, `Operating Expenses`, `Other Income / (Expense)`)
3. For each row: if Col A is a section header or a skip label → update section or skip; if Col A is non-empty and Col B is a parseable number → add to line items map
4. Skip labels (formula rows): `Total Income`, `Gross Profit`, `Total Operating Expenses`, `Operating Income`, `Total Other Income / (Expense)`, `Net Income`
5. Compute totals by summing line items per section
6. Classify expense line items into `payroll` (Compensation and Payroll Taxes accounts) vs `operational` (all others)
7. Compute: `netIncome = totalIncome - totalExpenses + totalOtherIncome`

---

### New Sheet Tab: `Overhead`

| Column | Field | Notes |
|---|---|---|
| A | Month | First day of month (M/D/YYYY) |
| B | Total Income | From Xero |
| C | Payroll Expenses | Compensation + Payroll Tax lines |
| D | Operational Expenses | All non-payroll expense lines |
| E | Total Expenses | Payroll + Operational |
| F | Net Income | Stored for future Distribution Calculator use |
| G | Line Items JSON | Full line-item breakdown stored as JSON string |
| H | Import Source | `xero-import` or `manual` |
| I | Notes | Optional |

---

### New Worker Endpoints

```
GET  /api/overhead
     Reads Overhead!A:I, returns all entries sorted ascending by month.

POST /api/overhead/import
     Accepts: multipart/form-data with file field containing .xlsx
     Parses the Xero P&L Excel using the format above.
     Returns: XeroImportPreview (does NOT save — preview only).

POST /api/overhead
     Body: XeroImportPreview (confirmed by user) or manual OverheadEntry
     Appends or updates the matching month row in Overhead sheet.
     Returns: saved OverheadEntry.

PUT  /api/overhead/:month
     Body: partial OverheadEntry fields
     Updates the row matching the given month (YYYY-MM-DD).
     Returns: updated OverheadEntry.
```

```typescript
export interface OverheadLineItem {
  account: string;
  amount: number;
  category: 'income' | 'payroll' | 'operational' | 'other';
}

export interface XeroImportPreview {
  month: string;                    // ISO date — first of month
  periodLabel: string;              // e.g. "April 2026"
  totalIncome: number;
  payrollExpenses: number;
  operationalExpenses: number;
  totalExpenses: number;
  netIncome: number;
  lineItems: OverheadLineItem[];    // full breakdown for display in preview
}

export interface OverheadEntry {
  month: string;
  totalIncome: number;
  payrollExpenses: number;
  operationalExpenses: number;
  totalExpenses: number;
  netIncome: number;
  lineItems: OverheadLineItem[];
  importSource: 'xero-import' | 'manual';
  notes: string;
}
```

**Note on Worker bundle size:** SheetJS (xlsx) is the recommended library for parsing the `.xlsx` upload. Verify the compiled Worker bundle stays within Cloudflare's size limits before finalising this approach. If SheetJS causes a size problem, the fallback is to accept a Google Sheets export instead: Bruce exports Xero P&L to Google Sheets, copies the tab into the Claim Tracking workbook as `Xero_Import`, and the Worker reads it via the existing Sheets API — no new library needed.

---

### Overhead Page UI

**Route:** `/overhead`  
**Nav item:** Add "Overhead" to Sidebar (under Analytics, above Pay Periods)  
**New files:** `src/pages/Overhead.tsx`, `src/hooks/useOverhead.ts`

**Layout — top section (Import):**
- File drop zone: "Upload Xero P&L Export (.xlsx)"
- On file selection: POST to `/api/overhead/import` → display `XeroImportPreview`
- Preview shows: period label, total income, payroll expenses, operational expenses, net income, and a collapsible line-item table
- "Confirm & Save" button → POST to `/api/overhead` with the previewed data
- If the month already has an entry, show a warning: "This will overwrite the existing entry for [month]"

**Layout — bottom section (History):**
- Table of saved entries: Month | Total Income | Payroll Expenses | Operational Expenses | Net Income | Source | Edit
- Last 6 months shown by default; "Show all" toggle reveals older records
- Each row has an Edit button that opens a manual override form (for corrections)
- Import Source badge: green "Xero Import" or gray "Manual"

---

## Track 4 — Pay Period Summary

**Route:** `/pay-periods`  
**Nav item:** Add "Pay Periods" to Sidebar (below Claims, above Forecast)  
**New files:** `src/pages/PayPeriodSummary.tsx`, `src/hooks/usePayPeriodSummary.ts`

**Purpose:** A per-period payroll reference page for cross-checking against Gusto before approving a run. The portal computes all figures from Claims data + Staff compensation rates. This replaces the manual Emily Payment Analysis spreadsheet — once live, that sheet no longer needs active maintenance.

---

### ⚠️ Two Schedules, Two Compensation Models

The `Pay Periods` sheet has two side-by-side schedule columns confirmed by direct inspection:

| Clinician type | Who | Sheet columns | Cadence |
|---|---|---|---|
| **Partners** | Shannon, Jen | **Cols A–C** ("Salaried Pay Periods") | Roughly monthly |
| **W-2** | Emily | **Cols D–F** ("Hourly Pay Periods") | Semi-monthly (1st–15th, 16th–EOM) |

These schedules run on different cadences and do not share rows. Never conflate them.

**Partner compensation** has two distinct components:
1. **Salary** — fixed annual amount ($70k/year each), paid through regular Gusto payroll on the Salaried Pay Period schedule. This is what the Pay Period Summary covers.
2. **Quarterly distributions** — variable, calculated from net income. Out of scope for Phase 4; addressed in a future phase.

**Emily's compensation** is fully computed from Staff rates (session rate + admin hourly rate) × activity (sessions from Claims + admin hours entered per period). See Track 5 for rate storage.

---

### Admin Hours Input

Emily's admin hours per period must be entered by Bruce when reviewing her pay period. The Pay Period Summary page for Emily includes an editable "Admin Hours" field. On save, the portal stores this in a new `Payroll_Records` sheet tab (or extends `Emily Payment Analysis` if preferred — but a new clean tab is recommended). The portal then displays the computed pay breakdown (session pay, admin pay, bonus if applicable, overhead allocation, profit, margin).

**New sheet tab:** `Payroll_Records`

| Column | Field |
|---|---|
| A | Period Start |
| B | Period End |
| C | Pay Date |
| D | Clinician |
| E | Claim Count |
| F | Revenue |
| G | Payments Received |
| H | Pct Received by Pay Date |
| I | Sessions |
| J | Admin Hours (Emily only) |
| K | Session Pay (computed) |
| L | Admin Pay (computed) |
| M | Bonus Pay (manual, optional) |
| N | Total Pay |
| O | Notes |

---

### New Worker Endpoints

```
GET /api/pay-periods/list
    Reads Pay Periods!A:F (both columns A–C and D–F)
    Returns: { salaryPeriods: PayPeriod[], hourlyPeriods: PayPeriod[] }

GET /api/pay-periods/summary?type=salary&periodStart=YYYY-MM-DD
    Reads Claims filtered to period; reads Staff for salary amounts.
    Returns: PartnerPayPeriodSummary

GET /api/pay-periods/summary?type=hourly&periodStart=YYYY-MM-DD
    Reads Claims filtered to period; reads Staff for rates;
    reads Payroll_Records for any saved admin hours / bonus.
    Returns: EmilyPayPeriodSummary

PUT /api/pay-periods/record
    Body: { periodStart, clinician, adminHours?, bonusPay?, notes? }
    Writes/updates the matching row in Payroll_Records sheet.
    Returns: updated record with recomputed pay figures.
```

```typescript
export interface PayPeriod {
  periodStart: string;
  periodEnd: string;
  payDate: string;
}

export interface PartnerPeriodSummary {
  clinician: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  sessions: number;
  revenue: number;
  receivedRevenue: number;
  pendingRevenue: number;
  // Salary is a fixed figure read from Staff — display as reference only
  annualSalary: number;
  periodSalary: number;   // annualSalary / payPeriodsPerYear for this period length
}

export interface EmilyPayPeriodSummary {
  periodStart: string;
  periodEnd: string;
  payDate: string;
  claimCount: number;
  sessions: number;
  revenue: number;
  paymentsReceived: number;
  pctReceivedByPayDate: number;
  unreceivedPayments: number;
  // Compensation (computed from Staff rates)
  sessionRate: number;
  sessionPay: number;
  adminHourlyRate: number;
  adminHours: number;      // from Payroll_Records (editable)
  adminPay: number;
  bonusPay: number;        // from Payroll_Records (editable)
  totalPay: number;
  // Period economics
  profit: number;          // revenue - totalPay - allocated overhead
  profitMargin: number;
}
```

---

### UI Layout

Two tabs at the top of the page: **Partner Payroll** and **Emily Payroll**.

Each tab has its own period selector (dropdown of the relevant schedule's pay periods), defaulting to the most recent complete period.

**Partner Payroll tab:** Side-by-side cards for Shannon and Jen. Each card shows: sessions this period, revenue generated, received vs. pending breakdown, and the period salary as a reference figure. Footer note: *"Salary component only — quarterly distributions are tracked separately."*

**Emily Payroll tab:** Single card with full breakdown — sessions, revenue, received/unreceived, session pay, admin hours input field, admin pay, bonus field, total pay, profit, margin. A small sparkline of the last 4 periods' profit margin appears in the card header.

Both tabs include a **"Copy summary"** button that copies a plain-text Gusto-ready summary to clipboard.

Persistent subtitle on the page: *"Revenue generated this period — reference only, not a payroll calculation."*

---

## Track 5 — Staff Section

**Route:** `/staff`  
**Nav item:** Add "Staff" to Sidebar (at the bottom, above any future settings link)  
**New files:** `src/pages/Staff.tsx`, `src/pages/StaffDetail.tsx`, `src/hooks/useStaff.ts`

**Purpose:** Centralized employee profile and compensation configuration. This is the authoritative source for pay rates used by the Pay Period Summary and quarterly payroll overhead calculations. Designed with extensibility in mind — credentialing detail and payer enrollment tracking will be added as Phase 5 features on top of this foundation.

---

### New Sheet Tab: `Staff`

| Column | Field | Notes |
|---|---|---|
| A | Staff ID | Short slug (e.g. `shannon`, `jen`, `emily`) |
| B | Full Name | |
| C | Role | `partner` or `w2` |
| D | NPI | Individual NPI number |
| E | License Type | e.g. `LPCMH`, `LCSW`, `LCSW CCTP` |
| F | License Number | |
| G | License State | e.g. `DE` |
| H | License Expiration | M/D/YYYY |
| I | Hire Date | M/D/YYYY |
| J | Compensation Type | `salary` or `session-rate` |
| K | Annual Salary | For partners; blank for W-2 |
| L | Session Rate | For W-2; blank for partners |
| M | Admin Hourly Rate | For W-2; blank for partners |
| N | Active | `TRUE` / `FALSE` |
| O | Notes | Free text |

Seed this sheet with the three current clinicians on first deployment.

---

### New Worker Endpoints

```
GET /api/staff
    Returns all active staff records.

GET /api/staff/:id
    Returns a single staff record.

POST /api/staff
    Body: full staff fields (see schema)
    Appends new row to Staff sheet.

PUT /api/staff/:id
    Body: any updatable staff fields
    Updates the matching row.
```

```typescript
export interface StaffMember {
  id: string;
  name: string;
  role: 'partner' | 'w2';
  npi: string;
  licenseType: string;
  licenseNumber: string;
  licenseState: string;
  licenseExpiration: string | null;   // ISO date
  hireDate: string;                   // ISO date
  compensationType: 'salary' | 'session-rate';
  annualSalary: number | null;        // partners only
  sessionRate: number | null;         // W-2 only
  adminHourlyRate: number | null;     // W-2 only
  active: boolean;
  notes: string;
}
```

---

### UI Layout

**Staff list page (`/staff`):** Simple table — Name, Role, License Type, License Expiration, Compensation Type. Each row links to the detail page. An "Add Staff" button opens the edit form.

**Staff detail page (`/staff/:id`):** Two-panel layout.

*Left panel — Profile:*
- Name, role badge (Partner / W-2), NPI, hire date
- License: type, number, state, expiration date
  - If expiration is within 90 days: amber warning badge
  - If expired: red badge

*Right panel — Compensation:*
- For partners: Annual Salary field (reference only — used to compute period salary on Pay Period Summary)
- For W-2: Session Rate and Admin Hourly Rate fields (editable — these feed Pay Period Summary calculations)
- Save button writes changes back to Staff sheet

**Important:** Compensation figures on this page feed live computations. A change to Emily's session rate will be reflected the next time the Pay Period Summary loads. Display a note: *"Rates are used in payroll calculations. Changes take effect on the next pay period load."*

**Phase 5 extension note (for Claude Code awareness):** The Staff detail page will gain a third panel — Credentialing — in a future phase. This panel will show payer enrollment status (per payer), revalidation dates, and alerts. The data model above is designed to accommodate this without structural changes; a new `Credentialing` sheet tab will be added at that time with rows keyed on `staffId` + `payer`.

---

## Track 6 — Payer Performance

Add a new section to the Analytics page: **Payer Performance**.

**Worker endpoint:**
```
GET /api/analytics/payer-performance
Aggregates from Claims!A:Y only — no Dashboard sheet reads.
Returns: PayerPerformance[] sorted by totalClaims descending.
```

**Computation:**
- Per payer: count all claims, mean of `lagDays` (Status = Payment Received, lagDays > 0), sum received insurance / sum billed insurance → collection rate, count Pending claims, max days since `claimDate` among Pending

```typescript
export interface PayerPerformance {
  payer: string;
  totalClaims: number;
  avgDaysToPay: number | null;
  collectionRate: number | null;    // 0.0–1.0
  pendingCount: number;
  oldestPendingDays: number | null;
}
```

**Display:** Sortable table. Highlight `oldestPendingDays >= 90` in error red. Highlight `collectionRate < 0.80` in amber.

---

## Track 7 — Saved Filter Presets

Add a "Save filter" affordance to the Claims filter bar.

- When any non-default filter is active, show a `+ Save` button next to the filter bar
- On click: prompt for a preset name (inline text input, not a modal)
- Saved presets appear as pill buttons above the filter bar; click to apply instantly
- Each preset has an `×` to delete
- Stored in `localStorage` under key `claimsFilterPresets` as `Array<{ name: string, params: string }>`
- Max 8 presets

No backend changes needed.

---

## New Sheet Tabs Summary

| Tab name | Purpose | Created by |
|---|---|---|
| `Staff` | Employee profiles and pay rates | Seeded on first Staff page load (or manually before deployment) |
| `Overhead` | Monthly operational overhead entries | Created by portal on first Overhead entry |
| `Payroll_Records` | Per-period payroll computation records (Emily admin hours, bonus) | Created by portal on first Pay Period save |

---

## File Changes Summary

### New files
```
src/components/ui/Skeleton.tsx
src/components/ui/Toast.tsx
src/context/ToastContext.tsx
src/hooks/useDateWindow.ts
src/hooks/useOverhead.ts
src/hooks/usePayPeriodSummary.ts
src/hooks/usePayerPerformance.ts
src/hooks/useQuarterlySummary.ts
src/hooks/useStaff.ts
src/pages/Overhead.tsx
src/pages/PayPeriodSummary.tsx
src/pages/Staff.tsx
src/pages/StaffDetail.tsx
```

### Modified files
```
index.html                              — Fraunces font link
src/index.css                           — @theme heading font token
src/App.tsx                             — +/overhead, /pay-periods, /staff, /staff/:id routes
src/types/index.ts                      — +DateWindow, +QuarterlySummary, +OverheadEntry,
                                           +PayPeriod, +PartnerPeriodSummary,
                                           +EmilyPayPeriodSummary, +PayerPerformance,
                                           +StaffMember
src/lib/api.ts                          — +overhead.*, +payPeriods.*, +staff.*,
                                           +analytics.quarterlySummary,
                                           +analytics.payerPerformance
src/components/layout/AppShell.tsx      — mount ToastContainer
src/components/layout/Sidebar.tsx       — +Overhead, +Pay Periods, +Staff nav items
src/pages/Dashboard.tsx                 — +DateWindow selector, +QTD cards with delta badges
src/pages/Analytics.tsx                 — +Quarterly Performance section (2C),
                                           +Payer Performance section (Track 6)
src/pages/Forecast.tsx                  — +Quarterly forecast roll-up banner (2D)
src/components/claims/ClaimsTable.tsx   — +density toggle (1D)
src/components/claims/ClaimsFilters.tsx — +saved filter presets (Track 7)
```

### Worker (`clarity-admin-api/src/index.ts`)
```
New endpoints:
  GET  /api/overhead
  POST /api/overhead/import      (parse uploaded .xlsx, return preview — does not save)
  POST /api/overhead             (save confirmed import or manual entry)
  PUT  /api/overhead/:month
  GET  /api/pay-periods/list
  GET  /api/pay-periods/summary
  PUT  /api/pay-periods/record
  GET  /api/staff
  GET  /api/staff/:id
  POST /api/staff
  PUT  /api/staff/:id
  GET  /api/analytics/quarterly-summary
  GET  /api/analytics/payer-performance

Modified endpoints:
  GET  /api/dashboard   — +from/to params, +priorPeriod in response
```

All new endpoints must be added to the CORS handling block.

---

## Sequencing Recommendation

1. **Track 5 first** (Staff section + new `Staff` sheet tab) — pay rates stored here are a dependency for Track 4 computations. Seed the sheet with existing clinician records before any pay period work begins.

2. **Track 3** (Overhead entry + `Overhead` sheet tab) — needed before quarterly margin figures are meaningful. Can be developed in parallel with Track 5.

3. **Track 2A** (date windowing extension to `/api/dashboard`) — prerequisite for QTD cards. Develop in parallel with Tracks 3 and 5.

4. **Tracks 1, 2B, 2C, 2D, 6** — once Tracks 2A, 3, and 5 are merged; most of these can be parallelized.

5. **Track 4** (Pay Period Summary) — last, as it depends on both Staff (rates) and the `Payroll_Records` sheet.

6. **Track 7** (saved filters) — lowest priority; slot into any sprint gap.

---

## Implementation Notes

- All new Worker endpoints must be added to the CORS allow block.
- All TypeScript types belong in `src/types/index.ts` — do not scatter into component files.
- The `num()` / `numNull()` currency-string helpers must be used for all financial reads from any sheet. Do not re-implement inline.
- Do not use `any` types — all API responses must be typed against the interfaces above.
- The Worker must not log PHI or compensation figures to Cloudflare logging.
- Do not read pre-computed values from the Dashboard, Emily Payment Analysis, or Distribution Calculator sheet tabs. Those sheets are legacy references only. All metrics in Phase 4 are derived from raw data (Claims, Staff, Overhead, Pay Periods, Payroll_Records).
