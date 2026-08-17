# Phase 16 — Credentialing, HR & CE Tracker

## Where this stands (2026-08-17) — read this first in a new session

**Steps 0 and 1 are live in production and confirmed working** — Bruce ran
the setup call and has verified real data on the `/credentialing` page.
Steps 2–5 are scoped below but not started.

**Live now:**
- Spreadsheet: `Clarity Ops & Compliance` —
  https://docs.google.com/spreadsheets/d/1aDk_skyvMs_CKQUjj1wUMuMhQVleczh2aUSx9kPnkzs/edit
  — shared with the service account; `OPS_SPREADSHEET_ID` is a Worker secret.
- All 8 tabs exist with headers. `ClinicianCompliance`, `Licenses_CE`,
  `Credentialing`, and `BusinessCompliance` are seeded with verified data
  (see schema section below for exact values and sourcing). `Vendors`,
  `CE_Log`, `Onboarding`, `HR_Documents` exist with headers only — empty by
  design, not an oversight (see "Open items" below).
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
  phase), `a4fd963` (Credentialing page), `a0be21b` (this doc).
- Key design decision: the new tabs key off **clinician name**
  (`Shannon`/`Jen`/`Emily`/`Shana` — the existing `Clinician` union type
  used throughout the Worker for Claims), not a Staff-row UUID. Simpler,
  and avoids needing to read the live Staff sheet to cross-reference IDs.

**Not started:** Step 2 (CE/CEU tracker), Step 3 (Vendor & business
compliance pages), Step 4 (HR documents + onboarding checklist), Step 5
(Dashboard compliance digest card). See "Rollout sequence" below for what
each needs.

## Open items to resolve before continuing

- **Which step next?** No strong signal yet from Bruce on Step 2 (CE
  tracker) vs. Step 3 (vendors/compliance) vs. Step 4 (HR docs) — ask.
- **Malpractice policy per clinician** — `ClinicianCompliance`'s
  `malpracticePolicyNumber`/`malpracticeExpiration` columns are blank for
  all four. AR439977 (Master Doc) reads as the practice's *group* liability
  policy, not individual malpractice coverage — confirm with Bruce whether
  each clinician also carries their own policy, or the group policy is what
  belongs in these fields.
- **Out-of-state CE requirements** — Shannon (PA, FL) and Jen (VA) have
  license dates seeded in `Licenses_CE` but no hour requirements
  researched. Lower priority since DE is the primary practice license for
  all four clinicians.
- **Vendor data sourcing, when Step 3 starts** — per Bruce, in priority
  order: `Receipts & Invoices/` Drive folder (has separate 2025 and 2026
  subfolders — only the 2026 one was briefly scanned so far, found GoDaddy,
  SiteGround, Northwest Registered Agent, OpenAI, Envato, Psychology Today,
  Identogo, and a Gusto invoice with real confirmed figures: $141.94 total
  = $49 base + $30 employee fees [5 @ $6] + $39.99 background check +
  $19.95 Gusto Learning + $3 workers comp), then QBO expense categories,
  then Gusto (which also holds personnel documents worth indexing into
  `HR_Documents` eventually — extract links only, never raw SSN/DOB fields,
  per "What NOT to store" below). This is a deliberate scaffold-then-fill
  approach — Bruce wants the tab built but isn't in a hurry to populate it.
- **CAQH last-attestation dates** — Bruce doesn't currently track whether
  these are up to date, so `ClinicianCompliance.caqhLastAttestation` starts
  blank for everyone. First fill-in requires a manual check, not an import.

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

### Tab: `Licenses_CE` — seeded, no CRUD endpoint yet
Extends the existing `Staff_Licenses` tab (in the Claims workbook, which
keeps tracking licenseType/number/state/expiration) with the CE dimension.
Seeded for all DE licenses; out-of-state (Shannon/PA+FL, Jen/VA) have dates
only, no hour requirements researched yet.

| Column | Notes |
|---|---|
| clinician, licenseType, licenseState | |
| ceHoursRequired | 40 for all four (LCSW: Jen/Emily/Shana; LPCMH: Shannon) — both confirmed against Delaware DPR, but via *different* sub-requirement structures, see next column |
| ethicsHoursRequired, otherSubRequirementLabel, otherSubRequirementHours | LCSW: 6 ethics + 1 "Mandatory Reporting". LPCMH: 3 ethics + 3 "Cultural Inclusion, Equity & Diversity". Not the same shape — don't assume one and copy to the other |
| selfDirectedCapHours | LCSW: 10. LPCMH: not verified |
| cycleStart, cycleEnd | LCSW: Feb 1–Jan 31, odd years. LPCMH: Oct 1–Sept 30, even years |
| *(not yet a column)* hoursCompleted | Planned for Step 2 — **computed by the Worker** from `CE_Log`, not manually maintained, same pattern as derived Claims fields |
| *(not yet a column)* status | Planned for Step 2 — On Track / Behind Pace / At Risk, computed from hours-completed vs. time-elapsed-in-cycle |

### Tab: `CE_Log` — headers only, empty
One row per completed CE/CEU activity, added going forward — this *is* the
"Professional Development" Drive folder, indexed instead of just filed.

| Column | Notes |
|---|---|
| clinician | |
| activityTitle, provider | |
| dateCompleted, hours | |
| category | General / Ethics / Mandatory Reporting / Cultural Inclusion Equity & Diversity, etc. — match whatever sub-requirement it counts toward |
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
⬜ GET/POST/PATCH  /api/ce/log
⬜ GET             /api/ce/status          — computed rollup: hours completed vs. required vs. cycle end, per clinician
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
| `/ce-tracker` | Per-clinician progress bars (hours completed / required) | ⬜ Not started | Same visual pattern as the existing Dashboard utilization bars |
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
3. **Step 2 — CE/CEU tracker** (not started). `Licenses_CE` (seeded) +
   `CE_Log` (empty, ready for entries) already exist. Needs:
   `GET/POST /api/ce/log`, `GET /api/ce/status` (computed rollup — hours
   completed vs. required vs. cycle end, per clinician, from `CE_Log`
   entries — same "computed, not manually maintained" pattern as Claims
   derived fields), and a `/ce-tracker` page with per-clinician progress
   bars (same visual pattern as the Dashboard utilization bars).
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
