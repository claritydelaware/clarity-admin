# Phase 16 — Credentialing, HR & CE Tracker

## Status (2026-08-17)

- **Spreadsheet created:** `Clarity Ops & Compliance` —
  https://docs.google.com/spreadsheets/d/1aDk_skyvMs_CKQUjj1wUMuMhQVleczh2aUSx9kPnkzs/edit
- **Shared with the service account and `OPS_SPREADSHEET_ID` Worker secret
  added — both done by Bruce.**
- **`POST /api/maintenance/setup-ops-sheet` is written** in
  `clarity-admin-api/src/index.ts` — creates all 8 tabs with headers
  (idempotent — checks existing tab titles first) and seeds verified
  reference data into `ClinicianCompliance`, `Licenses_CE`, `Credentialing`,
  and `BusinessCompliance` (idempotent there too — only seeds a tab if it's
  still header-only). `Vendors`, `CE_Log`, `Onboarding`, `HR_Documents` are
  created with headers only, no seed rows, per the sourcing notes below.
  Type-checks clean, existing 29-test Vitest suite still passes.
- **Deployed (2026-08-17):**
  - `clarity-admin-api` — `ddcd6a0` (workers_dev disabled) + `6fd0685`
    (Ops Sheet setup + Credentialing CRUD), deployed via `wrangler deploy`.
    Current Worker version `6f0e6fec-0bbf-4e81-9a76-6a9bd4a4236b`.
  - `clarity-admin` — `a4fd963` (Credentialing page, Step 1), pushed to
    `origin/main`. Cloudflare Pages auto-deploys from this branch.
- **One manual step left, and it has to be you, not me.** Now that
  `WORKER_API_SECURITY_FIX.md` Part A is live (see below), the Worker has
  no public URL — the only path in is through the Access-gated Pages
  Function. I can't authenticate through Cloudflare Access from here, so I
  can't call the one-time setup endpoint myself anymore (this is the
  security fix working as intended, not a bug). Once you're logged into
  `admin.claritydelaware.com`, open the browser console and run:
  ```js
  fetch('/api/maintenance/setup-ops-sheet', { method: 'POST' })
    .then(r => r.json()).then(console.log)
  ```
  That builds all 8 tabs with headers and seeds the verified reference data
  in one call — safe to run more than once (idempotent). You should see
  `{ tabsCreated: [...8 names], dataSeeded: [...4 names] }` on first run,
  and `{ tabsCreated: [], dataSeeded: [] }` on any re-run.
- Key design decision made while writing this: the new tabs key off
  **clinician name** (`Shannon`/`Jen`/`Emily`/`Shana` — the same `Clinician`
  union type already used throughout the Worker for Claims), not a Staff-row
  UUID. Simpler, and avoids needing to read the live Staff sheet to
  cross-reference IDs.
- `WORKER_API_SECURITY_FIX.md` Part A is now fully resolved — Bruce applied
  it in a parallel session (`clarity-admin` commit `accff6c`, service
  binding) while this phase's `clarity-admin-api` commit `ddcd6a0` disabled
  the `workers_dev` route on this side. The Worker has zero public entry
  points now.
- **Step 1 (Credentialing) is built and deployed**, not just scoped: board
  view at `/credentialing`, one card per clinician, click a payer's status
  pill to edit, "Add Payer" to create a new row. `Worker: GET/POST
  /api/credentialing`, `PATCH /api/credentialing/:rowIndex`.

## Corrections from Bruce (2026-08-17)

- **CE hours — Master Doc's "45 hrs" for LCSW is wrong.** Delaware's Board
  of Social Work Examiners page (dpr.delaware.gov) confirms **40 CE hours
  per 2-year renewal cycle (Feb 1–Jan 31, odd years) for LCSW**, with a
  minimum of 6 ethics hours and 1 mandatory-reporting hour inside that 40,
  and a cap of 10 self-directed/independent-study hours. Since Emily and
  Shana are also LCSW (confirmed by Bruce), **all three (Jen, Emily, Shana)
  get 40 hrs / 6 ethics / 1 mandatory-reporting / ≤10 self-directed** — not
  45. Shannon's LPCMH figure (40 hrs, from the Master Doc) was not
  independently re-verified this session — different board
  (Board of Mental Health & Chemical Dependency Professionals), not
  Social Work.
- **Credentialing status corrected for Shana and Emily.** Both are fully
  credentialed with **BCBS, United, Aetna/Meritain, and Medicare** —
  explicitly **NOT Health Options**. The Master Doc's snapshot of Shana's
  applications (dated May 2026, "Submitted"/"Confirmed" language) is
  stale — current status for both is Effective across all four. Shannon
  and Jen's current per-payer status (as the original 2025 credentialing
  cohort, plausibly including Health Options) was **not** confirmed this
  session — need to ask before seeding their Credentialing rows.
- **Vendor data must come from `Receipts & Invoices` + QBO, not the Master
  Doc.** Bruce flagged the Doc's cost table as a stale startup-phase
  estimate. A scan of the `Receipts & Invoices/New Receipts` Drive folder
  found real invoices for: Gusto (verified — July 2026 invoice: $141.94
  total = $49 base + $30 employee fees [5 @ $6] + $39.99 background check
  + $19.95 Gusto Learning + $3 workers comp), GoDaddy, SiteGround, Northwest
  Registered Agent, OpenAI, Envato, Psychology Today, and Identogo
  (background checks), plus a receipt tied to the CPH Insurance policy
  (AR439977) referenced in the Master Doc. Only Gusto's amount was actually
  read this session — the rest are named but unconfirmed. See open
  questions.

## Corrections from Bruce, round 2 (2026-08-17)

- **Shannon and Jen are credentialed on the same 4 payers as Shana/Emily
  (BCBS, United, Aetna/Meritain, Medicare) *plus* Health Options** — they
  are Health Options providers, Shana/Emily are not. Seeded accordingly.
- **Shannon is LPCMH, not LCSW — different board, different CE structure.**
  Checked Delaware's Board of Mental Health & Chemical Dependency
  Professionals: LPCMH is also 40 hrs / 2-yr cycle, but the sub-requirement
  split is different from LCSW's — **3 ethics hrs + 3 cultural inclusion/
  equity/diversity hrs** (vs. LCSW's 6 ethics + 1 mandatory-reporting), and
  the cycle runs Oct 1–Sept 30 on even years rather than LCSW's Feb 1–Jan 31
  odd years. This confirms the original instinct to not assume LPCMH and
  LCSW share a form — they're structurally different, not just different
  numbers.
- **Vendor sourcing, expanded:** in addition to `Receipts & Invoices`
  (which has separate 2025 and 2026 subfolders — only briefly checked this
  session) and QBO, **Gusto also holds personnel documents** worth indexing
  into `HR_Documents` eventually (I-9s, offer letters, etc. — Bruce
  mentioned storing docs there). Not pulled this session — Gusto employee
  records include SSN/DOB-adjacent fields, and per the "don't store raw
  PII" boundary above, any future pull from Gusto should extract document
  *links*, not the underlying personnel data fields.
- **Vendor tab is intentionally a scaffold, not a launch deliverable.**
  Bruce wants to keep developing it but isn't in a hurry to populate it
  accurately right now — headers exist in the sheet, no seed rows. Revisit
  once there's time to do a proper receipts/QBO reconciliation pass.

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
  (Q1-0001672, exp. 1/31/2027), VA (0904020782, exp. 6/30/2027). **CE
  requirement: 45 hrs per renewal period.**
- **Emily Bryant / Shana Petruccelli (LCSW, employees):** NPI/CAQH/license
  data present, but **no CE hour requirement recorded for either** — open
  question below.
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

### Tab: `Credentialing`
One row per clinician × payer. Models the real multi-step lifecycle seen in
Shana's in-flight applications, not just a single status.

| Column | Notes |
|---|---|
| StaffId | FK to Staff tab in the Claims workbook |
| Clinician | Denormalized for readability |
| Payer | Aetna, Highmark BCBS, Health Options, UnitedHealthcare, Medicare, etc. |
| Status | Not Started / Submitted / Additional Info Requested / Confirmed / Effective / Denied / Terminated |
| DateSubmitted | |
| DateEffective | |
| ProviderIdentifier | PIN / Blue Shield ID / PTAN — whatever that payer issues |
| CAQH Linked | Y/N |
| ContractLink | Drive URL, points into the existing per-payer `Insurance Contracts/` folders |
| Notes | Free text — the log-style notes already being kept in the Master Doc move here |
| LastUpdated | |

### Tab: `ClinicianCompliance`
One row per clinician — the CAQH/malpractice layer that sits above
per-license, per-payer detail.

| Column | Notes |
|---|---|
| StaffId | FK |
| NPI, CAQH ID, Taxonomy | From Master Doc |
| CAQH Last Attestation | |
| CAQH Next Due | Computed: last attestation + ~120 days (industry-standard cycle — confirm actual payer requirement) |
| Malpractice Policy # | |
| Malpractice Expiration | |

### Tab: `Licenses_CE` (extends existing Staff_Licenses, doesn't replace it)
Staff_Licenses (in the Claims workbook) already tracks licenseType/number/
state/expiration — that stays put. This tab adds the CE dimension per
license:

| Column | Notes |
|---|---|
| LicenseId | FK to Staff_Licenses row |
| CE Hours Required | 40 for all three LCSWs (Jen, Emily, Shana), confirmed via DE Board of Social Work Examiners. Shannon (LPCMH) carries the Master Doc's 40-hr figure, not independently re-verified. |
| Ethics Hours Required | LCSW: 6 hrs minimum (of the 40). Also 1 hr mandatory-reporting minimum, and a 10-hr cap on self-directed/independent study — worth their own columns rather than folding into "ethics." Shannon/LPCMH sub-requirements not yet checked. |
| Cycle Start / Cycle End | LCSW cycle is fixed (Feb 1–Jan 31, odd years) regardless of hire date — not a rolling window from license-issue date |
| Hours Completed | **Computed by the Worker** from `CE_Log`, not manually maintained — same pattern as derived Claims fields |
| Status | On Track / Behind Pace / At Risk — computed from hours-completed vs. time-elapsed-in-cycle |

### Tab: `CE_Log`
One row per completed CE/CEU activity — this *is* the "Professional
Development" folder, indexed.

| Column | Notes |
|---|---|
| StaffId, LicenseId | |
| ActivityTitle, Provider/Sponsor | |
| DateCompleted, Hours | |
| Category | General / Ethics / Suicide Prevention / Cultural Competency, etc. |
| CertificateLink | Drive URL into `Professional Development/` |

### Tab: `Vendors`
| Column | Notes |
|---|---|
| VendorName, Category | EHR / Payroll / Accounting / Insurance / Legal / Tech / Marketing |
| MonthlyCost, AnnualCost | Seeded from Master Doc's cost table |
| RenewalDate | |
| BAA_OnFile | Y/N — flags HIPAA-relevant vendors (Paubox, Google Workspace, SimplePractice all need this) |
| ContractLink, ContactName/Email, Notes, Status | |

### Tab: `BusinessCompliance`
Recurring business obligations — currently exist only as memory/the Master
Doc.

| Column | Notes |
|---|---|
| Item | "Delaware Business License Renewal," "Delaware Annual Report," "Professional Liability Renewal," etc. |
| RecurrenceRule | Annual on Dec 31 / Annual on Mar 1 / etc. |
| LastCompleted, NextDue | NextDue computed from recurrence + LastCompleted |
| DocumentLink, ResponsibleParty, Status | |

### Tab: `Onboarding`
One-time checklist per new hire, templated from what's already implied by
Emily's folder structure (Onboarding Materials, Identity Docs, HIPAA cert,
Mandatory Reporter cert, Computer Use Policy) plus the "New Hire Onboarding
Form" example already sitting in Drive.

| Column | Notes |
|---|---|
| StaffId, ChecklistItem | Offer letter signed / I-9 collected / W-4 collected / direct deposit setup / laptop provisioned / Google Voice assigned / EHR seat created / HIPAA training / Mandatory Reporter training / Computer Use Policy signed / NPI obtained / CAQH profile created / credentialing kicked off |
| DueDate, CompletedDate, Status | |
| DocumentLink | Where applicable |

### Tab: `HR_Documents`
Ongoing document index (separate from the one-time Onboarding checklist,
since some docs recur — e.g. HIPAA cert appears to be annual: "HIPAA
Certificate 2026").

| Column | Notes |
|---|---|
| StaffId, DocumentType | Offer Letter / I-9 / W-4 / HIPAA Cert / Mandatory Reporter Cert / Computer Use Policy / Insurance Certificate / Job Description / Other |
| DriveLink, DateOnFile, ExpirationDate | ExpirationDate nullable — most are one-time, HIPAA/Mandatory Reporter recur |

---

## Worker endpoints (new, `clarity-admin-api/src/index.ts`)

All new endpoints read/write `OPS_SPREADSHEET_ID` instead of the existing
`SPREADSHEET_ID`. Same auth model, same service account, just a second
target spreadsheet — no new external dependency, no CORS/security-policy
change.

```
GET/POST/PATCH  /api/credentialing
GET             /api/clinician-compliance
GET/POST/PATCH  /api/ce/log
GET             /api/ce/status          — computed rollup: hours completed vs. required vs. cycle end, per clinician
GET/POST/PATCH  /api/vendors
GET/POST/PATCH  /api/business-compliance
GET/POST/PATCH  /api/onboarding
GET/POST/PATCH  /api/hr-documents
GET             /api/compliance-digest  — cross-tab rollup: everything due in the next 30/60/90 days, for the Dashboard alert card
```

## Frontend

New nav section, "Compliance & HR," alongside the existing sidebar groups:

| Route | Page | Notes |
|---|---|---|
| `/credentialing` | Board view grouped by clinician, colored status pills | Reuses the monday.com-style board patterns from Phase 14 — same visual language as Claims, new data |
| `/ce-tracker` | Per-clinician progress bars (hours completed / required) | Same visual pattern as the existing Dashboard utilization bars |
| `/vendors` | Table with renewal countdown badges | Same expiry-badge pattern already built for Staff license warnings |
| `/compliance` | Business compliance list/calendar with countdown badges | |
| `/staff/:id` | **Extended**, not new | Add Credentialing / CE / HR Documents / Onboarding sections to the existing StaffDetail page — keeps this attached to the profile a user already knows, instead of scattering it across five disconnected pages |

**Dashboard:** one new "Compliance Alerts" card next to the existing
capacity-alert banner — everything from `/api/compliance-digest` due in the
next 30/60/90 days (license expirations already partially exist; this adds
CAQH attestations, CE hours falling behind pace, vendor renewals, business
compliance deadlines) in one place.

---

## Rollout sequence

1. **Step 0 — Infrastructure.** Create the `Clarity Ops & Compliance`
   spreadsheet, share with the existing service account, add
   `OPS_SPREADSHEET_ID` Worker secret. Seed initial rows directly from the
   Master Doc and Drive folder scan already done above — this is real data
   I can draft as a starting import rather than have you re-key it.
2. **Step 1 — Credentialing tracker.** Given Shana's applications are
   actively mid-flight right now, this is the most immediately useful piece.
3. **Step 2 — CE/CEU tracker.** `Licenses_CE` + `CE_Log` + rollup endpoint +
   `/ce-tracker` page.
4. **Step 3 — Vendor & business compliance register.**
5. **Step 4 — HR documents + onboarding checklist**, wired into
   `StaffDetail.tsx`.
6. **Step 5 — Dashboard compliance digest card**, once tabs 1–4 exist to
   pull from.

Each step ships a working app, same incremental-rollout discipline as
Phase 14.

---

## Open questions — remaining

1. ~~New spreadsheet name/approach OK?~~ **Resolved** — new spreadsheet,
   created, see Status above.
2. ~~CE hour requirements for Emily and Shana~~ **Resolved** — 40 hrs, same
   as Jen, per Delaware DPR (see Corrections above).
3. ~~CAQH re-attestation cadence~~ **Resolved** — standard ~120-day cycle
   confirmed acceptable; Bruce doesn't currently track whether existing
   attestations are up to date, so the `ClinicianCompliance` tab's
   `CAQH Last Attestation` field starts blank for everyone rather than
   guessing — first fill-in has to be a manual check, not an import.
4. ~~Shana/Emily credentialing status~~ **Resolved** — BCBS, United,
   Aetna/Meritain, Medicare, all Effective; NOT Health Options.
5. ~~Shannon and Jen's current per-payer credentialing status~~ **Resolved**
   — same 4 as Shana/Emily plus Health Options. Seeded.
6. ~~Vendor tab accuracy~~ **Resolved as "scaffold now, populate later"** —
   tab exists with headers, deliberately left unseeded.
7. ~~Service account sharing~~ **Done.**
8. ~~Nav structure~~ **Resolved** — single "Compliance & HR" sidebar group
   with sub-pages, per Bruce's agreement.

## Remaining open items

- **Deploy sign-off.** `setup-ops-sheet` is written and tested locally but
  not deployed or run. Say the word.
- **Malpractice policy numbers per clinician** — AR439977 in the Master Doc
  reads as the practice's group liability policy, not seeded as individual
  malpractice coverage on `ClinicianCompliance`. Worth clarifying whether
  each clinician also carries their own tail/individual malpractice policy,
  or whether the group policy is what should populate those fields.
- **Out-of-state CE requirements** (Shannon/PA+FL, Jen/VA) — dates are
  seeded, hour requirements are not. Lower priority since DE is the primary
  practice license for all four clinicians.
- **Step 1 (Credentialing page) vs. Step 2 (CE tracker page)** — which to
  build first is still open. The sheet now has real seed data for both, so
  either is unblocked.
