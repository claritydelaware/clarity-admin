# Phase 16 — Credentialing, HR & CE Tracker

## Where this stands (2026-08-17) — read this first in a new session

**Steps 0, 1, and 2 are built.** Steps 0–1 are live in production and
confirmed working by Bruce. Step 2 (CE tracker) was built this session —
code is done and typechecks/builds clean, but **not yet deployed or
verified against live data** (see "Step 2 build notes" below). Steps 3–5
are scoped below but not started.

**Live now:**
- Spreadsheet: `Clarity Ops & Compliance` —
  https://docs.google.com/spreadsheets/d/1aDk_skyvMs_CKQUjj1wUMuMhQVleczh2aUSx9kPnkzs/edit
  — shared with the service account; `OPS_SPREADSHEET_ID` is a Worker secret.
- All 8 tabs exist with headers. `ClinicianCompliance`, `Licenses_CE`,
  `Credentialing`, and `BusinessCompliance` are seeded with verified data
  (see schema section below for exact values and sourcing). `Vendors`,
  `Onboarding`, `HR_Documents` exist with headers only — empty by design,
  not an oversight (see "Open items" below). `CE_Log` exists with headers
  only too — empty until Bruce or a clinician logs the first activity via
  the new `/ce-tracker` page.
- `/credentialing` page is live in the portal — board view grouped by
  clinician, click a payer's status pill to edit, "Add Payer" to add a row.
- Worker: `GET/POST /api/credentialing`, `PATCH /api/credentialing/:rowIndex`,
  `POST /api/maintenance/setup-ops-sheet` (idempotent — safe to rerun if
  ever needed, but shouldn't be).
- **Security note that affects how any future one-time/maintenance endpoint
  gets triggered:** the Worker has zero public entry points (workers.dev
  disabled + Cloudflare Pages service binding). The only way in is through
  the Access-gated app — Claude cannot call Worker endpoints directly
  anymore. Anything needing a one-off manual trigger has to be run from the
  browser console while logged into `admin.claritydelaware.com`, by Bruce.
- Commits: `clarity-admin-api` — `ddcd6a0` (workers_dev disabled), `6fd0685`
  (Ops Sheet setup + Credentialing CRUD). `clarity-admin` — `accff6c`
  (service binding, resolved in a parallel session, not part of this
  phase), `a4fd963` (Credentialing page), `a0be21b` (this doc). Step 2:
  `clarity-admin-api` `ef7934d` (CE endpoints, deployed via `wrangler
  deploy`), `clarity-admin` `fa3eeaf` (CE tracker page, pushed to `main` —
  Cloudflare Pages auto-deploys from there).
- Key design decision: the new tabs key off **clinician name**
  (`Shannon`/`Jen`/`Emily`/`Shana` — the existing `Clinician` union type
  used throughout the Worker for Claims), not a Staff-row UUID. Simpler,
  and avoids needing to read the live Staff sheet to cross-reference IDs.

### Step 2 build notes (2026-08-17, this session)

Built end-to-end but **not deployed** (Worker deploy + Pages deploy both
still needed) and **not tested against live data** — dev server smoke-test
only confirmed the route serves and modules compile; the Worker's
`workers.dev` is disabled so local dev can't reach real Sheets data (see
security note above). Verify in the browser at `admin.claritydelaware.com`
after deploying both repos.

- **Worker** (`clarity-admin-api/src/index.ts`): `GET/POST /api/ce/log`,
  `PATCH /api/ce/log/:rowIndex`, `GET /api/ce/status`. Status is a computed
  rollup (never stored) — for each clinician's **DE license row only** in
  `Licenses_CE` (DE is the primary practice license; out-of-state CE
  requirement columns for Shannon/PA+FL and Jen/VA are still blank, see
  "Open items" below), it sums `CE_Log` hours within `[cycleStart,
  cycleEnd]`, splits out an Ethics-category subtotal and an
  otherSubRequirementLabel-category subtotal, and derives a status of `On
  Track` / `Behind Pace` / `At Risk` by comparing % of the cycle elapsed
  against % of hours completed (10% gap tolerance for "On Track", 30% for
  "Behind Pace", anything worse or a cycle that's already ended without
  meeting the requirement is "At Risk"). One known gap: `CE_Log` doesn't
  capture whether an activity was self-directed, so `selfDirectedCapHours`
  is surfaced for display only — not enforced against actual logged hours.
- **Frontend:** new `/ce-tracker` page (`src/pages/CETracker.tsx`), one
  card per clinician mirroring the `/credentialing` layout — overall
  progress bar (reuses the existing `ProgressBar` component from the
  Dashboard utilization bars), Ethics + other-sub-requirement bars,
  `CEStatusBadge` (new, added to `Badge.tsx`), a "Log Activity" button
  opening `CELogModal` (new, mirrors `CredentialingModal`'s form pattern),
  and a click-to-edit activity list below. Category dropdown in the modal
  is scoped per clinician (`General` + `Ethics` + that clinician's
  `otherSubRequirementLabel` — LPCMH vs. LCSW have different sub-requirement
  shapes, so this isn't a global enum). New hook file `src/hooks/useCE.ts`.
  Nav item added to `Sidebar.tsx` (GraduationCap icon) and route to
  `App.tsx`.
- Both `tsc --noEmit` (Worker) and `npm run build` (frontend, `tsc -b &&
  vite build`) pass clean.

**Not started:** Step 3 (Vendor & business compliance pages), Step 4 (HR
documents + onboarding checklist), Step 5 (Dashboard compliance digest
card). See "Rollout sequence" below for what each needs.

## Open items — status as of 2026-08-17 session

- **Which step next?** Still open — Bruce chose to resolve the items below
  before picking Step 2/3/4. Ask again next session if not already decided.
- **Malpractice policy — RESOLVED.** Bruce downloaded individual
  certificates-of-insurance for all five people (Bruce + 4 clinicians) from
  CPH Insurance. All five certs show the *same* Policy # AR439977, Policy
  Term 06/14/2026–06/14/2027, issued by Philadelphia Indemnity Insurance
  Company — confirming this is one group policy, not per-clinician
  coverage. Seed `ClinicianCompliance.malpracticePolicyNumber = AR439977`
  and `malpracticeExpiration = 6/14/2027` for all four clinicians once the
  write path exists (no PATCH endpoint yet — see below). Coverage:
  Professional Liability $1M/$3M, Supplemental Liability $1M/$3M, Licensing
  Board Defense $35K, Cyber Liability $15K (retroactive date 6/14/2025).
  Annual premium confirmed via a separate CPH receipt in Drive: $906.00
  ($707 professional liability + $87 separate limits + $87 cyber + $25
  admin fee), paid 6/6/2026 by card ending 9844.
  **Unresolved sub-item:** the 5 cert PDFs are sitting in Bruce's local
  Downloads folder (`Certificate_{Name} N.pdf`, downloaded 2026-08-17).
  Precedent in Drive (`HR Files/Emily/Insurance_Certificate_Emily
  Bryant.pdf`) is one cert per person, filed directly in that person's `HR
  Files/{Name}/` folder — Bruce should upload the new ones there,
  replacing/dating the old ones, once he has a moment.
- **CAQH last-attestation dates — confirmed still blank, not a blocker.**
  Bruce confirmed he doesn't currently have access to each clinician's last
  CAQH attestation date. `ClinicianCompliance.caqhLastAttestation` stays
  unpopulated until he has a workflow for checking CAQH ProView directly —
  don't build tooling around this until then.
- **Out-of-state CE requirements — RESOLVED via state board research
  (2026-08-17, web search, not primary-source-verified against the actual
  board regulations — spot-check before publishing to a clinician-facing
  view):**
  - **Shannon / PA (LPC, license PC020405):** 30 CE hours per 2-year
    cycle (biennial renewal Feb 28, even years) — different total from her
    DE requirement (40 hrs). Required sub-topics: 3 hrs ethics, 2 hrs
    Child Abuse Recognition & Reporting (Act 31), 1 hr Suicide
    Prevention/Assessment (Act 74). Up to 20 hrs may be home study. First
    renewal after initial licensure is exempt from the full 30 (Act 31
    still required). Source: [PA Code 49 Pa. Code § 49.32](https://www.pacodeandbulletin.gov/Display/pacode?file=/secure/pacode/data/049/chapter49/s49.32.html&d=reduce), [Triad PA LPC CE Requirements](https://www.triadhq.com/ce-requirements/pennsylvania/lpc).
  - **Shannon / FL (LMHC, license MH27670):** 30 CE hours per biennium
    (due March 31, odd years), broken down as 25 general + 3 ethics &
    boundaries + 2 medical errors. Periodic add-ons: 3 hrs FL laws/rules
    every 3rd renewal, 2 hrs domestic violence every 6 years. All hours
    must be reported to CE Broker. First renewal is CE-exempt. Source:
    [Program Services — FL CE Requirements](https://programservices.org/news-highlights/recent-changes-in-the-florida-mental-health-continuing-education-requirements), [CE4Less FL Counselor Requirements](https://ce4less.com/counseling-ce/florida-counselor-requirements/).
  - **Jen / VA (LCSW, license 0904020782):** 30 contact hours per 2-year
    cycle, minimum 6 of those hours in ethics/standards-of-practice/VA
    social work law. Up to 10 of the 30 hours may be Category II
    activities. Source: [VA Board of Social Work — Continuing Education](https://www.dhp.virginia.gov/Boards/SocialWork/PractitionerResources/ContinuingEducation/), [Agents of Change — VA Social Work CE](https://agentsofchangeprep.com/blog/virginia-social-work-licensure-renewal-dates-and-ce-requirements/).
  - Not yet added as columns/rows in `Licenses_CE` — this is reference
    data for whoever builds Step 2, not yet written to the Sheet.
- **Vendor data sourcing — first pass done, not yet seeded to the
  `Vendors` tab (still deliberately empty per Bruce's scaffold-then-fill
  call).** Scanned `Receipts & Invoices/Business Expenses 2026/` (Drive
  folder ID `1HX2lDErmhoEZ-GTcUj4rjWjSdhheE9NR`) across its
  category-subfolders. Real recurring vendors found, with actual 2026
  costs (several diverge meaningfully from the stale Master-Doc estimates
  — do not reuse those old numbers):
  - **Traktion Accounting** (bookkeeping + payroll processing + tax) —
    this *is* the "CPA (~$750/mo)" line from the Master Doc, but it's a
    bookkeeping firm, not a traditional CPA. ~$750/mo base (Done-for-You
    Bookkeeping + Stress Free Payroll), fluctuates with credits/discounts
    and add-ons (e.g. a $1,400 business tax return line in July 2026, a
    retroactive fee adjustment down to $600/mo).
  - **SimplePractice** (EHR) — NOT flat $212/mo as the Master Doc said;
    actual invoices climbed from $247/mo (Jan 2026) to $396.75 (July
    2026), scales with usage/clinician count.
  - **Google Workspace** — $50.40/mo (Jan) rising to $84/mo (Aug) as
    headcount grew; separate from Google Voice telecom billing (~$75–125/mo,
    its own line, found under `Utility/`).
  - **Paubox** (HIPAA email) — $82.85 charge found (June 2026); doesn't
    cleanly match the Master Doc's "$29/mo billed yearly" — could be an
    annual renewal or an add-on, needs a closer look before seeding.
  - **Northwest Registered Agent** — three separate services, not one
    line: DE Registered Agent Service $125/yr (renews 4/28), DE Virtual
    Office Mail Forwarding $39/mo, Phone Service (302) 204-4800 $9/mo.
  - **Gusto** — payroll base $49–80/mo + $6–12/employee + occasional
    Background Check ($39.99) and Gusto Learning ($19.95) line items;
    varies month to month, not a flat fee.
  - **NEXT Insurance** (workers comp, billed via Gusto) — Policy
    QWC1484326, effective 2025-08-05 to 2026-08-05, ~$0–30/mo depending on
    payroll that period.
  - **CPH Insurance** — see malpractice section above; $906/yr.
  - **Anthropic (Claude)** — $20/mo flat.
  - **OpenAI (ChatGPT)** — $20/mo flat (Jan–Feb 2026 invoices; check if
    still active).
  - **SiteGround** — $24/mo Domain Protect + a $539.88 annual web hosting
    charge (4/19/2026).
  - **WP Engine** — $49/mo (ACF Pro).
  - **Cloudflare** — one-time $10.46 domain transfer, not recurring.
  - **Meta (Facebook/Instagram Ads)** — settled around $92/mo since
    ~April 2026, was ramping up before that (marketing spend, not really a
    "vendor" in the BAA/renewal sense, but flagged in case Vendors ends up
    tracking ad spend too).
  - **Psychology Today** — $29.95/mo profile listing.
  - **Amazon** — one-off equipment (laptops $1,049.99 and $1,699.98,
    office furniture) — not a recurring vendor line.
  - Not yet checked: QBO expense categories, Gusto's own document store
    (per Bruce's stated priority order this was step 2 and 3 of sourcing —
    still pending). GoDaddy, Envato, Identogo (mentioned in an earlier
    partial scan) weren't seen in this pass — may be in the 2025 folder or
    a different category subfolder not yet opened.

## Context

Everything the portal does today runs through the revenue cycle (Claims Sheet)
or bookkeeping (QBO). Nothing covers the other half of Bruce's job as
Administrative Partner: **credentialing, HR, and CE/license compliance.**
Today that lives entirely in a Google Doc (`Master Startup Document`) and a
manually-organized Google Drive folder tree (`HR Files/`, `Insurance
Contracts/Highmark BCBS/`, etc.) — no due-date tracking, no alerts, nothing
queryable.

**Read this before writing any code.** This phase pulls real structure from
two sources already in Bruce's Drive — don't re-derive a schema from
scratch when one is already implied by what's there.

### What's already in the Master Startup Document (verified 2026-08-17)

Per-clinician data that has no home in the portal today:
- **Shannon Tarolli (LPCMH):** NPI 1255841052, CAQH 14374422. Three active
  state licenses — DE (PC-0000932, exp. 9/30/2026), PA (PC020405, exp.
  2/28/2027), FL (MH27670, exp. 3/31/2027). **CE requirement: 40 hrs per
  renewal period.**
- **Jennifer Meehan (LCSW):** NPI 1245746825, CAQH 14373164. Two states — DE
  (Q1-0001672, exp. 1/31/2027), VA (0904020782, exp. 6/30/2027). Doc said
  **"45 hrs per renewal period" — this is wrong**, corrected to 40 (see
  `Licenses_CE` schema below for the verified figure and sourcing).
- **Emily Bryant / Shana Petruccelli (LCSW, employees):** NPI/CAQH/license
  data present. Doc had no CE hour requirement for either — resolved as 40
  hrs, same as Jen, since all three are LCSW (see `Licenses_CE` below).
- **Per-payer credentialing is mid-flight right now for Shana**, tracked as
  loose notes in the doc: Aetna (submitted 5/9, confirmed 5/20, effective
  6/4/26), Blue Shield (submitted 5/11, "Add Provider" form 5/11, appeared in
  Provider Data Maintenance 5/28), United (submitted 5/20, effective 6/9).
  This exact multi-step-per-payer shape is what the Credentialing tab needs
  to model — it's not a single status field, it's a mini-lifecycle per
  clinician × payer.
- **Business compliance dates:** Delaware Business License annual renewal
  (Dec 31), Delaware Annual Report (due Mar 1), Professional/Cyber/General
  Liability Insurance (CPH Insurance, policy AR439977 — no renewal date
  captured anywhere yet).
- **Vendor list with real costs:** SimplePractice ($212/mo), Google
  Workspace ($16.80/user), Paubox ($29/mo billed yearly), Gusto ($67/mo +
  per-employee fees, confirmed via the June 2026 invoice in Drive), QBO
  ($35/mo), CPA (~$750/mo). None of this is tracked for renewal dates or BAA
  status today.

### What's already in Drive Folder structure (verified 2026-08-17)

`HR Files/` (parent `1xmfkujJoez08HodwPWQ7_YEyqo5R62VA`) already has one
subfolder per person (Shana, Emily, Shannon, Jen, Bruce), plus shared docs
(Computer Use Policy, Job Description templates, a "New Hire Onboarding
Form" example). Each person's folder already has this substructure (checked
Emily's):

```
Emily/
├── Onboarding Materials/
├── Identity Docs/
├── Professional Development/     ← this is the CE/CEU folder, unlabeled as such
├── Billing Sheets/
├── HIPAA Certificate 2026.pdf
├── Insurance_Certificate_Emily Bryant.pdf
├── Emily Bryant - Mandatory_Reporting.pdf
└── Emily_Bryant_HIPAA_for_covered_entities.pdf
```

Separately, `Insurance Contracts/` (parent `1DfgD3g5h3dhPtpFFV9e0CWGy8h93P41Q`)
has one subfolder per payer (Highmark BCBS, etc.) holding contracts, welcome
letters, and initial-credentialing confirmation PDFs per clinician.

**Conclusion: Drive is already the document store and it's already
well-organized.** This phase should index it (links + dates + status), not
duplicate it. Nothing gets re-uploaded into a Sheet or the portal.

---

## Architecture decision: new spreadsheet, not new tabs on Claim Tracking

You asked whether this belongs in a new Google Sheet vs. new tabs on the
existing "Claim Tracking" workbook. **New spreadsheet.** Reasons:

1. **Blast radius.** The Claims workbook is ~1,900+ rows and growing, and a
   meaningful share of the Worker's code reads it by fixed column letter
   (`A:Y`, batched updates split across `A:P`/`R:Y` to avoid clobbering a
   formula column, etc. — see `DECISIONS.md`). Adding unrelated tabs to that
   workbook doesn't touch that code, but it does mean anyone (including a
   future Claude session) editing the workbook structure is now one careless
   move away from breaking billing. Keeping this data in its own workbook
   means nothing about Claims can be affected by a Compliance/HR change, ever.
2. **Different sensitivity class.** Claims data is billing/PHI-adjacent
   (hashed client IDs, clinical CPT codes). This new data is
   personnel/business data (comp history, credentialing PINs, vendor
   contracts) — a different risk category that's cleaner to reason about,
   and potentially share/permission differently later, if it lives
   separately.
3. **Precedent doesn't extend cleanly.** Staff already lives in the Claims
   workbook, but that was a 20-column comp-rate table. This phase adds
   credentialing lifecycles, CE logs, vendor contracts, and onboarding
   checklists — a materially larger and differently-shaped dataset that
   deserves its own identity rather than being bolted onto "Claim Tracking."

**Cost of this choice:** one new Worker secret (`OPS_SPREADSHEET_ID`) and the
Worker's Sheets client needs to target the right spreadsheet per endpoint
group. Small, contained, same pattern already in use for `SPREADSHEET_ID`.

**Proposed name:** `Clarity Ops & Compliance`

---

## What NOT to store in the sheet

The Master Doc itself currently has clinician DOBs, and one clinician's
laptop **FileVault recovery key** in plaintext. Neither should be
replicated into a new Sheet-backed system, even one only Bruce can access:

- **No DOB, SSN, or other raw personnel PII as field values.** Track
  *document links* (I-9 on file: yes/no + Drive link + date), never the
  underlying values.
- **No device recovery keys / credentials of any kind.** If an equipment
  register is ever wanted, track asset tag + assigned-to + serial number
  only. Recovery keys belong in a password manager, not a spreadsheet with
  the same access model as a "which clinician licenses expire when" tracker.

This mirrors the existing hashed-Client-ID principle in `CLAUDE.md` — the
portal should hold the minimum data needed to act, and point to the
authoritative document for everything else.

---

## Sheet schema — `Clarity Ops & Compliance` workbook

**Note on keying:** the original scoping below assumed a `StaffId` FK into
the Claims workbook's Staff tab. What actually got built for `Credentialing`
uses **clinician name** instead (see "Key design decision" up top) — the
column tables below are updated to match for `Credentialing`. Steps 2–5
haven't been built yet; when they are, follow the same clinician-name
convention for consistency, not the `StaffId`/`LicenseId` FK columns shown
below for the still-unbuilt tabs — update those tables at build time.

### Tab: `Credentialing` — ✅ built, matches this
One row per clinician × payer. Models the real multi-step lifecycle seen in
Shana's in-flight applications, not just a single status.

| Column | Notes |
|---|---|
| clinician | `Shannon` / `Jen` / `Emily` / `Shana` — not a Staff-row FK |
| payer | Aetna, Meritain, BCBS, United, Medicare, Health Options, etc. |
| status | Not Started / Submitted / Additional Info Requested / Confirmed / Effective / Denied / Terminated |
| dateSubmitted | |
| dateEffective | |
| providerIdentifier | PIN / Blue Shield ID / PTAN — whatever that payer issues |
| caqhLinked | Y/N |
| contractLink | Drive URL, points into the existing per-payer `Insurance Contracts/` folders |
| notes | Free text — the log-style notes already being kept in the Master Doc move here |

### Tab: `ClinicianCompliance` — seeded, no CRUD endpoint yet
One row per clinician — the CAQH/malpractice layer that sits above
per-license, per-payer detail. Currently write-only via the setup script;
no `GET/PATCH /api/clinician-compliance` yet (Step 2 territory, since CE
status will want to read from this).

| Column | Notes |
|---|---|
| clinician | Same keying as Credentialing |
| npi, caqhId, taxonomy | From Master Doc — seeded |
| caqhLastAttestation | Blank for all — not tracked by Bruce currently |
| caqhNextDue | Computed: last attestation + ~120 days (industry-standard cycle — confirm actual payer requirement) |
| malpracticePolicyNumber | Blank — see "Open items" above (group vs. individual policy question) |
| malpracticeExpiration | Blank |

### Tab: `Licenses_CE` — seeded, no CRUD endpoint (by design — see below)
Extends the existing `Staff_Licenses` tab (in the Claims workbook, which
keeps tracking licenseType/number/state/expiration) with the CE dimension.
Seeded for all DE licenses; out-of-state (Shannon/PA+FL, Jen/VA) still have
dates only — their hour requirements were researched 2026-08-17 (see "Open
items" above) but not yet written into this tab, since `/api/ce/status`
(Step 2) only reads the DE row per clinician.

| Column | Notes |
|---|---|
| clinician, licenseType, licenseState | |
| ceHoursRequired | 40 for all four (LCSW: Jen/Emily/Shana; LPCMH: Shannon) — both confirmed against Delaware DPR, but via *different* sub-requirement structures, see next column |
| ethicsHoursRequired, otherSubRequirementLabel, otherSubRequirementHours | LCSW: 6 ethics + 1 "Mandatory Reporting". LPCMH: 3 ethics + 3 "Cultural Inclusion, Equity & Diversity". Not the same shape — don't assume one and copy to the other |
| selfDirectedCapHours | LCSW: 10. LPCMH: not verified |
| cycleStart, cycleEnd | LCSW: Feb 1–Jan 31, odd years. LPCMH: Oct 1–Sept 30, even years |

**Built in Step 2**, computed by the Worker from `CE_Log` on every
`GET /api/ce/status` call, never stored:
- `hoursCompleted`, `ethicsHoursCompleted`, `otherSubRequirementHoursCompleted`
- `status` — On Track / Behind Pace / At Risk, computed from hours-completed
  vs. time-elapsed-in-cycle (10%/30% pace-gap thresholds; see Step 2 build
  notes up top for the exact rule)

### Tab: `CE_Log` — headers only, empty; CRUD live via Step 2
One row per completed CE/CEU activity, added going forward via the
`/ce-tracker` page — this *is* the "Professional Development" Drive folder,
indexed instead of just filed.

| Column | Notes |
|---|---|
| clinician | |
| activityTitle, provider | |
| dateCompleted, hours | |
| category | General / Ethics / Mandatory Reporting / Cultural Inclusion Equity & Diversity, etc. — match whatever sub-requirement it counts toward. No `isSelfDirected` flag exists, so `selfDirectedCapHours` (above) isn't enforced against real entries yet. |
| certificateLink | Drive URL into `Professional Development/` |

### Tab: `Vendors` — headers only, empty (deliberately)
| Column | Notes |
|---|---|
| vendorName, category | EHR / Payroll / Accounting / Insurance / Legal / Tech / Marketing |
| monthlyCost, annualCost | **Do not seed from the Master Doc** — Bruce flagged those as stale startup estimates. Source from `Receipts & Invoices/` + QBO + Gusto instead, see "Open items" above |
| renewalDate | |
| baaOnFile | Y/N — flags HIPAA-relevant vendors (Paubox, Google Workspace, SimplePractice all need this) |
| contractLink, notes | |

### Tab: `BusinessCompliance` — seeded (2 rows), no CRUD endpoint yet
Recurring business obligations — regulatory due-dates, not cost estimates,
so these were safe to seed directly from the Master Doc.

| Column | Notes |
|---|---|
| item | "Delaware Business License Renewal," "Delaware Annual Report" — 2 rows seeded |
| recurrenceRule | Annual on Dec 31 / Annual on Mar 1 |
| lastCompleted, nextDue | Blank — NextDue computation not built yet |
| documentLink, notes | |

### Tab: `Onboarding` — headers only, empty
One-time checklist per new hire, templated from what's already implied by
Emily's folder structure (Onboarding Materials, Identity Docs, HIPAA cert,
Mandatory Reporter cert, Computer Use Policy) plus the "New Hire Onboarding
Form" example already sitting in Drive. No current new hire in progress, so
nothing to seed yet — the checklist item list itself should probably live
as a constant in code (mirroring how `CLAIM_STATUSES` is a fixed array),
not as template rows in the sheet.

| Column | Notes |
|---|---|
| clinician, checklistItem | Offer letter signed / I-9 collected / W-4 collected / direct deposit setup / laptop provisioned / Google Voice assigned / EHR seat created / HIPAA training / Mandatory Reporter training / Computer Use Policy signed / NPI obtained / CAQH profile created / credentialing kicked off |
| dueDate, completedDate, status | |
| documentLink | Where applicable |

### Tab: `HR_Documents` — headers only, empty
Ongoing document index (separate from the one-time Onboarding checklist,
since some docs recur — e.g. HIPAA cert appears to be annual: "HIPAA
Certificate 2026"). Future source includes Gusto, not just Drive — links
only, per "What NOT to store."

| Column | Notes |
|---|---|
| clinician, documentType | Offer Letter / I-9 / W-4 / HIPAA Cert / Mandatory Reporter Cert / Computer Use Policy / Insurance Certificate / Job Description / Other |
| driveLink, dateOnFile, expirationDate | expirationDate nullable — most are one-time, HIPAA/Mandatory Reporter recur |

---

## Worker endpoints (new, `clarity-admin-api/src/index.ts`)

All new endpoints read/write `OPS_SPREADSHEET_ID` instead of the existing
`SPREADSHEET_ID`. Same auth model, same service account, just a second
target spreadsheet — no new external dependency, no CORS/security-policy
change.

```
✅ GET/POST/PATCH  /api/credentialing
⬜ GET             /api/clinician-compliance
✅ GET/POST/PATCH  /api/ce/log             — built, not yet deployed (see Step 2 build notes up top)
✅ GET             /api/ce/status          — computed rollup: hours completed vs. required vs. cycle end, per clinician; built, not yet deployed
⬜ GET/POST/PATCH  /api/vendors
⬜ GET/POST/PATCH  /api/business-compliance
⬜ GET/POST/PATCH  /api/onboarding
⬜ GET/POST/PATCH  /api/hr-documents
⬜ GET             /api/compliance-digest  — cross-tab rollup: everything due in the next 30/60/90 days, for the Dashboard alert card
✅ POST            /api/maintenance/setup-ops-sheet  — one-time tab/seed setup, already run
```

## Frontend

Nav item(s) added to the existing flat sidebar list (not a grouped section —
that's how the sidebar already works, see Sidebar.tsx):

| Route | Page | Status | Notes |
|---|---|---|---|
| `/credentialing` | Board view grouped by clinician, colored status pills | ✅ Live | Reuses the monday.com-style board patterns from Phase 14 |
| `/ce-tracker` | Per-clinician progress bars (hours completed / required) | ✅ Built, not deployed | Reuses the Dashboard `ProgressBar` component; new `CEStatusBadge` + `CELogModal` + `useCE.ts` hook — see Step 2 build notes up top |
| `/vendors` | Table with renewal countdown badges | ⬜ Not started | Same expiry-badge pattern already built for Staff license warnings |
| `/compliance` | Business compliance list/calendar with countdown badges | ⬜ Not started | |
| `/staff/:id` | **Extend**, not new | ⬜ Not started | Add Credentialing / CE / HR Documents / Onboarding sections to the existing StaffDetail page — keeps this attached to the profile a user already knows, instead of scattering it across five disconnected pages |

**Dashboard:** one new "Compliance Alerts" card next to the existing
capacity-alert banner — everything from `/api/compliance-digest` due in the
next 30/60/90 days (license expirations already partially exist; this adds
CAQH attestations, CE hours falling behind pace, vendor renewals, business
compliance deadlines) in one place.

---

## Rollout sequence

1. ~~**Step 0 — Infrastructure.**~~ **Done.** Spreadsheet created, shared,
   secret added, tabs created and seeded.
2. ~~**Step 1 — Credentialing tracker.**~~ **Done.** Live at `/credentialing`.
3. ~~**Step 2 — CE/CEU tracker.**~~ **Code done, not yet deployed or
   verified live** (2026-08-17). See "Step 2 build notes" up top before
   deploying — needs `npx wrangler deploy` in `clarity-admin-api/` and a
   Pages deploy for `clarity-admin/`, then a real browser check at
   `admin.claritydelaware.com/ce-tracker` since local dev can't reach live
   Sheets data.
4. **Step 3 — Vendor & business compliance register** (not started).
   `Vendors` exists but deliberately unseeded (see "Vendor data sourcing"
   above). `BusinessCompliance` has 2 seeded rows already. Needs CRUD
   endpoints + `/vendors` and `/compliance` pages with renewal countdown
   badges (reuse the expiry-badge pattern from Staff license warnings).
5. **Step 4 — HR documents + onboarding checklist** (not started). Wire
   into the existing `StaffDetail.tsx` page rather than a new route.
6. **Step 5 — Dashboard compliance digest card** (not started). Needs at
   least 2–3 of Steps 2–4 built first to have something to roll up.

Each step should ship a working app, same incremental-rollout discipline
as Phase 14.
