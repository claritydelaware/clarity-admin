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
--color-teal: #254D54      /* Primary: sidebar, nav, section headers */
--color-gold: #F6C54D      /* Accent: highlights, active states, CTAs, key metrics */
--color-cream: #F9F7F4     /* Content area background */
```
Additional palette:
- White `#FFFFFF` — cards, panels, form backgrounds
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
Light background (cream/white) content area. Teal sidebar. Gold accents. This is a utility tool — prioritize information density and clarity over decorative elements. No hero sections, no gradients on content areas.

### Status Badge Colors
| Status | Background | Text |
|---|---|---|
| Pending | `#F6C54D` | `#1A1A1A` |
| Payment Received | `#16A34A` | `#FFFFFF` |
| Finalized | `#6B7280` | `#FFFFFF` |
| Denied | `#DC2626` | `#FFFFFF` |

---

## Current Build State

### Phase 1A — Infrastructure (in progress)

| Step | Task | Status |
|---|---|---|
| 1 | Google Cloud project created, Sheets API enabled, service account created | ✅ Done |
| 1 | Service account JSON key downloaded (required org policy override at project level: `iam.disableServiceAccountKeyCreation` → Off) | ✅ Done — **confirm key file is stored securely offline** |
| 2 | Google Sheets workbook shared with service account email (Editor access) | ✅ Done |
| 3 | GitHub repo `clarity-admin` created, cloned locally | ✅ Done |
| 3.5 | Vite + React + TypeScript scaffolded, dependencies installed, pushed to GitHub | ✅ Done |
| 4 | Cloudflare Pages project connected to GitHub repo | 🔲 Pending |
| 5 | Cloudflare Access application configured for admin URL | 🔲 Pending |
| 6 | Cloudflare Worker `clarity-admin-api` created, secrets configured | 🔲 Pending |
| 7 | DNS CNAME record: `admin` → `*.pages.dev` | ⏸ Deferred — waiting on DNS migration to Cloudflare |

### Phase 1B — App Scaffolding
🔲 Not started

### Phase 1C — Claims Module
🔲 Not started

### Phase 1D — Dashboard Module
🔲 Not started

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
| R | Total Payment | Client Amount + Insurance Amount |
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

### Sheet: Pay Periods
Three columns: `Pay Period Start` | `Pay Period End` | `Pay Date`

Periods are roughly monthly (15th/16th to 14th/15th). The Worker must fetch this sheet to resolve Pay Period on new claim submission. Cache it for the session — it changes infrequently.

### Sheet: Caseloads
Maps Client ID to clinician name for autopopulation in the new claim form. Fetch on form load.

### Sheet: Caseload Trends
Monthly aggregate rows. Columns include: Emily/Shannon/Jen Sessions, Clients, 90837 %, Avg/Wk, Util %, Revenue by clinician, Payroll Costs, Operational Overhead, Total Overhead, Gross Margin, Income, Collection Variance, Start Date, End Date, Weeks.

The Worker should read this sheet for overhead and payroll figures (which originate from Gusto/Xero, not from Claims) and combine them with live Claims aggregates for the dashboard. Do not use this sheet as the sole dashboard source — compute sessions and revenue from Claims directly to keep the portal independently accurate.

---

## Calculated Field Logic

### Week (from any date)
```typescript
function getSundayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // getDay() returns 0 for Sunday
  return d;
}
```

### Pay Period (from Claim Date)
Fetch Pay Periods sheet. Find the row where `Pay Period Start ≤ Claim Date ≤ Pay Period End`. Return the `Pay Period Start` value for that row (formatted M/D/YYYY to match existing sheet data).

### Forecast Payment Date (on new claim creation)
```
if payer is Self-Pay, Cash, or Late Cancellation:
  Forecast Payment Date = Claim Date (lag = 0)
else:
  avgLagDays = average(LagDays) from Claims rows where
    Insurance = submitted payer
    AND Status = "Payment Received"
    AND LagDays > 0
  if avgLagDays exists:
    Forecast Payment Date = Claim Date + round(avgLagDays) days
  else:
    Forecast Payment Date = Claim Date + 30 days  // default fallback
```

### Stripe Fees
```typescript
function calculateStripeFees(clientAmount: number): number {
  if (clientAmount <= 0) return 0;
  return parseFloat(((clientAmount * 0.029) + 0.30).toFixed(2));
}
```
True Client Amount = Client Amount - Stripe Fees

### Lag Days (when recording payment)
```typescript
const lagDays = Math.round(
  (paymentDateReceived.getTime() - claimDate.getTime()) / (1000 * 60 * 60 * 24)
);
```

---

## Worker API Specification

**Worker name:** `clarity-admin-api`
**Route:** All `/api/*` requests from the Pages app are proxied to the Worker.

### Environment Secrets (set in Cloudflare Worker dashboard)
```
GOOGLE_SERVICE_ACCOUNT_KEY   Full JSON content of the service account key file
SPREADSHEET_ID               Google Sheets spreadsheet ID
```

### Endpoints

```
GET  /api/claims
     Query params: clinician, payer, status, serviceCode, from (YYYY-MM-DD), to (YYYY-MM-DD)
     Returns: filtered array of claim objects
     Note: fetch all rows, filter server-side (volume is manageable)

POST /api/claims
     Body: { clinician, insurance, claimDate, submissionMethod, serviceCode, status,
             clientAmount, insuranceAmount, claimId?, clientId?, notes? }
     Worker derives: Week, PayPeriod, TrueClientAmount, StripeFees, TotalPayment,
                     ForecastPaymentDate, ForecastWeek
     Action: appends row to Claims sheet
     Returns: completed claim object with derived fields and row index

PUT  /api/claims/:rowIndex
     Body: { status, paymentDateReceived?, totalPayment?, insuranceAmount?,
             clientAmount?, notes?, ... }
     Worker recalculates: LagDays, TimeToReceivePayment, ReceivedWeek
     Action: updates specific row in Claims sheet
     Returns: updated claim object

GET  /api/dashboard
     Returns: {
       currentMonth: { sessions, revenueByCliniciam, pending, received, utilizationByCliniciam },
       sixMonthTrend: [...monthly aggregates],
       aging: { bucket0_30, bucket31_60, bucket61_90, bucket90plus },
       payerMix: [...payer revenue breakdown]
     }
     Source: computed from Claims sheet + Caseload Trends sheet (for overhead/payroll)

GET  /api/pay-periods
     Returns: array of { start, end, payDate }
     Cache response in Worker memory for session duration

GET  /api/caseloads
     Returns: array of { clientId, clinician }
```

### CORS Policy
```typescript
const ALLOWED_ORIGINS = [
  'https://admin.claritydelaware.com',
  /^https:\/\/clarity-admin.*\.pages\.dev$/  // all preview deploys
];
```

### Google Sheets API Authentication in the Worker
Use JWT-based service account authentication. The Worker signs a JWT using the private key from `GOOGLE_SERVICE_ACCOUNT_KEY`, exchanges it for an access token at `https://oauth2.googleapis.com/token`, then uses that token for Sheets API calls.

Recommended: use the `google-auth-library` pattern or implement the JWT exchange directly with the Web Crypto API (no npm package needed in a Worker). Cache the access token in memory until expiry.

---

## App Structure (target)

```
clarity-admin/
├── public/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx        # Sidebar + topbar + content area
│   │   │   ├── Sidebar.tsx         # Teal sidebar with nav links
│   │   │   └── Topbar.tsx          # Page title, user email
│   │   ├── ui/
│   │   │   ├── Badge.tsx           # Status badges
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   └── Table.tsx
│   │   ├── claims/
│   │   │   ├── ClaimsTable.tsx
│   │   │   ├── ClaimsFilters.tsx
│   │   │   ├── ClaimRow.tsx
│   │   │   ├── ClaimForm.tsx       # Add new claim
│   │   │   └── StatusUpdateModal.tsx
│   │   └── dashboard/
│   │       ├── MetricCard.tsx
│   │       ├── RevenueChart.tsx
│   │       ├── AgingTable.tsx
│   │       ├── PayerMixChart.tsx
│   │       └── UtilizationCard.tsx
│   ├── hooks/
│   │   ├── useClaims.ts
│   │   └── useDashboard.ts
│   ├── lib/
│   │   ├── api.ts                  # Typed fetch wrappers for Worker endpoints
│   │   └── utils.ts                # Date helpers, formatters
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Claims.tsx
│   │   └── NewClaim.tsx
│   ├── types/
│   │   └── index.ts                # Claim, PayPeriod, DashboardData types
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css                   # Tailwind v4 + @theme tokens
├── CLAUDE.md                       # This file
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Phase 1B — App Scaffolding (next task)

Build the shell before any data-connected components.

1. **Types** (`src/types/index.ts`) — define `Claim`, `PayPeriod`, `CaseloadEntry`, `DashboardData` TypeScript interfaces matching the column structure above.

2. **API client** (`src/lib/api.ts`) — typed fetch functions for each Worker endpoint. All requests go to `/api/*` (relative path, works in both Pages dev and production via proxy).

3. **AppShell** — sidebar + topbar layout. Sidebar is teal (`#254D54`), fixed width 240px on desktop, slide-out on mobile. Nav items: Dashboard (LayoutDashboard icon), Claims (FileText icon). Active state uses gold left border.

4. **Router setup** (`App.tsx`) — React Router v7 with routes: `/` → redirect to `/dashboard`, `/dashboard`, `/claims`, `/claims/new`.

5. **TanStack Query provider** — wrap app in `QueryClientProvider` with sensible defaults: `staleTime: 5 * 60 * 1000` (5 min), `retry: 2`.

6. **Vite dev proxy** — add to `vite.config.ts` so `/api/*` requests in dev point to the Worker's `*.workers.dev` URL:
```typescript
server: {
  proxy: {
    '/api': {
      target: 'https://clarity-admin-api.YOUR_SUBDOMAIN.workers.dev',
      changeOrigin: true,
    }
  }
}
```

---

## Phase 1C — Claims Module

### List view (desktop)
Full-width table. Columns: Clinician | Payer | Claim Date | Service Code | Status | Client Amt | Insurance Amt | Total | Notes (truncated). Sortable by Claim Date (default: descending). Paginated at 50 rows.

Filter bar above table: Clinician (dropdown), Payer (dropdown), Status (dropdown), Date range (two date inputs), Service Code (dropdown). "Clear filters" link. Filter state lives in URL query params so the view is bookmarkable.

### List view (mobile)
Card layout. Each card: top row = Clinician + Payer + Date, second row = Status badge + Total amount. Tap to expand full detail. Filters in a slide-up drawer triggered by a filter icon button.

### Add New Claim form (`/claims/new`)
Fields in order:
1. Claim Date (date picker — required)
2. Clinician (select: Shannon / Jen / Emily — required)
3. Client ID (text — autopopulate options from Caseloads sheet based on selected Clinician; allow free entry if not found)
4. Insurance / Payer (select from known payer list — required)
5. Claim ID (text — optional; SimplePractice claim ID)
6. Service Code (select from CPT list — required)
7. Submission Method (select: Manual / Electronic / Cash / Secondary — required)
8. Status (select — default: Pending)
9. Client Amount (number — optional; 0 if insurance-only)
10. Insurance Amount (number — optional)
11. Notes (textarea — optional)

On submit:
- Validate required fields
- POST to `/api/claims`
- Show derived fields in confirmation (Week, Pay Period, Forecast Payment Date, Stripe Fees)
- On success: redirect to `/claims` with new row highlighted
- On error: show inline error, do not clear form

### Inline status update
Status badge in the table is clickable. Opens a small modal with:
- New status (select)
- Payment Date Received (date — required if changing to Payment Received)
- Total Payment received (number — required if changing to Payment Received)
- Insurance Amount (number)
- Notes (textarea)
Submits PUT to `/api/claims/:rowIndex`.

---

## Phase 1D — Dashboard Module

### Metric cards (top row)
- **Sessions this month** — total + per clinician breakdown (3 sub-values)
- **Revenue this month** — total billed, by clinician
- **Pending** — count and dollar total of Pending claims
- **Received this month** — total payments received this calendar month
- **Utilization** — per clinician % of target (Shannon/Jen: 25 sessions/week target; Emily: 20 sessions/week target)

Cards use white background with gold left-border accent on the primary metric card.

### Charts
- **Revenue trend** — Recharts LineChart, last 6 months, one line per clinician. X-axis: month abbreviation. Y-axis: dollars. Teal/gold/muted color per clinician.
- **Payer mix** — Recharts BarChart showing total payment $ by payer for current month.
- **Gross margin vs income margin** — Recharts BarChart, last 6 months. Gross margin data sourced from Caseload Trends sheet (requires overhead); income margin computed from Claims.

### Aging summary
Table: four rows (0–30, 31–60, 61–90, 90+). Columns: bucket label | count | total $. Computed live from Claims where Status = Pending, using days since Claim Date. Highlight 90+ row in red if dollar amount > $0.

### Mobile
Metric cards stack full-width. Charts render at `min-width: 0` (Recharts needs explicit width management in flex containers — use `ResponsiveContainer`). Aging table is readable at mobile viewport.

---

## Business Rules & Guardrails

**HIPAA:**
- Client IDs throughout this app are hashed tokens (e.g. `fdcdd28fa306771e`), not real names. Never display, store, or transmit real client names.
- The Worker may not log request bodies that contain client data to Cloudflare's logging infrastructure.
- Do not use Resend or any email service without a HIPAA BAA for any functionality in this app. Paubox is the approved HIPAA email provider for Clarity.

**Billing rules:**
- Health Options (Medicaid) clients cannot be charged no-show fees. If Insurance = "Health Options" and Submission Method = "Cash" or Notes contains "Late Cancellation," flag this in the UI.
- Evaluation codes 96127 and 96136 were deliberately discontinued in mid-January 2026. If someone tries to submit a new claim with these codes for a date after 1/15/2026, show a warning (not a hard block).
- The 90785 code is an add-on to 90837 and cannot be billed alone. If Service Code = 90785 and there is no corresponding 90837 claim for the same client/date, show a warning.

**Highmark Health Options:**
- There is an active contract dispute with HHO. The columns "Insurance Paid (HHO)" and "Over/Under Payment (HHO)" exist to track discrepancies. Do not conflate these columns with the standard Insurance Amount column.

**Financial distinctions:**
- Revenue = money generated by session on service-date basis (Insurance Amount + Client Amount billed).
- Income = funds actually received (Total Payment where Status = Payment Received).
- Session counts for utilization exclude add-on codes (90785) and evaluation codes (96127/96136).

**Stripe fees:**
- Stripe fees apply only to client-collected payments (copays, self-pay, late cancellations). They do not apply to insurance reimbursements. Only calculate fees when Client Amount > 0.

---

## What Not to Do

- Do not store the Google service account JSON key anywhere in the codebase or git history. It lives only as a Cloudflare Worker environment secret.
- Do not add a database (Cloudflare D1 or otherwise) in Phase 1. The Sheet is the source of truth.
- Do not make the app publicly accessible. Every route assumes Cloudflare Access is enforced at the edge.
- Do not implement your own login/auth UI. Cloudflare Access handles it.
- Do not use `any` types for claim data — use the typed interfaces from `src/types/index.ts`.
- Do not combine the frontend Pages project and the API Worker into a single deployment. They are separate Cloudflare projects intentionally.
- Do not use the `clarity-site` (public Astro website) repo for anything related to this admin portal. The repos are completely independent.

---

## Pending Items Before Full Development Can Begin

1. **Confirm Cloudflare Pages is connected to GitHub repo** (Step 4) — build should succeed since scaffold is already pushed.
2. **Set up Cloudflare Access** (Step 5) — application domain should be `clarity-admin-*.pages.dev` for now; update to `admin.claritydelaware.com` after DNS cutover.
3. **Create and deploy the Worker** (Step 6) — name: `clarity-admin-api`. Add `GOOGLE_SERVICE_ACCOUNT_KEY` and `SPREADSHEET_ID` as secrets before any API calls will work.
4. **Paste the Spreadsheet ID** into this document where indicated.
5. **DNS CNAME record** (Step 7) — deferred until DNS migration to Cloudflare completes.
