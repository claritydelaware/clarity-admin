# Clarity Admin Portal — Implementation Decisions & Gotchas

Non-obvious implementation details, extracted from phase notes. Read this before touching the areas listed. For full phase history, see `CHANGELOG.md`.

---

## Charting Library (Phase 13)

**ApexCharts over Recharts.** Migrated from `recharts` to `react-apexcharts` + `apexcharts` for all chart instances. Recharts is declarative JSX; ApexCharts is options-object based and renders outside React's tree via a canvas/SVG hybrid. Trade-off accepted: ApexCharts provides cleaner gradient fills, native sparkline mode, and cleaner dual-axis support (the quarterly ComposedChart equivalent).

Key gotchas:
- **Per-bar colors** (payer mix, collection variance): use `plotOptions.bar.distributed: true` with the `colors` array mapping one color per data point. `legend: { show: false }` suppresses the auto-generated legend that distributed mode enables by default.
- **Mixed chart type** (Financial Performance): the chart-level `type` must be `'line'` when mixing area and line series. Each series gets its own `type: 'area'` or `'line'` override. `fill.type` can be an array (`['gradient', 'gradient', 'solid', 'solid']`) to apply per-series fill behavior.
- **Dual-axis** (Quarterly chart): pass `yaxis` as an array; series are assigned to axes by position (first 3 → left axis, 4th → right axis).
- **Sparkline**: `chart.sparkline.enabled: true` hides all axes, grid, and labels — no `ResponsiveContainer` wrapper needed. Set `width`/`height` directly on the `<ReactApexChart>` element.
- **Base options**: a `baseOptions` constant is defined at module level in both `Dashboard.tsx` and `Analytics.tsx`. Spread it into each chart's options, then override chart-specific keys. Do not duplicate keys — chart-specific settings take precedence.

## Visual Refresh Patterns (Phase 13)

Six UI patterns adopted from a Landingfolio dashboard template (`templates/tailwind-example-dashboard.txt`). No template code was copied wholesale; these are pattern references only. All color tokens remain Clarity design system values (teal, gold, cream); indigo references from the template were not adopted.

1. **Metric card chrome**: `rounded-xl border border-gray-200 px-5 py-4` (removed gold `border-t-2` accent). Label: `text-xs uppercase tracking-wider`. Value row: `flex items-center justify-between mt-3` to flush delta badge right.
2. **Utilization bars**: `h-1.5 rounded-full` slim style. Per-clinician colors retained (Shannon: teal, Jen: gold, Emily: teal-mid).
3. **Chart card headers**: `flex items-center justify-between px-5 pt-4 pb-3` inside the card, separating the title from the chart area (which gets `px-5 pb-5`).
4. **Aging table**: Converted from `<table>` to `divide-y divide-gray-200` container with `grid grid-cols-3` rows and consistent `px-4`/`px-5` horizontal padding per cell.

---

## Date & Time Handling

**Never use `Date.toISOString()` for date inputs.** `toInputDate()` uses string split/pad only (M/D/YYYY → YYYY-MM-DD). `toISOString()` converts to UTC, which shifts the date by one day for US timezones.

**Never construct test Dates from ISO strings.** Use `new Date(year, month, day)` local time — ISO string parsing produces UTC midnight, causing day-of-week mismatch in forecast tests.

**Google Sheets serial dates.** `parseSheetDate()` in the Worker handles both Google Sheets serial numbers (days since 1899-12-30) and formatted date strings. Both forms appear in the wild depending on how a cell was entered.

**`StaffDetail.tsx` date inputs** receive ISO `YYYY-MM-DD` directly from Worker's `parseSheetDate()` — no client-side conversion needed.

---

## API & Data Fetching

**`useClaim` must not refetch in the background.** Set `refetchOnWindowFocus: false` and `staleTime: Infinity` — otherwise a background refetch will clobber in-progress edits in `EditClaim.tsx`.

**`useDashboard` queryKey must include `from`, `to`, and `window`.** Different date windows must never share stale cache. The queryKey is `['dashboard', from, to, window]`. Adding `window` was necessary after Phase 8.5 because switching between MTD and QTD sends the same `from`/`to` dates for in-progress periods but requires a different prior-period calculation on the Worker.

**`useCaseloadTrends` staleTime is 5 min** (not Infinity) — data needs to refresh on Dashboard and Analytics page visits.

**`useEmilySubmission` staleTime 5 min; `useEmilyPaymentAnalysis` staleTime 10 min.**

**`useClaims()` in `NewClaim.tsx`** fetches with no filter to warm the cache for auto-fill; already warm when navigating from the Claims page.

---

## Worker / Google Sheets

**`num()` currency stripping is load-bearing.** Google Sheets returns currency-formatted cells as strings (`"$1,234.56"`). The Worker's `num()` helper strips `$` and `,` before parsing. Do not remove or weaken this.

**`numNull()` helper** strips `$`, `,`, `%` and returns `null` for empty/unparseable — used for all Caseload Trends fields (as opposed to `num()` which returns 0).

**Util percentages are stored as decimals** in the Caseload Trends sheet (0.85 = 85%). Multiply by 100 before displaying. The capacity alert compares `avgUtilPct >= 1.0` / `>= 0.95` against the raw decimal value.

**Two different batch update URLs.** `sheetBatchUpdateValues` uses `/{id}/values:batchUpdate`. The cron snapshot uses `/{id}:batchUpdate` (structural operations). These are different endpoints — do not conflate.

**Cron config lives in `wrangler.jsonc`**, not `wrangler.toml`. The cron runs `0 6 * * 1` (Monday 6 AM UTC) and creates a new named `Snapshot_YYYY-MM-DD` tab per run.

**`tsconfig.json` has `skipLibCheck: true`** to resolve the `@cloudflare/workers-types` vs `tinybench` type conflict. Do not remove it.

**Forecast `useMemo` filters empty `forecastWeek` BEFORE sorting.** `Invalid Date` sorts inconsistently across browsers — filter first, then sort.

**`recalculateForecasts` active-status filter** processes Pending, Payment Pending, and Deductible claims. It skips Payment Received, Finalized, and Denied.

---

## Data Model

**`"Late Cancellation"` is a payer value, not a status.** No-show filtering uses `c.insurance === 'Late Cancellation'`, not a ClaimStatus field.

**`CLAIM_STATUSES` array order is canonical.** The display order in the array drives all dropdowns and the multi-select popover. StatusUpdateModal, NewClaim, and EditClaim all pick up new statuses automatically via `.map()`. Current order: Pending → Payment Pending → Finalized → Deductible → Sent to Secondary → Payment Received → Denied.

**Staff sheet header row is 19 columns (A:S):**
`id, name, role, npi, licenseType, licenseNumber, licenseState, licenseExpiration, hireDate, compensationType, annualSalary, sessionRate, adminHourlyRate, active, notes, caqhId, therapySessionRate, otherSessionRate, noShowRate`

**`Staff_Licenses` tab columns (A:H):**
`id, staffId, licenseType, licenseNumber, licenseState, effectiveDate, expirationDate, active`

**`getStaff()` filters `s.active === true`** — inactive staff are hidden from the list. `getStaffById` returns them for editing.

**Old `Payroll_Records` `adminHours` at index 9** maps to the new `trainingHours` column. Backward compat is preserved because `(meetingHours + trainingHours) * adminHourlyRate` equals the old `adminHours * adminHourlyRate`.

**`Payroll_Submissions` tab** must be created manually via IMPORTRANGE from Emily's Google Form responses sheet. It is not auto-bootstrapped.

**Overhead import reads `.xlsx` files from `reporting/`** using SheetJS (`xlsx` npm package). Drop Xero monthly P&L exports as `Month_YYYY_PL.xlsx` into `reporting/`. The folder is gitignored — financial data is not committed.

**Overhead xlsx import is a local-only workflow.** `Overhead.tsx` uses `import.meta.glob('../../reporting/*.xlsx', { eager: true })` to discover files at Vite build/dev-server start time — not at runtime. Consequences: (1) files added to `reporting/` after the dev server starts won't appear until the server is restarted; (2) the production site (`admin.claritydelaware.com`) can never access xlsx files because `reporting/` is gitignored and is not included in the Cloudflare Pages build. The correct workflow: drop the Xero export into `reporting/` locally → restart the dev server → import and confirm in the UI → data is saved to the `Overhead` Google Sheet tab → confirmed data is then readable from the live site via the Worker.

**There are three separate overhead data sources — do not conflate them:**
1. **`Overhead` sheet tab** — Xero-imported entries saved via the Overhead page. This is the source for Analytics quarterly summary (`getQuarterlySummary`) and quarter projection (`getQuarterProjection`). Missing months trigger amber warning banners in Analytics.
2. **`Caseload Trends` sheet columns AK–AL** (indices 36–37) — formula-driven overhead figures read by `getCaseloadTrends`. These populate `CaseloadTrendMonth.operationalOverhead` and `.totalOverhead`, which drive the Overhead line in the Analytics Financial Performance chart. This data is managed entirely in the spreadsheet; the portal doesn't write to it.
3. **Formula constants in the Worker** (`EMILY_PAYROLL_TAX_RATE = 0.0956`, `EMILY_FIXED_OVERHEAD_PER_PERIOD = 110.80`) — used to estimate overhead per pay period on the Emily payroll tab and in Emily's `PayPeriodSummary` entries stored in `Payroll_Records`. These have no relationship to Xero imports. The source of truth for these constants is `Config!I1:J2` in the spreadsheet.

---

## Routing & Registration Order

**License routes must be registered before the generic `/api/staff/:id` route.** Worker route matching is first-match; `GET /api/staff/:id/licenses` will collide with `GET /api/staff/:id` if order is wrong.

**`/staff/new` must be registered before `/staff/:id` in React Router.** Otherwise `/staff/new` is matched as a dynamic `:id` param.

---

## React & Form Patterns

**Combobox in `NewClaim.tsx` uses `setValue('clientId', val)`**, not `register`. `clientId: ''` is in `defaultValues`, so RHF tracks the value without explicit registration.

**`unregister('supplemental')` on Remove** clears nested field registration cleanly. RHF v7 defaults `shouldUnregister` to false, so explicit unregister is required.

**`is90785Alone` warning** fires only when 90785 is the primary service code AND the supplemental section is closed: `serviceCode === '90785' && !showSupplemental`.

**Select-all indeterminate effect has no deps array.** It runs after every render to avoid stale closure when sort or filter changes the `paginated` array.

**`selectedRows` cleared via `useEffect` on `claims` identity** — fires on filter change or query invalidation.

**`BulkUpdateModal` closes automatically via `useEffect` on `selectedRows.size === 0`** — handles mid-session filter changes that deselect all rows.

**Checkbox column is `hidden` on mobile** — bulk edit is desktop-only; mobile retains individual inline editing.

---

## Styling & UI

**Payer badge colors use inline styles, not Tailwind arbitrary values.** Tailwind v4 CSS-first setup doesn't compile arbitrary value classes at build time. `getPayerStyle()` returns a style object.

**`getPayerStyle` evaluates exact matches before prefix matches.** This prevents `"United"` color from accidentally applying to `"United-MA"` or `"United-Surest"`.

**Recharts `<Cell>` for per-bar color, not `fill` prop on `<Bar>`.** The Collection Efficiency chart uses `<Cell>` components for conditional coloring. Bars exceeding ±$2,000 render in error red.

**All Recharts `formatter` callbacks are typed as `(v: unknown) => ...`** with `v as number` cast internally. Recharts `ValueType` is `number | string | undefined | null`.

**`Badge.tsx` `onClick` is typed as `React.MouseEventHandler<HTMLButtonElement>`** so `ClaimsTable` can call `e.stopPropagation()` before opening the status modal.

---

## localStorage Keys in Use

| Key | Page | Values |
|---|---|---|
| `dashboardDateWindow` | Dashboard | `'MTD'` \| `'QTD'` \| `'YTD'` \| `'lastMonth'` \| `'lastQuarter'` |
| `claimsTableDensity` | Claims | `'normal'` \| `'compact'` |
| `claimsFilterPresets` | Claims | JSON array of saved filter objects (max 8) |
| `claimsViewMode` | Claims | `'active'` \| `'all'` |
| `clarity-claims-columns-v1` | Claims | JSON array of visible `ColumnKey` strings |
| `clarity-sidebar-collapsed` | App-wide | `'true'` \| `'false'` |

---

## Income Definition (Phase 8 → corrected in Phase 9)

**Income = `Payment Received` OR `Payment Pending` with `paymentDateReceived` set.** `Payment Pending` represents near-certain imminent receipts that are always reconciled. This applies in `computePeriodMetrics` (Dashboard RECEIVED card), `getQuarterlySummary` (Quarterly Analytics income column), and `getQuarterProjection` (all actual/prior income lines). Do not revert to `Payment Received` only — that produces materially lower Q2 figures.

**Income is attributed to the date of `paymentDateReceived`, not the claim date (Phase 9).** `getQuarterlySummary` builds a separate `incomeByQuarter` map keyed by the quarter that `paymentDateReceived` falls in, then joins that back to the revenue-by-claim-date quarters. `getQuarterProjection` scans all claims and filters by `paymentDateReceived` in the current-quarter and prior-quarter windows directly — `quarterClaims` (which is filtered by claim date) is only used for `actualRevenue`. A claim filed in Q1 but paid in Q2 correctly appears in Q2 income, not Q1.

**`CaseloadTrendMonth.income` is now Worker-computed from Claims data (Phase 9).** `getCaseloadTrends` performs a parallel read of `Claims!A:Y` alongside `Caseload Trends!A:AO`. It groups payments by the calendar month of `paymentDateReceived` into an `incomeByMonth` map and uses that instead of the Sheet formula value (`r[34]`). `incomePct` is set to `null` (cash-basis income and service-date revenue belong to different claim populations; their ratio is misleading). `collectionVariance` is `totalRevenue (service-date) − income (payment-date)` — a cash-flow signal, not a pure collection rate. The Sheet formula columns 34, 36, and 37 are ignored.

**`priorLabel` in `useDateWindow` must match what the Worker actually computes.** For `mtd`, both the frontend label ("vs. April 1–26") and the Worker prior period start on the 1st and end on the same day-of-month as today — they agree. For `qtd`, both use elapsed-days into the prior quarter. For `ytd`, both use Jan 1 → same calendar date in the prior year. For `last-quarter`, the label is "2 quarters behind the current quarter number" (not 1 behind the displayed quarter) — this matches the Worker's duration-shift logic, which when applied to the start of last quarter lands in the prior quarter. If the Worker prior period logic changes, update `priorLabel` to match.

**`QuarterProjectionSection` overhead only considers months through the current month.** Future months in the quarter (e.g. June when today is in May) are skipped entirely when computing `actualOverhead` and `availableMonthCount`. `projectedTotalOverhead = avgMonthlyOverhead × 3` — the extrapolation fills in all three months regardless, so overhead is not understated if a month is simply not yet available.

**`UITooltip` alias in `Dashboard.tsx`.** The custom `Tooltip` component from `components/ui/Tooltip.tsx` is imported as `UITooltip` to avoid shadowing the recharts `Tooltip` import on the same page. Do not consolidate these into one import.

**`Tooltip` component supports `React.ReactNode` content and a `variant` prop.** `variant="dark"` (default) renders the original dark bubble — all existing call sites are unaffected. `variant="card"` renders a white rounded card with a shadow, used for the metric card mini-tooltips on the Dashboard. The wrapping `<span>` and popup positioning are identical for both variants. The `maxWidth` prop applies to both: for `'card'` it sets the max-width on the inner card div.

**Dashboard comparison period is calendar-aware, not duration-shifted.** For MTD: `endDate` is capped at today (not month-end) so the prior period covers the same day count. The Worker prior period is April 1 → April N (where N = today's day-of-month), clamped to the last day of April if today is the 31st. For QTD: elapsed days into the current quarter are applied to the prior quarter's start. For YTD: same calendar date range in the prior year. Last Month and Last Quarter are complete periods and use the original duration-shift (still correct).

**The Pending card tooltip shows aging, not a prior-period delta.** `pendingCount` is an all-time metric — the prior-period comparison for "pending" is misleading (it counts all current pending claims against all claims that were pending in a prior window, not the same cohort). The aging breakdown is more actionable. The delta badge still shows the count delta; the tooltip gives context via aging buckets instead of a period breakdown.

---

## HHO Column Handling

**`numOpt()` must strip `$` and `,` before parsing.** Google Sheets returns currency-formatted cells as strings (e.g. `"$150.00"`, `"$1,234.00"`). `numOpt` uses `.replace(/[$,]/g, '')` before `parseFloat`, the same as `num()`. Without this, any non-zero HHO value reads back as `undefined`.

**Column Q (`overUnderHHO`) contains a formula — never write to it from the Worker.** `updateClaim` uses `sheetBatchUpdateValues` with two ranges (`Claims!A:P` and `Claims!R:Y`) to skip Q entirely. Writing an empty string via a full `A:Y` update would clear the formula for non-HHO claims; writing the evaluated numeric value would replace the formula for HHO claims, breaking auto-recalculation when column P changes.

**`createClaim` (sheetAppend) still writes Q as `''`.** Appending a new row inherently has no formula in Q — the user must extend any Q formula to new rows manually (or via array formula in the sheet). This is accepted behavior for now.

---

## Forecast Page Architecture (Phase 12)

**`daysOverdue` uses `forecastPaymentDate` (col V), not `forecastWeek` (col W).** A claim forecast for a Tuesday and bucketed to the Sunday of that week would show 5–6 extra days of overdue if snapped to the week boundary. `forecastPaymentDate` gives the precise day count.

**`daysPending` must not pass `c.claimDate` to `new Date()` directly.** `claimDate` is `M/D/YYYY`. Passing that string to `new Date()` may parse as UTC midnight in some environments, shifting the date by one day. The helper splits on `/`, parses each part as an integer, and calls `new Date(year, month - 1, day)` (local time).

**`useForecastAccuracy()` is called at the `Forecast` component level**, not inside a child. The accuracy data now feeds both the KPI strip (accuracy card) and the `AccuracySidebarPanel`. Moving it up avoids a second independent query and lets the parent derive `avgAccuracy` and `settledWeeks` in one `useMemo`.

**`usePayerPerformance()` is called at the `Forecast` component level** and passed as a prop to `PayerPipelinePanel`. The panel renders correctly with an empty `payerPerf` array while the query loads — avg-days entries simply don't appear for payers with no data.

**`AccuracySidebarPanel` returns `null` when there are no settled weeks.** The panel is not rendered at all in that case — do not add a placeholder or empty-state inside it.

**`OverdueSection` consolidates all overdue week groups into one flat table**, sorted most-overdue first. The individual `ForecastWeekGroup` components with `isOverdue={true}` are no longer rendered — `overdueWeeks` feeds `OverdueSection` only. `upcomingWeeks` feeds the per-week `ForecastWeekGroup` list.

**`isOverdueWeek` is renamed from `isOverdue` in `Forecast`.** The internal helper is `isOverdueWeek` to avoid shadowing the `isOverdue` prop on `ForecastWeekGroup` (which still uses it for header coloring). Both check `new Date(forecastWeek) < today` where `today` is midnight local time.

---

## Claims Column Visibility (Phase 10)

**`th()` returns `null` for hidden columns.** The helper accepts an optional `colKey?: ColumnKey` parameter. When provided and the column is not in `visibleColumns`, it returns `null`. React handles null children in `<tr>` without rendering any DOM node — no placeholder `<th>` is emitted, so the visible column count is exactly right.

**ERA reconciliation sums use the full `claims` prop, not `paginated`.** `selectedClaims = claims.filter(c => selectedRows.has(c.rowIndex))`. This means selecting rows across multiple pages produces correct totals — the paginated slice would silently zero-out rows on other pages.

**`visibleColSpan` counts visible `COLUMN_DEFS` entries + 3 fixed columns** (checkbox, SP link, Edit). The Edit column is rendered via `th('')` with no colKey so it never disappears.

**`COL_STORAGE_KEY = 'clarity-claims-columns-v1'`** — versioned so a future schema change can reset user preferences by bumping the key name.

**Collapsible sidebar is desktop-only.** On mobile, `isCollapsed` has no effect — the sidebar is always a full-width slide-over drawer controlled by `isOpen`. The `w-16` class applies at all breakpoints but the slide-over behavior on mobile renders it off-screen until opened, so the narrow width never flashes. The content area margin uses `md:ml-16` / `md:ml-60` — no margin shift on mobile.

---

## Filtering Architecture

**`status` and `search` are stripped from API params in `api.ts`**, not in `Claims.tsx`. Both are client-side filters. The `ClaimsFilter` interface retains these fields for call-site compatibility — only the API call omits them.

**Multi-select status URL param is comma-separated:** `?status=Pending,Finalized`. Empty string = no status filter.

**`isArchived()` lives in `utils.ts`** so it can be imported wherever needed. Currently used in `Claims.tsx` (active/all toggle) and `Forecast.tsx` (weeks `useMemo` filter).
