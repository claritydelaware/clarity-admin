# Clarity Admin — Phase 3 Implementation Spec

**Date drafted:** 2026-05-24  
**Builds on:** Phase 2.5 (Forecast Payment Date Rebuild) — Worker version `ac26ecb4`

This document is a feature specification for Phase 3. It is intentionally not a step-by-step recipe — you have the full codebase context and should make implementation decisions that fit the existing architecture. The goal here is to define *what* to build and *why*, with enough detail on data shape and business logic to avoid ambiguity.

---

## Features in Scope

1. **Inline cell editing on the Claims table**
2. **Analytics page** (powered by the Caseload Trends sheet)
3. **Capacity utilization alert on the Dashboard**
4. **Forecast accuracy view** appended to the existing Forecast page

Distribution Log / Distribution Calculator are explicitly out of scope for Phase 3.

---

## Feature 1: Inline Cell Editing

### Goal
Allow editing of individual claim fields directly from the Claims table row, without navigating to the full `/claims/:rowIndex/edit` form. The full edit form should remain for comprehensive multi-field edits.

### Fields that should support inline editing
These are the fields most frequently corrected after initial entry:

| Field | Input type | Notes |
|---|---|---|
| Notes | Text input | Free text; most common inline edit |
| Insurance Amount | Number input | Frequently updated when EOB arrives |
| Client Amount | Number input | Triggers Stripe fee recalc (see below) |
| Service Code | Select | Constrained to known CPT codes |
| Submission Method | Select | `Manual / Electronic / Cash / Secondary` |
| Payment Date Received | Date input | Only relevant when Status = Payment Received |

**Status is explicitly excluded** — it already has the `StatusUpdateModal` with enforced business rules (payment date + amount validation). Do not replace or bypass that flow.

### Interaction pattern
- Click a field cell → it becomes an editable input in place (the cell width should not jump)
- **Blur** or **Enter** → optimistic update, PATCH to worker, revalidate
- **Escape** → revert to original value, no request sent
- Show a subtle loading indicator (e.g. spinner or opacity change) during the in-flight request
- On error: revert to original, show a small inline error message
- Mobile card layout: tapping the field label should open a small modal with the input, since the tap-to-expand card doesn't have room for inline inputs

### Worker changes
The existing `PUT /api/claims/:rowIndex` endpoint (full edit) already handles most fields. Evaluate whether a lightweight `PATCH /api/claims/:rowIndex` endpoint makes more sense for single-field updates, or whether reusing the full `PUT` with a partial body is cleaner. Either approach is acceptable — just be consistent.

If Client Amount is edited inline, the Worker must recalculate Stripe Fees, True Client Amount, and Total Payment, exactly as it does in the full edit flow. Don't skip these derived fields for inline edits.

---

## Feature 2: Analytics Page

### Goal
A new `/analytics` route that surfaces monthly financial and productivity data from the Caseload Trends sheet. This is the primary new page in Phase 3 and should be added to the Sidebar navigation.

### Data source: Caseload Trends sheet
The sheet has one row per month. The exported column layout (as of 2026-05-24) is:

```
A:  Month (date — first of month)
B:  Emily Sessions
C:  Shannon Sessions
D:  Jen Sessions
E:  Total Sessions
F:  Emily Clients
G:  Shannon Clients
H:  Jen Clients
I:  Total Clients
J:  Emily 90837 Total
K:  Emily 90837 %
L:  Jen 90837 Total
M:  Jen 90837 %
N:  Shannon 90837 Total
O:  Shannon 90837 %
P:  Total 90837 %
Q:  Emily Avg/Wk
R:  Shannon Avg/Wk
S:  Jen Avg/Wk
T:  Total Avg/Wk
U:  Emily Util %
V:  Shannon Util %
W:  Jen Util %
X:  Total Util %
Y:  Emily Revenue
Z:  Shannon Revenue
AA: Jen Revenue
AB: Total Revenue
AC: Revenue Per Session
AD: Payroll Costs
AE: Operational Overhead
AF: Total Overhead
AG: Gross Margin
AH: Gross Margin %
AI: Income
AJ: Income Margin
AK: Income Margin %
AL: Collection Variance  (Revenue − Income; negative = over-collected, positive = under-collected)
AM: Start Date
AN: End Date
AO: Weeks
```

**Important:** Early months (Aug–Sep 2025) have sparse data for Emily because she hadn't started yet. Handle nulls gracefully — don't let a null session count break a chart or calculation. Emily's start date is February 16, 2026.

### New Worker endpoint
```
GET /api/analytics/caseload-trends
```
Returns the full Caseload Trends sheet as a typed array of monthly objects. Filter out rows where Month is null. Return months in ascending order. The sheet currently has ~10 months of data (Aug 2025 – May 2026) and will grow monthly.

Suggested response shape:
```typescript
interface CaseloadTrendMonth {
  month: string;           // ISO date string, first of month
  emilySessions: number | null;
  shannonSessions: number | null;
  jenSessions: number | null;
  totalSessions: number | null;
  emilyClients: number | null;
  shannonClients: number | null;
  jenClients: number | null;
  totalClients: number | null;
  emilyAvgPerWeek: number | null;
  shannonAvgPerWeek: number | null;
  jenAvgPerWeek: number | null;
  totalAvgPerWeek: number | null;
  emilyUtilPct: number | null;      // already computed in sheet as decimal (0.85 = 85%)
  shannonUtilPct: number | null;
  jenUtilPct: number | null;
  totalUtilPct: number | null;
  emilyRevenue: number | null;
  shannonRevenue: number | null;
  jenRevenue: number | null;
  totalRevenue: number | null;
  revenuePerSession: number | null;
  payrollCosts: number | null;
  operationalOverhead: number | null;
  totalOverhead: number | null;
  grossMargin: number | null;
  grossMarginPct: number | null;    // decimal
  income: number | null;
  incomePct: number | null;         // decimal
  collectionVariance: number | null;
  weeks: number | null;
}
```

### Page layout and sections

The Analytics page should be organized into four sections. Use the same design language as the Dashboard — metric cards, Recharts charts, cream background, white card panels.

#### Section 1: Financial Performance (primary section)
A line or area chart showing the last 12 months (or all available data) of:
- Total Revenue (billed)
- Income (actually received)
- Total Overhead (costs)
- Gross Margin

These four lines together show the full financial picture at a glance. Revenue and Income diverging is a collection efficiency signal.

Below the chart, a small summary row of metric cards for the most recent complete month:
- Total Revenue
- Income
- Gross Margin ($ and %)
- Collection Variance (styled red if negative, i.e. collecting less than billed)

#### Section 2: Clinician Productivity
A grouped bar chart (one group per month, one bar per clinician) showing sessions per clinician over the last 6 months. Emily's bars should be visually distinguishable.

Below it, a small table showing the most recent month's per-clinician metrics:
| Clinician | Sessions | Clients | Avg/Wk | Util % | Revenue |
Each Util % cell should be colored: ≥90% = amber, ≥100% = red (over-capacity).

#### Section 3: Revenue Per Session Trend
A simple line chart. This is a payer mix and rate integrity signal — if it drifts downward, the mix is shifting toward lower-reimbursing payers or rates have been reduced. No additional explanation needed in the UI; the trend speaks for itself.

#### Section 4: Collection Efficiency
A bar chart showing Collection Variance by month (positive = over-collected vs billed, negative = under). Include a zero baseline. Months where variance exceeds ±$2,000 should render in a highlight color.

---

## Feature 3: Capacity Utilization Alert on the Dashboard

### Goal
Surface a warning on the existing Dashboard when any clinician's trailing utilization indicates they are approaching or exceeding sustainable capacity.

### Business logic — utilization targets
Weekly session targets (anchor for all utilization calculations):
- **Emily:** 10 sessions/week
- **Shannon:** 25 sessions/week
- **Jen:** 25 sessions/week

Utilization % = Avg sessions per week ÷ weekly target. This is already computed in the Caseload Trends sheet, but the Dashboard can derive it from the same data if it calls the new `/api/analytics/caseload-trends` endpoint, or you can compute it from the Avg/Wk columns directly.

### Alert logic
Using the two most recent complete months of Caseload Trends data:
- If a clinician's average utilization over those two months is **≥ 95%**, show a yellow warning
- If **≥ 100%** (consistently over-capacity), show a red warning

Display the alert as a banner or highlighted card near the top of the Dashboard, above the metric cards. The alert should name the clinician specifically (e.g., "Shannon has been at 97% utilization over the last 2 months — consider capacity planning."). If all clinicians are below 95%, no alert is shown and no empty space should be reserved.

Do not pull a separate API call just for this — reuse the caseload trends data if the Dashboard is already fetching it, or add it to the `useDashboard` hook / a shared hook that both pages can consume.

---

## Feature 4: Forecast Accuracy View

### Goal
Extend the existing `/forecast` page with a secondary section showing historical forecast accuracy — how well the payment forecasts have tracked against actual receipts week by week.

### Data source: Actual vs Forecast sheet
The sheet has weekly rows with columns:
- Week Start (Sunday date)
- Forecast ($)
- Actual ($)
- Difference (Actual − Forecast; positive = over-forecast)
- Cumulative (running sum of Difference)

Rows where Actual is 0 or null represent weeks that haven't settled yet — exclude them from accuracy calculations but you may display them as "pending" in the table.

### New Worker endpoint
```
GET /api/analytics/forecast-accuracy
```
Returns the Actual vs Forecast sheet as a typed array. Filter out rows where both Forecast and Actual are null. Return in ascending date order.

Suggested response shape:
```typescript
interface ForecastAccuracyWeek {
  weekStart: string;      // ISO date string
  forecast: number | null;
  actual: number | null;
  difference: number | null;    // actual - forecast
  cumulative: number | null;
}
```

### UI placement
Add a collapsible or tabbed "Forecast Accuracy" section at the bottom of the `/forecast` page (below the existing pending claims week groups). It should not displace the primary forecast content.

Display:
1. A summary stat: average weekly accuracy % across settled weeks — defined as `mean(1 - |difference| / forecast)` for rows where both values are non-null and forecast > 0. Display as "X% average accuracy."
2. A line chart: Forecast vs. Actual by week (last 12 weeks of settled data), two lines.
3. A small table of the last 8 settled weeks: Week | Forecast | Actual | Difference — with Difference colored green (positive, over-collected) or red (negative, under-collected).

---

## Sidebar Navigation

Add the Analytics page to the Sidebar. Suggested placement: between Dashboard and Claims. Use a `BarChart2` or `TrendingUp` icon from Lucide React. Label: "Analytics."

---

## Types to add (`src/types/index.ts`)

```typescript
export interface CaseloadTrendMonth {
  month: string;
  emilySessions: number | null;
  shannonSessions: number | null;
  jenSessions: number | null;
  totalSessions: number | null;
  emilyClients: number | null;
  shannonClients: number | null;
  jenClients: number | null;
  totalClients: number | null;
  emilyAvgPerWeek: number | null;
  shannonAvgPerWeek: number | null;
  jenAvgPerWeek: number | null;
  totalAvgPerWeek: number | null;
  emilyUtilPct: number | null;
  shannonUtilPct: number | null;
  jenUtilPct: number | null;
  totalUtilPct: number | null;
  emilyRevenue: number | null;
  shannonRevenue: number | null;
  jenRevenue: number | null;
  totalRevenue: number | null;
  revenuePerSession: number | null;
  payrollCosts: number | null;
  operationalOverhead: number | null;
  totalOverhead: number | null;
  grossMargin: number | null;
  grossMarginPct: number | null;
  income: number | null;
  incomePct: number | null;
  collectionVariance: number | null;
  weeks: number | null;
}

export interface ForecastAccuracyWeek {
  weekStart: string;
  forecast: number | null;
  actual: number | null;
  difference: number | null;
  cumulative: number | null;
}
```

---

## File changes expected

### clarity-admin-api (Worker)
- New route: `GET /api/analytics/caseload-trends`
- New route: `GET /api/analytics/forecast-accuracy`
- Optional: `PATCH /api/claims/:rowIndex` for single-field inline updates (or reuse `PUT` — your call)
- Update CORS preflight handling if adding PATCH method

### clarity-admin (React app)
- `src/types/index.ts` — add `CaseloadTrendMonth`, `ForecastAccuracyWeek`
- `src/lib/api.ts` — add `analytics.caseloadTrends()`, `analytics.forecastAccuracy()`
- `src/hooks/useAnalytics.ts` — new hook(s) for the two analytics endpoints
- `src/pages/Analytics.tsx` — new page
- `src/pages/Forecast.tsx` — extend with accuracy section
- `src/pages/Dashboard.tsx` — add capacity alert
- `src/components/claims/ClaimsTable.tsx` — inline editing
- `src/components/layout/Sidebar.tsx` — Analytics nav item
- `src/App.tsx` — add `/analytics` route

---

## Design and UX notes

- Utilization percentages in the Caseload Trends sheet are stored as decimals (0.85 = 85%). Multiply by 100 before displaying.
- The early months (Aug–Sep 2025) have null values for Emily — charts should handle sparse series gracefully (skip the point rather than rendering zero or NaN).
- Keep the Analytics page information-dense but not overwhelming. If in doubt, lead with the Financial Performance section and let the others follow beneath it.
- The capacity alert on the Dashboard should be dismissible within the session (useState, not persisted) — it's a heads-up, not a blocking error.
- All currency values should be formatted with `$` and two decimal places consistent with the rest of the app.
- Recharts is already in the dependency tree — use it for all charts on the Analytics page for consistency.
