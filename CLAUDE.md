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

### Typography
- Headings: **Plus Jakarta Sans** (Google Fonts) — `--font-heading` CSS variable in `index.css`
- Body: **Plus Jakarta Sans** (Google Fonts) — `--font-body`
- UI/buttons: **Plus Jakarta Sans** (Google Fonts) — `--font-ui`
- Accent/labels: **Plus Jakarta Sans** (Google Fonts) — `--font-accent`

All fonts are Plus Jakarta Sans (single-font stack). Load via `<link>` in `index.html`.

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

## Current Features

For full development history, see `CHANGELOG.md`. For non-obvious implementation details and gotchas, see `DECISIONS.md`.

### Pages & Routes

| Route | File | Description |
|---|---|---|
| `/dashboard` | `Dashboard.tsx` | Metric cards, clinician utilization bars, 6-month revenue trend, payer mix chart, pending claims aging table; MTD/QTD/YTD/Last Month/Last Quarter date window selector with delta badges; capacity alert banner |
| `/claims` | `Claims.tsx` | Paginated/sortable claims table with inline cell editing, multi-select bulk update, active/all view toggle, multi-select status filter, saved filter presets (up to 8), CSV export |
| `/claims/new` | `NewClaim.tsx` | 11-field form; client ID type-ahead combobox with auto-fill from cache; supplemental claim entry section; Stripe fee preview; business rule warnings |
| `/claims/:rowIndex/edit` | `EditClaim.tsx` | Full claim edit form; all 11 fields; guarded against background refetch clobbering in-progress edits |
| `/forecast` | `Forecast.tsx` | Pending claims grouped by forecast week (overdue highlighted red/amber); quarterly rollup banner; forecast accuracy collapsible panel |
| `/analytics` | `Analytics.tsx` | Financial performance, clinician productivity, revenue per session, collection efficiency, quarterly ComposedChart, payer performance sortable table |
| `/overhead` | `Overhead.tsx` | Reads `.xlsx` files from `reporting/` via SheetJS; import preview with confirm/discard; overhead history table; edit modal |
| `/pay-periods` | `PayPeriodSummary.tsx` | Partner tab (Shannon + Jen salary view side-by-side); Emily tab (multi-rate hourly breakdown, submission pre-population from Payroll_Submissions IMPORTRANGE, claims reconciliation panel, payment history) |
| `/staff` | `Staff.tsx` | Staff list with license expiry warnings; navigates to `/staff/new` |
| `/staff/new` | `NewStaff.tsx` | Full staff creation form; UUID generated client-side; 4-rate compensation fields; CAQH ID |
| `/staff/:id` | `StaffDetail.tsx` | Profile, compensation (4 rates), and multi-state licenses — all editable; CAQH ID; soft-delete licenses |

### Key Supporting Files

| File | Purpose |
|---|---|
| `src/components/claims/ClaimsTable.tsx` | Inline edit cells, checkbox multi-select, compound sort, color-coded payer badges, Notes tooltip, Claim ID + Client ID columns |
| `src/components/claims/ClaimsFilters.tsx` | Multi-select status popover, date range pickers, saved filter presets |
| `src/components/claims/BulkUpdateModal.tsx` | Bulk status + payment date update via `Promise.all` of PATCH calls |
| `src/components/claims/StatusUpdateModal.tsx` | Per-claim status update; enforces payment date + amount on Payment Received |
| `src/components/ui/Skeleton.tsx` | `SkeletonMetricCards`, `SkeletonTable`, `SkeletonChart`, `SkeletonForecastGroups` |
| `src/components/ui/Tooltip.tsx` | Hover tooltip; 300ms delay; `disabled` prop suppresses on empty values |
| `src/components/ui/Badge.tsx` | Status badges + `PayerBadge` with color-coded payer styles |
| `src/context/ToastContext.tsx` | Success/error toast; 3s auto-dismiss; wired to all mutations |
| `src/lib/utils.ts` | `isArchived()`, `getPayerStyle()`, `PAYER_EXACT_COLORS` |
| `src/lib/api.ts` | All typed fetch wrappers; `status` + `search` stripped from `claims.list()` params (client-side filters) |
| `src/types/index.ts` | All shared TypeScript interfaces; `CLAIM_STATUSES` canonical display order |
| `clarity-admin-api/src/index.ts` | Worker entry; all route handlers |
| `clarity-admin-api/src/forecast-helpers.ts` | Pure forecast logic (exported for Vitest testability) |

### Pending Infrastructure

- **DNS cutover** — point `admin.claritydelaware.com` CNAME to Pages once DNS migrates to Cloudflare
- **Cloudflare Access domain update** — add `admin.claritydelaware.com` to the Access application after DNS cutover

---

## File Structure

```
clarity-admin/
├── public/
│   └── new-clarity-logo-transparent.png
├── assets/
│   └── new-clarity-logo-transparent.png   (source copy — do not reference directly in code)
├── reporting/                              (gitignored — Xero .xlsx exports dropped here)
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Topbar.tsx
│   │   ├── ui/
│   │   │   ├── Badge.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── Tooltip.tsx
│   │   └── claims/
│   │       ├── ClaimsTable.tsx
│   │       ├── ClaimsFilters.tsx
│   │       ├── StatusUpdateModal.tsx
│   │       └── BulkUpdateModal.tsx
│   ├── context/
│   │   └── ToastContext.tsx
│   ├── hooks/
│   │   ├── useClaims.ts
│   │   ├── useAnalytics.ts
│   │   ├── useDashboard.ts
│   │   ├── useDateWindow.ts
│   │   ├── useEmilyPayroll.ts
│   │   ├── useOverhead.ts
│   │   ├── usePayPeriodSummary.ts
│   │   ├── usePayerPerformance.ts
│   │   ├── useQuarterlySummary.ts
│   │   └── useStaff.ts
│   ├── lib/
│   │   ├── api.ts
│   │   └── utils.ts
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Analytics.tsx
│   │   ├── Claims.tsx
│   │   ├── NewClaim.tsx
│   │   ├── EditClaim.tsx
│   │   ├── Forecast.tsx
│   │   ├── Overhead.tsx
│   │   ├── PayPeriodSummary.tsx
│   │   ├── Staff.tsx
│   │   ├── StaffDetail.tsx
│   │   └── NewStaff.tsx
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── CHANGELOG.md
├── CLAUDE.md
├── DECISIONS.md
├── index.html
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
