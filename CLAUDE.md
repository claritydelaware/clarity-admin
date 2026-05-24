# Clarity Admin Portal — CLAUDE.md

This is the internal administrative portal for **Clarity Counseling of Delaware Inc.**, a Delaware S-Corp telehealth mental health practice. The portal is for use by Bruce Spadaccini Jr. (Administrative Partner) only. It is not public-facing.

---

## Project Context

**Practice principals:**
- Bruce Spadaccini Jr. — Administrative Partner (billing, credentialing, HR, tech, finance)
- Shannon Tarolli — Clinical Partner (LPCMH; anxiety/OCD specialist)
- Jennifer Meehan — Clinical Partner (LCSW; couples specialist)
- Emily Bryant — W-2 clinician (LCSW, CCTP; started February 16, 2026)

**Key identifiers:**
- Group NPI: 1275429532
- EIN: 33-4931895
- EHR/Practice Management: SimplePractice
- Accounting: Xero
- Payroll: Gusto
- Email (HIPAA): Paubox

**Active payers:** Highmark BCBS, Aetna, Meritain Health, UnitedHealthcare, Highmark Health Options (Medicaid), Medicare

---

## Architecture

```
admin.claritydelaware.com  (currently on *.pages.dev until DNS cutover)
│
├── Cloudflare Access        — Auth; locked to Bruce's Google account
├── Cloudflare Pages         — React SPA (this repo)
└── Cloudflare Workers       — API proxy (repo: clarity-admin-api)
                               Handles all Google Sheets API calls server-side
                               Credentials never reach the browser
```

**Data source:** Google Sheets workbook ("Claim Tracking"). The Sheet remains the source of truth for the duration of Phase 1. The portal reads and writes to it via the Sheets API v4 through the Worker. Do not introduce a separate database in Phase 1.

**Auth:** Cloudflare Access handles authentication entirely at the edge. The app does not implement its own auth. The Worker can read the `CF-Access-Authenticated-User-Email` header for logging if needed but does not need to validate it — Access already does that.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Bundler | Vite |
| Framework | React + TypeScript |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| Data fetching | TanStack Query (React Query) |
| Forms | React Hook Form |
| Charts | Recharts |
| Icons | Lucide React |
| Hosting | Cloudflare Pages |
| API | Cloudflare Workers |
| Auth | Cloudflare Access |
| Data | Google Sheets API v4 (service account) |

**Tailwind v4 note:** No `tailwind.config.js`. Configuration is CSS-first via `@theme {}` in `src/index.css`. The `@tailwindcss/vite` plugin is used — do not use PostCSS or the CLI.

---

## Design System

### Colors
```css
--color-teal: #254D54      /* Primary: active nav, CTAs, headings */
--color-teal-mid: #3A7078  /* Hover states */
--color-teal-pale: #E8F1F2 /* Active nav background */
--color-gold: #F6C54D      /* Accent: active nav border, key metric accent */
--color-cream: #F9F7F4     /* Content area background */
```
Additional palette:
- White `#FFFFFF` — sidebar, cards, panels, form backgrounds
- Text primary `#1A1A1A`
- Text muted `#6B7280`
- Success green `#16A34A`
- Error red `#DC2626`

### Typography (match public site)
- Headings: **Playfair Display** (Google Fonts)
- Body: **DM Sans** (Google Fonts)
- Accent/labels: **Lora** (Google Fonts)

Load via `<link>` in `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500&family=Lora:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
```

### UI Approach
Light background (cream/white) content area. White sidebar with right border. Gold accent on active nav item (left border + teal-pale background). This is a utility tool — prioritize information density and clarity over decorative elements. No hero sections, no gradients on content areas.

### Status Badge Colors
| Status | Background | Text |
|---|---|---|
| Pending | `#F6C54D` | `#1A1A1A` |
| Payment Received | `#16A34A` | `#FFFFFF` |
| Finalized | `#6B7280` | `#FFFFFF` |
| Denied | `#DC2626` | `#FFFFFF` |

### Logo
- Light sidebar logo: `public/new-clarity-logo-transparent.png` (dark text, use on white/light backgrounds)
- Dark background logo: `assets/White text logo-cprs.png` (white text, use on teal/dark backgrounds)

---

## Current Build State

### Phase 1A — Infrastructure ✅ Complete

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

### Phase 1B — App Scaffolding ✅ Complete

- Types (`src/types/index.ts`): `Claim`, `PayPeriod`, `CaseloadEntry`, `DashboardData` interfaces
- API client (`src/lib/api.ts`): typed fetch wrappers for all Worker endpoints
- AppShell, Sidebar (white/light theme), Topbar layout components
- React Router v7 routes: `/` → `/dashboard`, `/dashboard`, `/claims`, `/claims/new`
- TanStack Query provider with `staleTime: 5min`, `retry: 2`
- Vite dev proxy: `/api/*` → `https://clarity-admin-api.bruce-5f2.workers.dev`

### Phase 1C — Claims Module ✅ Complete

- `ClaimsFilters` — all dropdowns + date range; filter state persisted in URL params
- `ClaimsTable` — desktop table (sortable by date/clinician/total, paginated 50 rows) + mobile tap-to-expand card layout
- `StatusUpdateModal` — click any status badge to update; enforces payment date + amount when marking Payment Received
- `NewClaim` form — all 11 fields; client ID autocomplete from Caseloads sheet; live Stripe fee preview; business rule warnings (HHO no-show, discontinued codes)
- `useClaims` / `useUpdateClaim` / `useCreateClaim` hooks (TanStack Query)

### Phase 1D — Dashboard Module ✅ Complete (v1)

- Metric cards: Sessions, Revenue, Pending, Received this month
- Utilization progress bars per clinician vs weekly targets
- Revenue trend line chart (6 months, total)
- Payer mix bar chart (current month)
- Pending claims aging table (0–30, 31–60, 61–90, 90+ days; 90+ highlighted red)
- `useDashboard` hook

### Phase 2 — Full Edit + Search + Forecast + Backup ✅ Complete (2026-05-24)

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

**Critical implementation details:**
- `toInputDate()` uses string split/pad only — NOT `Date.toISOString()` — to avoid UTC timezone shift (M/D/YYYY → YYYY-MM-DD)
- `useClaim` has `refetchOnWindowFocus: false`, `staleTime: Infinity` — prevents background refetch from clobbering in-progress edits
- Snapshot cron creates a new named tab per run instead of appending to a single tab
- Forecast `useMemo` filters empty `forecastWeek` BEFORE sort — `Invalid Date` sorts inconsistently across browsers
- Cron config lives in `clarity-admin-api/wrangler.jsonc` (NOT wrangler.toml)

### Phase 2.5 — Forecast Payment Date Rebuild ✅ Complete (2026-05-24)

| Feature | Details |
|---|---|
| 3-tier recency-weighted forecast | Client+payer (≥3 claims) → payer-wide → 30-day fallback; recency weights: ≤90d=1.0, 91-180d=0.5, >180d=0.25 |
| Payment-day snap | Aetna → Tuesday, BCBS → Wednesday; applied in all tiers including fallback |
| Batch recalculate endpoint | `POST /api/maintenance/recalculate-forecasts`; rewrites columns V+W for Pending claims only |
| Recalculate button | Forecast page header; triggers batch recalculate + auto-refreshes the week groups |
| Vitest unit tests | `src/forecast-helpers.test.ts`; 22 test cases for pure functions; `npm test` |

**Worker version deployed:** `ac26ecb4-816c-4aec-ab84-2ddd6897f2ca`

**New Worker file:** `clarity-admin-api/src/forecast-helpers.ts` — pure business logic (exported for testability)

**Critical implementation details:**
- `calcForecastDate` takes `clientId` as third param; callers: `createClaim` and `updateClaim`
- Pure functions live in `forecast-helpers.ts` (not `index.ts`) so Vitest can import them without Worker env
- `sheetBatchUpdateValues` uses `/{id}/values:batchUpdate` (different from cron's `/{id}:batchUpdate`)
- All test Date construction uses `new Date(year, month, day)` local time — never ISO string (UTC parse causes day-of-week mismatch)
- `tsconfig.json` has `skipLibCheck: true` to resolve `@cloudflare/workers-types` vs `tinybench` conflict

### Phase 3 — Analytics, Inline Editing, Capacity Alerts, Forecast Accuracy ✅ Complete (2026-05-24)

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
- `src/pages/Analytics.tsx` — new page
- `src/hooks/useAnalytics.ts` — `useCaseloadTrends()` + `useForecastAccuracy()` hooks

**Critical implementation details:**
- `numNull()` helper in Worker strips `$`, `,`, `%` and returns `null` for empty/unparseable — used for all Caseload Trends fields
- `parseSheetDate()` in Worker handles both Google Sheets serial numbers (days since 1899-12-30) and formatted date strings
- Util percentages in Caseload Trends sheet are stored as decimals (0.85 = 85%) — multiply by 100 before display
- Capacity alert compares `avgUtilPct >= 1.0` / `>= 0.95` against the decimal value; filters out current incomplete month before taking last 2
- `useCaseloadTrends` staleTime is 5 min (not Infinity) — data refreshes naturally on Dashboard and Analytics page visits
- Collection Efficiency chart uses Recharts `<Cell>` for per-bar color (not `fill` prop on `<Bar>`) — bars exceeding ±$2,000 render in error red

### Phase 4 — UI Refresh, Quarterly Analytics, Overhead, Pay Periods, Staff, Payer Performance ✅ Complete (2026-05-24)

**Worker version deployed:** `387d8cae-f6c5-458d-913b-f4963610cfe2`

| Feature | Details |
|---|---|
| Heading font → Fraunces | `index.html` Google Fonts link updated; `--font-heading` CSS variable changed in `index.css` |
| Skeleton loading states | `Skeleton.tsx` — `SkeletonMetricCards`, `SkeletonTable`, `SkeletonChart`, `SkeletonForecastGroups`; used in Dashboard, Claims, Forecast |
| Toast notifications | `ToastContext.tsx` — `ToastProvider` + `useToast()` hook; success/error auto-dismiss (3s); wired to all mutations in `useClaims.ts` |
| Density toggle | Normal/compact row height on Claims table; persisted in `localStorage` under `claimsTableDensity` |
| Dashboard date windowing | `useDateWindow.ts` — MTD/QTD/YTD/Last Month/Last Quarter selector; `DateWindowSelector` component; `DeltaBadge` shows % change vs prior period; both current + prior period returned by Worker |
| Quarterly Analytics section | `QuarterlySection` in `Analytics.tsx` — ComposedChart (revenue/income/profit bars + margin % line overlay); per-quarter summary table; warnings for months missing overhead |
| Payer Performance section | `PayerPerformanceSection` in `Analytics.tsx` — sortable table; oldest pending ≥90d → red; collection rate <80% → amber |
| Overhead page | `Overhead.tsx` — reads `Xero_Import` tab (no SheetJS/file upload); preview panel with confirm/discard; history table; edit modal |
| Pay Period Summary page | `PayPeriodSummary.tsx` — Partner tab (salary view, Shannon + Jen side-by-side) + Emily tab (hourly with admin hours/bonus, sparkline of prior 4 margins, payroll record save) |
| Staff page | `Staff.tsx` — list with license expiry warnings; `StaffDetail.tsx` — NPI/hire/license info + editable compensation rates |
| Forecast quarterly rollup | Collapsible banner on `/forecast` showing current-quarter forecast total, pending count, overdue count |
| Saved filter presets | Up to 8 presets persisted in `localStorage`; pill UI above filter bar; apply/delete |

**New Worker endpoints:**
- `GET /api/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD` — accepts optional date range; returns `{ currentPeriod, priorPeriod, sixMonthTrend, aging, payerMix }`
- `GET /api/analytics/quarterly-summary` — groups claims by calendar quarter, joins Overhead for margin; returns `QuarterlySummary[]`
- `GET /api/analytics/payer-performance` — aggregates per payer: avg days to pay, collection rate, pending count + oldest pending; returns `PayerPerformance[]`
- `GET /api/overhead` — reads Overhead sheet; returns `OverheadEntry[]`
- `POST /api/overhead/import` — reads `Xero_Import` tab, returns `XeroImportPreview` (no file upload — Bruce copies Xero P&L export into the tab manually)
- `POST /api/overhead/save` — writes confirmed import to Overhead sheet
- `PUT /api/overhead/:month` — updates a single overhead row
- `GET /api/staff` — reads Staff sheet; returns `StaffMember[]`
- `GET /api/staff/:id` — single staff member
- `POST /api/staff` — create staff row
- `PUT /api/staff/:id` — update staff row (compensation, license dates, etc.)
- `GET /api/pay-periods/list` — reads cols A–F from Pay Periods; returns salary + hourly arrays
- `GET /api/pay-periods/summary?type=salary|hourly&periodStart=YYYY-MM-DD` — returns `PartnerPeriodSummary` or `EmilyPayPeriodSummary`
- `POST /api/pay-periods/payroll-record` — writes to Payroll_Records sheet

**New files (frontend):**
- `src/components/ui/Skeleton.tsx` — skeleton loading components
- `src/context/ToastContext.tsx` — toast notification context + container
- `src/hooks/useDateWindow.ts` — date window state with localStorage persistence
- `src/hooks/useQuarterlySummary.ts` — queries `/api/analytics/quarterly-summary`
- `src/hooks/usePayerPerformance.ts` — queries `/api/analytics/payer-performance`
- `src/hooks/useStaff.ts` — CRUD hooks for Staff with toast wiring
- `src/hooks/useOverhead.ts` — import/save/update hooks for Overhead with toast wiring
- `src/hooks/usePayPeriodSummary.ts` — pay period list + summary + payroll record save
- `src/pages/Overhead.tsx` — overhead management page
- `src/pages/PayPeriodSummary.tsx` — pay period summary with partner + Emily tabs
- `src/pages/Staff.tsx` — staff list page
- `src/pages/StaffDetail.tsx` — staff detail + compensation editing page

**Critical implementation details:**
- Overhead import reads `Xero_Import` tab in the Claim Tracking spreadsheet instead of using SheetJS (avoids Worker 1MB bundle limit)
- `computePeriodMetrics()` extracted as a pure Worker function; called twice (current + prior) for dashboard date windowing
- `useDashboard` queryKey includes `from` and `to` so different date windows never share stale cache
- Badge's `onClick` prop updated to `React.MouseEventHandler<HTMLButtonElement>` so ClaimsTable can call `e.stopPropagation()` before opening the status modal
- All Recharts `formatter` callbacks typed as `(v: unknown) => ...` with `v as number` cast internally — Recharts `ValueType` is `number | string | undefined | null`
- `localStorage` keys in use: `dashboardDateWindow`, `claimsTableDensity`, `claimsFilterPresets`

### Pending Infrastructure

- **DNS cutover** — point `admin.claritydelaware.com` CNAME to Pages once DNS migrates to Cloudflare
- **Cloudflare Access domain update** — add `admin.claritydelaware.com` to the Access application after DNS cutover

---

## Actual File Structure

```
clarity-admin/
├── public/
│   └── new-clarity-logo-transparent.png
├── assets/
│   └── new-clarity-logo-transparent.png   (source copy — do not reference directly in code)
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx            (Phase 4: wraps children with ToastProvider)
│   │   │   ├── Sidebar.tsx             (Phase 4: +Pay Periods, Overhead, Staff nav items)
│   │   │   └── Topbar.tsx
│   │   ├── ui/
│   │   │   ├── Badge.tsx               (Phase 4: onClick typed as MouseEventHandler)
│   │   │   └── Skeleton.tsx            (Phase 4: new — SkeletonMetricCards, SkeletonTable, SkeletonChart, SkeletonForecastGroups)
│   │   └── claims/
│   │       ├── ClaimsTable.tsx         (Phase 3: InlineEditCell + MobileEditModal; Phase 4: compact prop)
│   │       ├── ClaimsFilters.tsx       (Phase 4: saved filter presets via localStorage)
│   │       └── StatusUpdateModal.tsx
│   ├── context/
│   │   └── ToastContext.tsx            (Phase 4: new — toast provider + useToast hook)
│   ├── hooks/
│   │   ├── useClaims.ts                (Phase 4: toast wired to all mutations)
│   │   ├── useAnalytics.ts             (Phase 3: useCaseloadTrends, useForecastAccuracy)
│   │   ├── useDashboard.ts             (Phase 4: accepts from/to params)
│   │   ├── useDateWindow.ts            (Phase 4: new — MTD/QTD/YTD/Last Month/Last Quarter)
│   │   ├── useOverhead.ts              (Phase 4: new — import/save/update overhead)
│   │   ├── usePayPeriodSummary.ts      (Phase 4: new — list, partner/emily summary, payroll record save)
│   │   ├── usePayerPerformance.ts      (Phase 4: new — payer performance analytics)
│   │   ├── useQuarterlySummary.ts      (Phase 4: new — quarterly revenue/margin summary)
│   │   └── useStaff.ts                 (Phase 4: new — staff CRUD)
│   ├── lib/
│   │   ├── api.ts                      (Phase 4: +api.staff.*, api.overhead.*, api.payPeriodsFull.*, api.analytics.quarterlySummary/payerPerformance; dashboard accepts date range)
│   │   └── utils.ts
│   ├── pages/
│   │   ├── Dashboard.tsx               (Phase 4: date window selector + delta badges + skeleton loading)
│   │   ├── Analytics.tsx               (Phase 4: +QuarterlySection, +PayerPerformanceSection)
│   │   ├── Claims.tsx                  (Phase 4: density toggle + skeleton loading)
│   │   ├── NewClaim.tsx
│   │   ├── EditClaim.tsx
│   │   ├── Forecast.tsx                (Phase 4: quarterly rollup banner + toast on recalculate)
│   │   ├── Overhead.tsx                (Phase 4: new)
│   │   ├── PayPeriodSummary.tsx        (Phase 4: new)
│   │   ├── Staff.tsx                   (Phase 4: new)
│   │   └── StaffDetail.tsx             (Phase 4: new)
│   ├── types/
│   │   └── index.ts                    (Phase 4: +DateWindow, +DashboardPeriodMetrics, +QuarterlySummary, +OverheadEntry, +XeroImportPreview, +SalaryPayPeriod, +HourlyPayPeriod, +PartnerPeriodSummary, +EmilyPayPeriodSummary, +PayerPerformance, +StaffMember)
│   ├── App.tsx                         (Phase 4: +overhead, pay-periods, staff, staff/:id routes)
│   ├── main.tsx
│   └── index.css                       (Phase 4: --font-heading changed to Fraunces)
├── CLAUDE.md
├── index.html                          (Phase 4: Fraunces added to Google Fonts link)
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Google Sheets Data Model

**Spreadsheet ID:** `1-uX4T45donLFSkQ7YRTguraDeUNnxODgXrRUruarkG`

The workbook is named "Claim Tracking" and contains these sheets:

### Sheet: Claims (primary data, ~1,900+ rows and growing)

| Column | Field | Notes |
|---|---|---|
| A | Profile Link | SimplePractice profile URL (not used by portal) |
| B | Claim ID | SimplePractice claim ID (may be blank for self-pay) |
| C | Client ID | Hashed token (e.g. `fdcdd28fa306771e`) — never a real name |
| D | Clinician | `Shannon` / `Jen` / `Emily` |
| E | Insurance | Payer name (see payer list below) |
| F | Claim Date | Service date (M/D/YYYY) |
| G | Week | **Calculated:** Sunday of the week containing Claim Date |
| H | Pay Period | **Calculated:** Pay Period Start date from Pay Periods sheet |
| I | Submission Method | `Manual` / `Electronic` / `Cash` / `Secondary` |
| J | Service Code | CPT code — see list below |
| K | Status | `Payment Received` / `Pending` / `Finalized` / `Denied` |
| L | Client Amount | Charged to client (copay/coinsurance/self-pay rate) |
| M | True Client Amount | **Calculated:** Client Amount minus Stripe Fees |
| N | Stripe Fees | **Calculated:** `(Client Amount × 0.029) + 0.30` when Client Amount > 0 |
| O | Insurance Amount | Amount billed to/received from insurance |
| P | Insurance Paid (HHO) | Highmark Health Options specific — leave blank for other payers |
| Q | Over/Under Payment (HHO) | HHO specific — leave blank for other payers |
| R | Total Payment | Client Amount + Insurance Amount — **primary revenue field used by dashboard** |
| S | Payment Date Received | Date payment was received (M/D/YYYY) |
| T | Time to Receive Payment | Days (same value as Lag Days for received claims) |
| U | Lag Days | **Calculated on update:** days between Claim Date and Payment Date Received |
| V | Forecast Payment Date | **Calculated on create:** see Forecast logic below |
| W | Forecast Week | **Calculated:** Sunday of Forecast Payment Date week |
| X | Received Week | Sunday of the week Payment Date Received falls in |
| Y | Notes | Free text |
| Z–AB | (empty overflow) | Ignore |

**Known payers in data:**
BCBS, Aetna, United, United-MA, United-Surest, Medicare, Health Options, Delaware First, Amerihealth VIP, Mutual of Omaha, Self-Pay, Late Cancellation, Meritain

**Known CPT codes:**
90837 (53-min individual), 90832 (30-min individual), 90834 (45-min individual), 90847 (couples/family), 90791 (intake/eval), 90785 (interactive complexity add-on), 96127 (behavioral screening), 96136 (psych testing — stopped mid-Jan 2026)

**Important:** The Google Sheets API returns currency-formatted cells as strings (e.g. `"$1,234.56"`). The Worker's `num()` helper strips `$` and `,` before parsing. Do not remove this — it is load-bearing for all financial fields.

### Sheet: Pay Periods
Three columns: `Pay Period Start` | `Pay Period End` | `Pay Date`

Periods are roughly monthly (15th/16th to 14th/15th). Cached in Worker memory for the session — changes infrequently.

### Sheet: Caseloads
Maps Client ID to clinician name for autopopulation in the new claim form. Fetched on form load.

### Sheet: Caseload Trends
Monthly aggregate rows. Columns include: Emily/Shannon/Jen Sessions, Clients, 90837 %, Avg/Wk, Util %, Revenue by clinician, Payroll Costs, Operational Overhead, Total Overhead, Gross Margin, Income, Collection Variance, Start Date, End Date, Weeks.

---

## Calculated Field Logic

### Week (from any date)
```typescript
function getSundayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}
```

### Pay Period (from Claim Date)
Fetch Pay Periods sheet. Find the row where `Pay Period Start ≤ Claim Date ≤ Pay Period End`. Return the `Pay Period Start` value for that row (formatted M/D/YYYY).

### Forecast Payment Date (on new claim creation)
```
if payer is Self-Pay, Cash, or Late Cancellation:
  Forecast Payment Date = Claim Date (lag = 0)
else:
  avgLagDays = average(LagDays) from Claims rows where
    Insurance = submitted payer AND Status = "Payment Received" AND LagDays > 0
  Forecast Payment Date = Claim Date + round(avgLagDays) days
  (fallback: Claim Date + 30 days if no history for that payer)
```

### Stripe Fees
```typescript
function calculateStripeFees(clientAmount: number): number {
  if (clientAmount <= 0) return 0;
  return Math.round((clientAmount * 0.029 + 0.30) * 100) / 100;
}
```
True Client Amount = Client Amount - Stripe Fees

### Lag Days (when recording payment)
```typescript
const lagDays = Math.round(
  (paymentDateReceived.getTime() - claimDate.getTime()) / 86400000
);
```

---

## Worker API Specification

**Worker name:** `clarity-admin-api`  
**Worker URL:** `https://clarity-admin-api.bruce-5f2.workers.dev`  
**Route:** All `/api/*` requests from the Pages app are proxied to the Worker.

### Environment Secrets (Cloudflare Worker dashboard — never in code)
```
GOOGLE_SERVICE_ACCOUNT_KEY   Full JSON content of the service account key file
SPREADSHEET_ID               1-uX4T45donLFSkQ7YRTguraDeUNnxODgXrRUruarkG
```

### Endpoints

```
GET  /api/claims
     Query params: clinician, payer, status, serviceCode, from, to
     Returns: filtered array of claim objects (all rows fetched, filtered server-side)

POST /api/claims
     Body: { clinician, insurance, claimDate, submissionMethod, serviceCode, status,
             clientAmount, insuranceAmount, claimId?, clientId?, notes? }
     Worker derives: Week, PayPeriod, TrueClientAmount, StripeFees, TotalPayment,
                     ForecastPaymentDate, ForecastWeek
     Returns: completed claim object with row index

PUT  /api/claims/:rowIndex
     Body: { status, paymentDateReceived?, totalPayment?, insuranceAmount?,
             clientAmount?, notes? }
     Worker recalculates: LagDays, TimeToReceivePayment, ReceivedWeek
     Returns: updated claim object

GET  /api/dashboard
     Returns: { currentMonth, sixMonthTrend, aging, payerMix }
     Revenue derived from column R (Total Payment) via c.totalPayment

GET  /api/pay-periods
     Returns: array of { start, end, payDate }

GET  /api/caseloads
     Returns: array of { clientId, clinician }

POST /api/maintenance/recalculate-forecasts
     No body. Fetches all Pending claims, recomputes forecastPaymentDate and
     forecastWeek using the current calcForecastDate logic (3-tier recency-weighted
     + payment-day snap), and batch-writes only the rows that changed (columns V and W).
     Skips Payment Received, Finalized, and Denied claims.
     Returns: { updated: number, total: number }

PATCH /api/claims/:rowIndex
     Body: any subset of claim fields (same shape as PUT).
     Reuses PUT handler — reads current row, applies only supplied fields, writes back.
     Used by inline cell editing in ClaimsTable. Recalculates derived fields the same
     way PUT does (Stripe fees when clientAmount changes, etc.).
     Returns: updated claim object

GET  /api/analytics/caseload-trends
     No params. Reads Caseload Trends!A:AO. Filters rows where Month is null.
     Returns: CaseloadTrendMonth[] sorted ascending by month (ISO date strings).
     Util percentages are returned as decimals (0.85 = 85%).

GET  /api/analytics/forecast-accuracy
     No params. Reads 'Actual vs Forecast'!A:E. Filters rows where both Forecast
     and Actual are null. Returns: ForecastAccuracyWeek[] sorted ascending by weekStart.
```

### CORS Policy
```typescript
const ALLOWED_ORIGINS = [
  'https://admin.claritydelaware.com',
  /^https:\/\/clarity-admin.*\.pages\.dev$/
];
```

---

## Business Rules & Guardrails

**HIPAA:**
- Client IDs are hashed tokens only (e.g. `fdcdd28fa306771e`). Never display, store, or transmit real client names anywhere in this application.
- The Worker must not log request bodies containing client data to Cloudflare's logging infrastructure.
- Do not use any email service without a HIPAA BAA. Paubox is the approved provider for Clarity.

**Billing rules:**
- Health Options (Medicaid) clients cannot be charged no-show fees. If Insurance = "Health Options" and Submission Method = "Cash" or Notes contains "Late Cancellation," show a warning in the UI.
- Codes 96127 and 96136 were discontinued after 1/15/2026. Show a warning (not a hard block) if submitted for a date after that cutoff.
- Code 90785 is an add-on to 90837 and cannot be billed alone. Show a warning if submitted without a corresponding 90837 for the same client/date.

**Highmark Health Options:**
- Active contract dispute. Columns P and Q (Insurance Paid HHO / Over/Under HHO) track discrepancies. Do not conflate with the standard Insurance Amount column (O).

**Financial distinctions:**
- Revenue = Total Payment (column R) generated on a service-date basis — the sum of what was billed to client and insurance.
- Income = funds actually received (Total Payment where Status = Payment Received).
- Session counts for utilization exclude add-on codes (90785) and evaluation codes (96127/96136).

**Stripe fees:**
- Apply only to client-collected payments. Do not apply to insurance reimbursements. Only calculate when Client Amount > 0.

---

## Security Policy

**This portal handles protected health information (PHI) and confidential financial data. The following rules are absolute and must never be overridden.**

### Authentication & Access
- Cloudflare Access is the sole authentication layer. Every route in this application must be behind Access — there are no public routes, no guest views, and no unauthenticated endpoints.
- Never implement a login UI, session tokens, or any client-side auth logic. If Access is bypassed or misconfigured, the correct response is to fix Access, not to add app-level auth as a fallback.
- Never add `?public=true`, `?preview=true`, or any bypass parameter that skips authentication.

### Credentials & Secrets
- The Google service account JSON key must never appear in: source code, git history, environment files (`.env`), build output, client-side bundles, or logs. It lives exclusively as a Cloudflare Worker secret (`GOOGLE_SERVICE_ACCOUNT_KEY`).
- Never commit `.env` files. The `.gitignore` must always exclude them.
- Never log secret values, access tokens, or service account emails in Worker console output.
- If a secret is ever accidentally committed, treat it as compromised: revoke it immediately in Google Cloud Console and generate a new key.

### Data Exposure
- No data from this portal may ever be rendered on a public URL, embedded in a public iframe, or served without Cloudflare Access enforced upstream.
- Never add public API endpoints, open CORS headers (`Access-Control-Allow-Origin: *`), or unauthenticated read routes to the Worker.
- The Worker's CORS allowlist is strict: only `admin.claritydelaware.com` and `clarity-admin-*.pages.dev` preview URLs. Do not expand this without explicit instruction.
- Never export claim data, client IDs, or financial records to third-party services (analytics, error tracking, AI APIs, etc.) without an executed BAA and explicit approval.

### Client Data
- Client IDs are hashed tokens. Never attempt to reverse, decode, or display them as names.
- Never pass client IDs, clinician names, or financial figures into page titles, URL paths, or browser history in a way that could be captured by browser extensions or third-party scripts.
- Do not add client-side error tracking (Sentry, Datadog, etc.) without confirming HIPAA compliance and BAA.

### Infrastructure
- Cloudflare Pages and Workers must remain on Cloudflare's infrastructure. Do not migrate to Vercel, Netlify, or any other host without a full security review.
- Never enable Cloudflare's "development mode" (which bypasses caching rules) in production.
- The Worker must not make outbound requests to any external service other than `sheets.googleapis.com` and `oauth2.googleapis.com`. Any new external dependency requires explicit approval.

### Code Review
- Any change that touches auth configuration, CORS policy, Worker secrets handling, or data-fetching logic must be treated as security-sensitive and reviewed carefully before deployment.
- Do not use `dangerouslySetInnerHTML` anywhere in this application.

---

## What Not to Do

- Do not store the Google service account JSON key anywhere in the codebase or git history.
- Do not add a database (Cloudflare D1 or otherwise) in Phase 1. The Sheet is the source of truth.
- Do not make the app publicly accessible. Every route assumes Cloudflare Access is enforced at the edge.
- Do not implement your own login/auth UI. Cloudflare Access handles it.
- Do not use `any` types for claim data — use the typed interfaces from `src/types/index.ts`.
- Do not combine the frontend Pages project and the API Worker into a single deployment. They are separate Cloudflare projects intentionally.
- Do not use the `clarity-site` (public Astro/WordPress website) repo for anything related to this admin portal. The repos are completely independent.
- Do not remove or weaken the `num()` currency-string stripping logic in the Worker — Google Sheets returns formatted currency strings that must be cleaned before parsing.
