# Clarity Admin Portal — Changelog

Full development history by phase. For current feature inventory and implementation gotchas, see `CLAUDE.md` and `DECISIONS.md`.

---

## Phase 13 — ApexCharts Migration & Dashboard Visual Refresh ✅ Complete

**Scope:** `Dashboard.tsx`, `Analytics.tsx`, `PayPeriodSummary.tsx`, `package.json` — no Worker changes, no API changes, no type changes.

### Chart migration (Recharts → react-apexcharts)
- **Dashboard:** Revenue Trend AreaChart → ApexCharts area; Payer Mix BarChart → ApexCharts bar with `distributed: true` for per-bar color mapping via `getPayerStyle()`
- **Analytics:** Financial Performance mixed AreaChart+Line → ApexCharts `type: 'line'` chart with per-series type overrides (`area`/`line`); Clinician Sessions grouped BarChart → ApexCharts grouped bar; Revenue Per Session LineChart → ApexCharts line; Collection Variance BarChart → ApexCharts bar with `distributed: true`; Quarterly ComposedChart → ApexCharts dual-axis bar+line with `yaxis` array
- **PayPeriodSummary:** Emily sparkline LineChart → ApexCharts native sparkline mode (`sparkline: { enabled: true }`)
- `recharts` uninstalled after full visual verification

### Visual refresh (6 patterns from template)
- **Metric card chrome:** Removed gold `border-t-2` accent; label uses `tracking-wider`; value row uses `flex items-center justify-between` to flush delta badge right
- **Utilization bars:** Slimmed from `h-2` to `h-1.5`; per-clinician color fill retained (teal/gold/teal-mid)
- **Chart card headers:** Each chart card now has a structured `flex items-center justify-between px-5 pt-4 pb-3` header row with title left-aligned
- **Aging table:** Converted from `<table>` to `divide-y divide-gray-200` grid with `grid-cols-3` row layout and consistent `px-4/px-5` cell padding

---

## Phase 1A — Infrastructure ✅ Complete

| Step | Task | Status |
|---|---|---|
| 1 | Google Cloud project created, Sheets API enabled, service account created | ✅ Done |
| 1 | Service account JSON key downloaded (org policy override applied: `iam.disableServiceAccountKeyCreation` → Off) | ✅ Done — key stored securely offline only |
| 2 | Google Sheets workbook shared with service account email (Editor access) | ✅ Done |
| 3 | GitHub repo `clarity-admin` created, cloned locally | ✅ Done |
| 3.5 | Vite + React + TypeScript scaffolded, dependencies installed, pushed to GitHub | ✅ Done |
| 4 | Cloudflare Pages project connected to GitHub repo | ✅ Done |
| 5 | Cloudflare Access application configured | ✅ Done |
| 6 | Cloudflare Worker `clarity-admin-api` deployed; `GOOGLE_SERVICE_ACCOUNT_KEY` and `SPREADSHEET_ID` secrets configured | ✅ Done |
| 7 | DNS CNAME record: `admin` → `*.pages.dev` | ⏸ Deferred — waiting on DNS migration to Cloudflare |

---

## Phase 1B — App Scaffolding ✅ Complete

- Types (`src/types/index.ts`): `Claim`, `PayPeriod`, `CaseloadEntry`, `DashboardData` interfaces
- API client (`src/lib/api.ts`): typed fetch wrappers for all Worker endpoints
- AppShell, Sidebar (white/light theme), Topbar layout components
- React Router v7 routes: `/` → `/dashboard`, `/dashboard`, `/claims`, `/claims/new`
- TanStack Query provider with `staleTime: 5min`, `retry: 2`
- Vite dev proxy: `/api/*` → `https://clarity-admin-api.bruce-5f2.workers.dev`

---

## Phase 1C — Claims Module ✅ Complete

- `ClaimsFilters` — all dropdowns + date range; filter state persisted in URL params
- `ClaimsTable` — desktop table (sortable by date/clinician/total, paginated 50 rows) + mobile tap-to-expand card layout
- `StatusUpdateModal` — click any status badge to update; enforces payment date + amount when marking Payment Received
- `NewClaim` form — all 11 fields; client ID autocomplete from Caseloads sheet; live Stripe fee preview; business rule warnings (HHO no-show, discontinued codes)
- `useClaims` / `useUpdateClaim` / `useCreateClaim` hooks (TanStack Query)

---

## Phase 1D — Dashboard Module ✅ Complete

- Metric cards: Sessions, Revenue, Pending, Received this month
- Utilization progress bars per clinician vs weekly targets
- Revenue trend line chart (6 months, total)
- Payer mix bar chart (current month)
- Pending claims aging table (0–30, 31–60, 61–90, 90+ days; 90+ highlighted red)
- `useDashboard` hook

---

## Phase 2 — Full Edit + Search + Forecast + Backup ✅ Complete (2026-05-24)

**Worker version deployed:** `149413a6-431c-4fbf-b65e-02f5f5846879`

| Feature | Details |
|---|---|
| Full Claim Edit | `EditClaim.tsx` at `/claims/:rowIndex/edit`; all 11 fields; `useClaim` + `useEffect+reset()` + `!isDirty` guard |
| Claim Search | Search input in `ClaimsFilters`; client-side filter on `claimId` + `notes`; `search` param stripped before API call |
| Revenue Forecast | `Forecast.tsx` at `/forecast`; pending claims grouped by `forecastWeek` ascending; overdue highlighted red/amber |
| CSV Export | "Export CSV" button in Claims header; `api.claims.exportRaw()` → `downloadCsv()` with quote-escaping |
| Automated Backup | Worker Cron `0 6 * * 1` (Monday 6 AM UTC); creates `Snapshot_YYYY-MM-DD` tab via `batchUpdate+addSheet` |

**New Worker endpoints:**
- `GET /api/claims/:rowIndex` — single-row fetch
- `PUT /api/claims/:rowIndex` — extended: full field edit + date/forecast recalculation when `claimDate` or `insurance` changes
- `GET /api/export/claims` — returns full `string[][]` including header row

---

## Phase 2.5 — Forecast Payment Date Rebuild ✅ Complete (2026-05-24)

**Worker version deployed:** `ac26ecb4-816c-4aec-ab84-2ddd6897f2ca`

| Feature | Details |
|---|---|
| 3-tier recency-weighted forecast | Client+payer (≥3 claims) → payer-wide → 30-day fallback; recency weights: ≤90d=1.0, 91-180d=0.5, >180d=0.25 |
| Payment-day snap | Aetna → Tuesday, BCBS → Wednesday; applied in all tiers including fallback |
| Batch recalculate endpoint | `POST /api/maintenance/recalculate-forecasts`; rewrites columns V+W for Pending claims only |
| Recalculate button | Forecast page header; triggers batch recalculate + auto-refreshes the week groups |
| Vitest unit tests | `src/forecast-helpers.test.ts`; 22 test cases for pure functions; `npm test` |

**New Worker file:** `clarity-admin-api/src/forecast-helpers.ts` — pure business logic (exported for testability)

---

## Phase 3 — Analytics, Inline Editing, Capacity Alerts, Forecast Accuracy ✅ Complete (2026-05-24)

**Worker version deployed:** `1f467e45-17bc-4096-a391-7df55469f0f3`

| Feature | Details |
|---|---|
| Analytics page | `Analytics.tsx` at `/analytics`; 4 sections: Financial Performance, Clinician Productivity, Revenue Per Session, Collection Efficiency; powered by Caseload Trends sheet |
| Capacity utilization alert | Dismissible banner on Dashboard; checks 2 most recent complete months from Caseload Trends; yellow ≥95%, red ≥100%; `useState` dismiss (session only) |
| Forecast accuracy section | Collapsible panel at bottom of `/forecast`; average accuracy stat, Forecast vs Actual line chart (last 12 settled weeks), 8-row table with green/red difference coloring |
| Inline cell editing | Click-to-edit on 6 fields in Claims table: Notes, Insurance Amount, Client Amount, Service Code, Submission Method; blur/Enter commits, Escape reverts; spinner during in-flight PATCH; mobile bottom-sheet modal variant |
| Emily target corrected | Weekly session target updated from 20 → 10 in Worker and Dashboard subtitle |

**New Worker endpoints:**
- `GET /api/analytics/caseload-trends` — parses Caseload Trends sheet (cols A–AO); handles both Sheets serial dates and formatted strings; returns typed `CaseloadTrendMonth[]` sorted ascending
- `GET /api/analytics/forecast-accuracy` — parses Actual vs Forecast sheet (cols A–E); returns `ForecastAccuracyWeek[]` sorted ascending
- `PATCH /api/claims/:rowIndex` — single-field inline update; reuses `updateClaim` handler (already handles partial bodies); CORS updated to include PATCH

**New files:**
- `src/pages/Analytics.tsx`
- `src/hooks/useAnalytics.ts` — `useCaseloadTrends()` + `useForecastAccuracy()` hooks

---

## Phase 4 — UI Refresh, Quarterly Analytics, Overhead, Pay Periods, Staff, Payer Performance ✅ Complete (2026-05-24)

**Worker version deployed:** `387d8cae-f6c5-458d-913b-f4963610cfe2`

| Feature | Details |
|---|---|
| Heading font → Fraunces | `index.html` Google Fonts link updated; `--font-heading` CSS variable changed in `index.css` |
| Skeleton loading states | `Skeleton.tsx` — `SkeletonMetricCards`, `SkeletonTable`, `SkeletonChart`, `SkeletonForecastGroups` |
| Toast notifications | `ToastContext.tsx` — `ToastProvider` + `useToast()` hook; success/error auto-dismiss (3s); wired to all mutations |
| Density toggle | Normal/compact row height on Claims table; persisted in `localStorage` under `claimsTableDensity` |
| Dashboard date windowing | `useDateWindow.ts` — MTD/QTD/YTD/Last Month/Last Quarter selector; `DeltaBadge` shows % change vs prior period |
| Quarterly Analytics section | `QuarterlySection` in `Analytics.tsx` — ComposedChart (revenue/income/profit bars + margin % line overlay); warnings for months missing overhead |
| Payer Performance section | `PayerPerformanceSection` in `Analytics.tsx` — sortable table; oldest pending ≥90d → red; collection rate <80% → amber |
| Overhead page | `Overhead.tsx` — reads `Xero_Import` tab; preview panel with confirm/discard; history table; edit modal |
| Pay Period Summary page | `PayPeriodSummary.tsx` — Partner tab (Shannon + Jen side-by-side) + Emily tab (hourly with admin hours/bonus, payroll record save) |
| Staff page | `Staff.tsx` — list with license expiry warnings; `StaffDetail.tsx` — NPI/hire/license info + editable compensation rates |
| Forecast quarterly rollup | Collapsible banner on `/forecast` showing current-quarter forecast total, pending count, overdue count |
| Saved filter presets | Up to 8 presets persisted in `localStorage`; pill UI above filter bar; apply/delete |

**New Worker endpoints:**
- `GET /api/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD` — accepts optional date range; returns `{ currentPeriod, priorPeriod, sixMonthTrend, aging, payerMix }`
- `GET /api/analytics/quarterly-summary` — groups claims by calendar quarter, joins Overhead for margin
- `GET /api/analytics/payer-performance` — aggregates per payer: avg days to pay, collection rate, pending count + oldest pending
- `GET /api/overhead` — reads Overhead sheet; returns `OverheadEntry[]`
- `POST /api/overhead/import` — reads `Xero_Import` tab, returns `XeroImportPreview`
- `POST /api/overhead/save` — writes confirmed import to Overhead sheet
- `PUT /api/overhead/:month` — updates a single overhead row
- `GET /api/staff` — reads Staff sheet; returns `StaffMember[]`
- `GET /api/staff/:id` — single staff member
- `POST /api/staff` — create staff row
- `PUT /api/staff/:id` — update staff row
- `GET /api/pay-periods/list` — reads cols A–F from Pay Periods; returns salary + hourly arrays
- `GET /api/pay-periods/summary?type=salary|hourly&periodStart=YYYY-MM-DD`
- `POST /api/pay-periods/payroll-record` — writes to Payroll_Records sheet

**New files:** `Skeleton.tsx`, `ToastContext.tsx`, `useDateWindow.ts`, `useQuarterlySummary.ts`, `usePayerPerformance.ts`, `useStaff.ts`, `useOverhead.ts`, `usePayPeriodSummary.ts`, `Overhead.tsx`, `PayPeriodSummary.tsx`, `Staff.tsx`, `StaffDetail.tsx`

---

## Phase 4.5 — Claims Workflow Enhancements ✅ Complete (2026-05-24)

Frontend-only. No new Worker endpoints. No new Google Sheets columns.

| Feature | Details |
|---|---|
| New claim statuses | `'Deductible'` and `'Sent to Secondary'` added to `CLAIM_STATUSES`; display order: Pending → Payment Pending → Finalized → Deductible → Sent to Secondary → Payment Received → Denied |
| Badge colors | Deductible → `bg-violet-600`; Sent to Secondary → `bg-blue-600` |
| Archive logic | `isArchived(claim)` in `utils.ts`; true for Denied, Sent to Secondary, Payment Received with date, Deductible with date |
| Active view default | Claims page defaults to active-only view; Active / All Claims segmented toggle; persisted in `localStorage` under `claimsViewMode` |
| Multi-select status filter | Status `<select>` replaced with checkbox popover; comma-separated URL param |
| Compound sort default | Status (A→Z) → payer → claim date → payment date; column header click overrides; "Reset sort" restores compound |
| Expanded sortable columns | All meaningful columns now sortable |
| Profile link column | First desktop column: `ExternalLink` icon → SimplePractice profile |

---

## Phase 5 — Bug Fixes & Staff CRUD ✅ Complete (2026-05-24)

**Worker version deployed:** `3bad7f88-5201-48e5-acd1-7aef0ed97558`

| Bug / Feature | Details |
|---|---|
| Bug: Staff tab crash | `getStaff` / `getStaffById` wrapped in try/catch → return `[]` / 404 when tab absent |
| Bug: createStaff tab bootstrap | Auto-creates `Staff` tab + writes header row on first call; 409 on duplicate ID |
| Bug: Pay Periods silent failure | Added `.catch(() => [])` to `Staff!A:O` read in `Promise.all` |
| Bug: `Payment Pending` status | Added to Worker `ClaimStatus` union and frontend `CLAIM_STATUSES`; `recalculateForecasts` now processes Pending, Payment Pending, and Deductible |
| Bug: Pay Periods error state | `PartnerTab` and `EmilyTab` now show a red error banner on fetch failure |
| Bug: Forecast shows archived | `Forecast.tsx` `weeks` useMemo + `QuarterlyRollup` overdue filter guarded with `!isArchived(c)` |
| Staff CRUD: NewStaff page | Full-page form at `/staff/new`; generates UUID client-side; redirects to `/staff/:id` on success |
| Staff CRUD: StaffDetail expanded | Full profile panel editable; single Save button covers both panels |
| Staff CRUD: navigation | `+ Add Staff` navigates to `/staff/new` via `useNavigate`; `AddStaffModal` removed |

**New files:** `src/pages/NewStaff.tsx`

---

## Phase 5.5 — Multi-License Staff Profiles, Multi-Rate Payroll, Emily Pay Analysis ✅ Complete (2026-05-24)

**Worker version deployed:** `0b418cfd-8839-444e-9c09-218be96ee615`

| Feature | Details |
|---|---|
| Staff CAQH ID | `caqhId` field added to `StaffMember`; displayed + editable in StaffDetail and NewStaff |
| Staff schema expansion | Staff sheet now A:S (19 cols) |
| Staff_Licenses tab | New Google Sheets tab; auto-bootstrapped on first license creation; supports unlimited state licenses per clinician |
| StaffDetail Licenses section | Inline add form, table with edit rows, soft-delete (two-click confirm), license status badge |
| Multi-rate payroll | Emily pay uses 4 rates: therapy sessions (90837/90791), other sessions (90834/90832/90847/90846), no-shows, admin/consulting |
| Overhead formula corrected | `overheadCosts = totalPay × 9.56% + $110.80` |
| Emily Pay Analysis: pre-population | Emily tab reads `Payroll_Submissions` IMPORTRANGE tab |
| Emily Pay Analysis: reconciliation | Collapsible panel comparing submission counts vs Claims data |
| Emily Pay Analysis: history | Collapsible table from `Emily Payment Analysis` sheet tab (read-only) |

**New Worker endpoints:**
- `GET /api/staff/:id/licenses`
- `POST /api/staff/:id/licenses`
- `PUT /api/staff/:id/licenses/:licenseId`
- `DELETE /api/staff/:id/licenses/:licenseId`
- `GET /api/emily/submission?periodStart=YYYY-MM-DD`
- `GET /api/emily/payment-analysis`

**New files:** `src/hooks/useEmilyPayroll.ts`

**Post-deploy manual steps:**
1. Open StaffDetail for Emily → set therapySessionRate: 50, otherSessionRate: 40, noShowRate: 40, adminHourlyRate: 25
2. Add Shannon's FL and PA licenses via Licenses section in her StaffDetail
3. Create `Payroll_Submissions` IMPORTRANGE tab in Claim Tracking workbook (pointing to Emily's Google Form responses sheet)

---

## Phase 6 — Claims Page QoL Enhancements ✅ Complete (2026-05-25)

**Worker version deployed:** `43049172-b3aa-496f-b2b4-aaab9b2357ac`

Frontend-only except for profile link auto-population in Worker.

| Feature | Details |
|---|---|
| Profile link auto-population | `claimToRow()` in Worker writes SimplePractice URL into column A on every row write |
| New Claim form defaults | `claimDate` defaults to today; `submissionMethod` defaults to `'Manual'` |
| Client ID auto-fill | `watch('clientId')` + `useEffect`; pulls clinician from Caseloads; pulls insurance/serviceCode/submissionMethod/clientAmount from most recent matching claim in cache; auto-filled fields render with `bg-blue-50` |
| Claim ID column | Second desktop column; monospace text + Copy icon (swaps to Check for 1500ms) |
| Color-coded payer badges | `getPayerStyle(payer)` in `utils.ts`; `PayerBadge` component in `Badge.tsx`; inline styles (not Tailwind arbitrary values) |

---

## Phase 6.5 — Notes Tooltip + Multi-Select Bulk Edit ✅ Complete (2026-05-25)

No new Worker endpoints. No new Google Sheets columns. No new routes.

| Feature | Details |
|---|---|
| Notes tooltip | Hover over Notes cell to see full text; 300ms delay; dark pill tooltip |
| Multi-select checkbox column | Leftmost desktop column; header checkbox drives select-all with indeterminate state |
| Bulk action bar | Sticky bar above table when rows selected; count + Clear + Update Selected |
| BulkUpdateModal | Status dropdown + conditional Payment Date; `Promise.all` of PATCH calls |

**New files:** `src/components/ui/Tooltip.tsx`, `src/components/claims/BulkUpdateModal.tsx`

---

## Phase 7 — Claims UX Improvements ✅ Complete (2026-05-26)

Frontend-only. No new Worker endpoints. No new Google Sheets columns.

| Feature | Details |
|---|---|
| Client ID column | `hidden lg:table-cell` column after Claim ID; Tooltip on cell; included in mobile expanded card |
| Type-ahead combobox | Replaces `<input list>` + `<datalist>` in NewClaim; dropdown opens after typing starts; paste and click-outside handled |
| Supplemental claim entry | Collapsible section below Notes; inherits session context from primary; two `useCreateClaim` instances; partial failure banner |

---

## Phase 8 — Analytics Cleanup & Dashboard Enhancements ✅ Complete (2026-05-26)

**Worker version deployed:** `74630b01-fd5d-4dc3-b84f-0afe5c0c0800`

| Feature | Details |
|---|---|
| Income definition fix | `Payment Pending` claims with a `paymentDateReceived` now count as income everywhere: `computePeriodMetrics` (Dashboard RECEIVED card) and `getQuarterlySummary` (Quarterly Analytics). Q2 income should now match the Excel reference (~$54,701). |
| Payer mix per-payer colors | Dashboard payer mix bar chart renders a `<Cell>` per bar using `getPayerStyle()` — each payer gets its brand color instead of flat gold |
| Comparison period tooltips | `useDateWindow` now returns `priorLabel` (e.g. "vs. April 2026"). Hovering the `DeltaBadge` on any metric card shows the comparison period in the UI Tooltip |
| Collapsible forecast week groups | `ForecastWeekGroup` is now a button; overdue weeks start expanded, future weeks start collapsed |
| Forecast summary chart | Stacked bar chart "Expected Payments by Week" appears between the quarterly rollup and week list; broken down by clinician color |
| Quarter projection endpoint | `GET /api/analytics/quarter-projection` — computes current-quarter actuals, full-quarter projection via daily rate extrapolation, and QTD vs prior-QTD comparison. Overhead: extrapolates missing months using average of available months. |
| Quarter projection UI | `QuarterProjectionSection` in Analytics page (after Quarterly Performance, before Payer Performance): left panel = 3-row projection table; right panel = QTD vs prior-QTD comparison with color-coded % change |

**New Worker endpoint:**
- `GET /api/analytics/quarter-projection` — returns `QuarterProjection` object

**New files:**
- `src/hooks/useQuarterProjection.ts`

**Modified files:**
- `clarity-admin-api/src/index.ts` — income filter fix (×2), `getQuarterProjection` function + route
- `src/types/index.ts` — `QuarterProjection` interface
- `src/lib/api.ts` — `analytics.quarterProjection()` wrapper
- `src/hooks/useDateWindow.ts` — `priorLabel` added to return value
- `src/pages/Dashboard.tsx` — `Cell` + `getPayerStyle` for payer chart; `UITooltip` import; `comparisonNote` prop on `MetricCard`
- `src/pages/Analytics.tsx` — `QuarterProjectionSection` component
- `src/pages/Forecast.tsx` — collapsible `ForecastWeekGroup`; `ForecastSummaryChart` component

---

## Phase 8.5 — Dashboard Comparison Period Fix ✅ Complete (2026-05-26)

Frontend + Worker. No new endpoints. No new Google Sheets columns.

| Feature | Details |
|---|---|
| MTD end-date cap | `useDateWindow` now returns today as `endDate` for MTD, not month-end. Current period and prior period are now measured over the same number of days — previously the current 26-day period was compared against a full 30-day prior month, making MTD always look artificially worse mid-month |
| Calendar-aware prior period (Worker) | `getDashboard` switches on a new `?window=` param: MTD → same day-of-month slice of the prior month (31→30 day clamped); QTD → same elapsed-days slice of the prior quarter; YTD → same calendar date range in the prior year; Last Month / Last Quarter keep duration-shift (already correct for complete periods) |
| Accurate `priorLabel` | `useDateWindow` returns specific date-slice labels: MTD → "vs. April 1–26"; QTD → "vs. Q1 2026 (56 days)"; YTD → "vs. Jan 1–May 26, 2025"; Last Month / Last Quarter labels unchanged |
| `window` threaded through API stack | `Dashboard.tsx` passes `dateWindow` to `useDashboard`; `useDashboard` includes it in the `queryKey` and forwards it to `api.dashboard.get()`; Worker reads it via `url.searchParams.get('window')` |
| Rich tooltip mini-cards | Hovering a delta badge now shows a structured white-card tooltip: Sessions + Revenue show per-clinician breakdowns for current vs prior; Pending shows the aging bucket breakdown (replaces prior period comparison, which is inappropriate for an all-time metric); Received shows current/prior amounts, dollar difference, and collection rate |
| `Tooltip` component upgrade | `content` prop widened from `string` to `React.ReactNode`; new `variant?: 'dark' \| 'card'` prop — `'dark'` preserves all existing behavior, `'card'` renders a white rounded card popup |

**Modified files:**
- `src/hooks/useDateWindow.ts` — MTD end cap at today; accurate `priorLabel` per window type
- `src/lib/api.ts` — `window` param added to `dashboard.get()`
- `src/hooks/useDashboard.ts` — `window` in query key and API call
- `src/pages/Dashboard.tsx` — passes `dateWindow` to hook; `MetricCard` `comparisonNote` prop replaced with `tooltipContent: React.ReactNode`; four tooltip content components + `TooltipRow` helper
- `src/components/ui/Tooltip.tsx` — `React.ReactNode` content; `variant` prop with `'card'` style
- `clarity-admin-api/src/index.ts` — calendar-aware prior period logic in `getDashboard`

---

## Phase 9 — Income Attribution Fix (Cash-Basis Correction) ✅ Complete (2026-05-26)

**Worker version deployed:** `197f254f-65c3-4cfd-b29c-9cf77f9f173f`

Worker-only. No frontend changes. No new endpoints. No type changes.

| Change | Details |
|---|---|
| `getQuarterlySummary` — income by payment date | Builds `incomeByQuarter` map keyed by the quarter that `paymentDateReceived` falls in. Revenue grouping (by claim date) is unchanged. A claim filed in Q1 but paid in Q2 now correctly appears in Q2 income. |
| `getQuarterProjection` — `actualIncome` by payment date | Scans all claims and filters by `paymentDateReceived ∈ [currentQuarterStart, currentQuarterEnd]` instead of filtering `quarterClaims` (which is claim-date-bucketed). |
| `getQuarterProjection` — `priorIncome` by payment date | Same fix for the prior-quarter comparison: scans all claims, filters by `paymentDateReceived ∈ [priorQuarterStart, priorWindowEndDate]`. |
| `getCaseloadTrends` — Worker-computed income | Parallel read of `Claims!A:Y`; builds `incomeByMonth` map keyed by `YYYY-MM-01` of `paymentDateReceived`. Overrides the three Sheet-formula fields: `income` (cash-basis total), `incomePct` → `null` (ratio of different populations is misleading), `collectionVariance` = `totalRevenue − income`. |

**Root cause corrected:** `getQuarterlySummary` and `getQuarterProjection` previously bucketed claims by claim date first, then looked for paid ones within that subset — silently excluding Q2 payments for Q1 claims. Fixes Q2 2026 income discrepancy (~$42k → ~$54.7k).

---

## Phase 10 — Claims Table Enhancements + Collapsible Sidebar ✅ Complete (2026-05-26)

Frontend-only. No new Worker endpoints. No new Google Sheets columns. No new hooks.

| Feature | Details |
|---|---|
| ERA reconciliation summary bar | When claims are selected, bulk action bar shows summed Insurance $ and Total $ for the full selection (including cross-page selections) between the count and the action buttons |
| Column visibility chooser | "Columns" button above desktop table opens a checkbox popover for all 19 toggleable columns; visibility persisted in `localStorage` under `clarity-claims-columns-v1`; "Reset to defaults" restores the 12 default-on columns |
| New optional columns | Payment Date, Lag Days, True Client $, Stripe Fees, Pay Period, Ins. Paid (HHO), Over/Under (HHO) — hidden by default; sortable where applicable |
| Over/Under (HHO) coloring | Positive values (HHO overpaid) render green; negative values (HHO underpaid) render red — supports active contract dispute tracking |
| Dynamic colSpan | Empty-state row `colSpan` computed from visible column count + 3 fixed columns (checkbox, SP link, Edit) |
| Collapsible sidebar | Toggle button at sidebar footer collapses to icon-only width (`w-16`); preference persisted under `clarity-sidebar-collapsed`; content area margin animates via `transition-[margin]`; mobile drawer unaffected |

**Modified files:**
- `src/components/claims/ClaimsTable.tsx` — ERA sums; `COLUMN_DEFS`, `ColumnKey`, column visibility state + localStorage; `SlidersHorizontal` import; columns popover; `th()` colKey param; conditional `<td>` rendering; 7 new column cells; `SortKey` + `singleKeySort` extensions; dynamic `colSpan`
- `src/components/layout/AppShell.tsx` — `sidebarCollapsed` state + `localStorage`; `toggleSidebarCollapse()`; dynamic `md:ml-*` margin
- `src/components/layout/Sidebar.tsx` — `isCollapsed` + `onToggleCollapse` props; dynamic width; collapsed brand/nav/footer; `ChevronLeft`/`ChevronRight` imports

---

## Phase 10.2 — HHO Fields in Edit Claim Form ✅ Complete (2026-05-26)

**Worker version deployed:** `fcc8e3c7-2b19-4a63-b268-85d83b63f4f8`

| Change | Details |
|---|---|
| HHO section in Edit Claim | "Ins. Paid (HHO)" and "Over/Under (HHO)" appear in a highlighted amber section when Insurance = "Health Options" |
| Auto-calculated Over/Under | Read-only display: HHO Paid − Insurance Amount; green when positive (overpaid), red when negative (underpaid) |
| `insurancePaidHHO` write path | Added to `ClaimFullEditInput` (types), `updateClaim` body type (Worker), and `onSubmit` handler; only submitted when payer is HHO |
| Pre-population | Form initializes `insurancePaidHHO` from the existing claim value via `mapClaimToFormValues` |

**Modified files:**
- `src/types/index.ts` — `insurancePaidHHO?: number` added to `ClaimFullEditInput`
- `src/pages/EditClaim.tsx` — `FormValues`, `mapClaimToFormValues`, defaultValues, watched value, HHO UI section, `onSubmit`
- `clarity-admin-api/src/index.ts` — `insurancePaidHHO` in `updateClaim` body type + apply before write

---

## Phase 10.1 — HHO Column Bug Fixes ✅ Complete (2026-05-26)

**Worker version deployed:** `1d588abd-3219-4917-baf6-ffa00c143163`

Worker-only. No frontend changes.

| Bug | Fix |
|---|---|
| `numOpt()` didn't strip currency formatting | Changed `parseFloat(s)` to `parseFloat(s.replace(/[$,]/g, ''))` and tightened the empty-string guard to `s === undefined \|\| s === ''`. Columns P and Q were returning `undefined` for any cell Google Sheets rendered with `$` or `,` formatting. |
| `claimToRow()` + `updateClaim()` overwrote column Q formula on every save | Replaced the single `sheetUpdate(A:Y)` call with `sheetBatchUpdateValues` using two ranges (`A:P` and `R:Y`), leaving column Q (the HHO over/under formula) completely untouched. |

---

## Phase 12 — Forecast Page Redesign ✅ Complete (2026-05-27)

Frontend-only. No new Worker endpoints. No new Google Sheets columns. No type changes.

| Change | Details |
|---|---|
| **Removed:** `ForecastSummaryChart` | Stacked bar chart replaced by `PayerPipelinePanel` sidebar |
| **Removed:** `QuarterlyRollup` | Collapsible teal banner replaced by flat `QuarterBanner` strip |
| **Removed:** `ForecastAccuracySection` | Large collapsible section replaced by compact `AccuracySidebarPanel` |
| **Added:** `ForecastKpiStrip` | Four always-visible KPI cards: Total pipeline, Overdue, Due next 30 days, Forecast accuracy (with mini progress bar) |
| **Added:** `QuarterBanner` | Flat single-row strip showing current-quarter pipeline total and pending count |
| **Added:** `OverdueSection` | Always-expanded overdue block at top of left column; all overdue claims in one table sorted most-overdue first; Claim Date + Days Overdue columns; uses `forecastPaymentDate` (col V) for precise day count |
| **Added:** `PayerPipelinePanel` | Right sidebar grouping pending claims by payer, sorted by total amount descending; proportional mini-bar per payer; "Others" rollup when >6 payers; avg days-to-pay from `usePayerPerformance()` |
| **Added:** `AccuracySidebarPanel` | Right sidebar showing last 5 settled weeks with green/red difference coloring; caveat note; returns null if no settled data |
| Two-column layout | `grid-cols-[1fr_288px]` wraps main timeline (left) and sidebar panels (right) |
| `ForecastWeekGroup` table | Added Claim Date and Days Pending columns; safe `M/D/YYYY` split parsing |
| Hook calls elevated | `useForecastAccuracy()` and `usePayerPerformance()` now called at `Forecast` component level (were inside child components); feeds both KPI strip and sidebar panels |
| All recharts imports removed | No more charts on the Forecast page |

---

## Pending Infrastructure

- **DNS cutover** — point `admin.claritydelaware.com` CNAME to Pages once DNS migrates to Cloudflare
- **Cloudflare Access domain update** — add `admin.claritydelaware.com` to the Access application after DNS cutover
