# Phase 4.5 — Claims Workflow Enhancements

**Scope:** Frontend-only. No new Worker endpoints required. No new Google Sheets columns required.

All changes are contained to the React SPA (`clarity-admin`). The Worker already returns all fields needed (`paymentDateReceived`, `clientId`, `status`, etc.).

---

## 1. New Statuses

Add `'Deductible'` and `'Sent to Secondary'` to the `Status` union type and all status-aware UI.

### 1a. Type update

**File:** `src/types/index.ts`

```typescript
// Before
export type Status = 'Payment Received' | 'Pending' | 'Finalized' | 'Denied';

// After
export type Status =
  | 'Payment Received'
  | 'Pending'
  | 'Finalized'
  | 'Denied'
  | 'Deductible'
  | 'Sent to Secondary';
```

### 1b. Badge colors

**File:** `src/components/ui/Badge.tsx`

Add color mappings for the two new statuses:

| Status | Background | Text |
|---|---|---|
| Deductible | `#7C3AED` | `#FFFFFF` |
| Sent to Secondary | `#2563EB` | `#FFFFFF` |

Existing status colors remain unchanged.

### 1c. Status options in forms and modals

Add both new statuses to the `<select>` or options list in every place status is user-selectable:

- `src/components/claims/StatusUpdateModal.tsx`
- `src/pages/NewClaim.tsx`
- `src/pages/EditClaim.tsx`

The status options should appear in this display order across all three locations:

1. Pending
2. Finalized
3. Deductible
4. Sent to Secondary
5. Payment Received
6. Denied

---

## 2. Archive Logic

**No new Sheet column. No Worker changes. Pure frontend filter.**

A claim is considered **archived** when it meets any of the following conditions:

```typescript
// src/lib/utils.ts — add this exported helper
export function isArchived(claim: Claim): boolean {
  if (claim.status === 'Denied') return true;
  if (claim.status === 'Sent to Secondary') return true;
  if (claim.status === 'Payment Received' && !!claim.paymentDateReceived) return true;
  if (claim.status === 'Deductible' && !!claim.paymentDateReceived) return true;
  return false;
}
```

A claim is **active** if `isArchived(claim)` returns `false`. This covers:
- All `Pending` claims
- All `Finalized` claims
- `Payment Received` claims where `paymentDateReceived` is empty (payment not yet recorded)
- `Deductible` claims where `paymentDateReceived` is empty (not yet collected)

---

## 3. Claims Page — Active View Default

**File:** `src/pages/Claims.tsx`

### Default view state

When the user navigates to `/claims`, the page defaults to showing **active claims only**. This is the equivalent of the hidden-row working view in Google Sheets.

Implement a view toggle with two states persisted in `localStorage` under the key `claimsViewMode`:

- `'active'` (default) — applies `isArchived(claim) === false` filter before rendering
- `'all'` — shows all claims regardless of archive status

### Toggle UI

Render a segmented control or toggle button in the Claims page header (alongside the existing density toggle and Export CSV button):

```
[ Active ]  [ All Claims ]
```

- `Active` is the selected state on first load
- Switching to `All Claims` removes the archive filter but preserves all other active filters
- The toggle state persists in `localStorage`

### Interaction with status filter

When in `Active` view, the multi-select status filter (see Section 4) operates on the already-filtered active set — i.e., the user can further narrow to specific active statuses (e.g., "show only Pending within my active claims"). When in `All Claims` view, the status filter operates on the full dataset.

---

## 4. Multi-Select Status Filter

**File:** `src/components/claims/ClaimsFilters.tsx`

Replace the single-value status `<select>` dropdown with a multi-select checkbox popover.

### Behavior

- Renders as a button showing either "All Statuses" (nothing selected) or a count badge ("2 statuses") when filters are active
- Clicking opens a dropdown panel with checkboxes for each status value
- Multiple statuses can be checked simultaneously
- Selecting no statuses = "show all" (no status filter applied)
- Filter state persists in URL params as a comma-separated value: `?status=Pending,Finalized`

### Status filter and API call

The `status` URL param must be **stripped before the API call** to the Worker (same pattern as the existing `search` param strip). Status filtering is applied client-side after fetch, consistent with how search/archive filtering already works.

In `useClaims.ts` (or wherever the API call is constructed), exclude `status` from the params sent to `/api/claims`. After the response is received, apply:

1. Archive/active filter (from Section 3)
2. Multi-select status filter (client-side `claim.status` match against selected array)
3. Default compound sort (from Section 5)

### All status options

The checkbox list should include all six statuses in this order:

1. Pending
2. Finalized
3. Deductible
4. Sent to Secondary
5. Payment Received
6. Denied

---

## 5. Default Compound Sort (Active View)

**File:** `src/components/claims/ClaimsTable.tsx`

### Default sort for active view

When the view mode is `'active'` and no user-initiated column sort has been applied, sort claims using a four-key compound comparator that mirrors the existing Google Apps Script:

```
Priority 1: Status (A → Z ascending)
Priority 2: Insurance/Payer (A → Z ascending)
Priority 3: Claim Date (oldest → newest ascending)
Priority 4: Payment Date Received (oldest → newest ascending, nulls last)
```

With the archive filter applied, the effective status sort groups in active view are:

1. Deductible
2. Finalized
3. Payment Received (no date — still active)
4. Pending

### Implementation notes

- The compound sort is a client-side array sort applied after filtering
- Null/empty `paymentDateReceived` values sort last in Priority 4
- When view mode switches to `'all'`, the same compound sort applies as the default (consistent behavior)

### Column header sort override

Clicking any sortable column header applies a **single-column sort** that overrides the default compound sort. The UI should show a sort indicator (▲/▼) on the active sort column.

Add a **"Reset sort"** button or link (appears only when a user sort is active) that clears the override and returns to the default compound sort.

### Sortable columns

Expand sortable columns from the current three (date, clinician, total) to include all meaningful columns:

| Column | Sort type |
|---|---|
| Claim Date | Date |
| Payment Date Received | Date (nulls last) |
| Forecast Payment Date | Date (nulls last) |
| Status | String |
| Insurance/Payer | String |
| Clinician | String |
| Service Code | String |
| Submission Method | String |
| Total Payment | Numeric |
| Insurance Amount | Numeric |
| Client Amount | Numeric |

---

## 6. Profile Link

**File:** `src/components/claims/ClaimsTable.tsx` (desktop table + mobile card)

### Behavior

Each claim row displays a small external-link icon button that opens the client's SimplePractice profile in a new browser tab.

URL construction:
```
https://secure.simplepractice.com/clients/{claim.clientId}
```

The `clientId` field is already present on every claim object. No Worker changes required.

### Desktop table

Add a narrow column (e.g., 40px) as the **first column** of the table (before Claim ID), containing only the external link icon. Use `lucide-react`'s `ExternalLink` icon at 14px. The column header can be blank or use a link icon.

- `target="_blank" rel="noopener noreferrer"` on the anchor
- Tooltip on hover: `"Open in SimplePractice"`
- Do not show the raw URL anywhere; icon only

### Mobile card layout

In the tap-to-expand card view, include a **"View in SimplePractice"** text link with the `ExternalLink` icon in the expanded detail section. Same `target` and `rel` attributes.

### Claims where clientId is empty

Some claims may have no `clientId` (e.g., certain self-pay or late cancellation rows). If `claim.clientId` is falsy, render nothing in that column (no broken link, no icon).

---

## 7. localStorage Keys Summary

Add to existing keys in use:

| Key | Values | Purpose |
|---|---|---|
| `claimsViewMode` | `'active'` \| `'all'` | Active vs All Claims toggle |

Existing keys unchanged: `dashboardDateWindow`, `claimsTableDensity`, `claimsFilterPresets`.

---

## 8. Files Changed

| File | Change |
|---|---|
| `src/types/index.ts` | Add `'Deductible'` and `'Sent to Secondary'` to `Status` union |
| `src/lib/utils.ts` | Add exported `isArchived(claim: Claim): boolean` helper |
| `src/components/ui/Badge.tsx` | Add color cases for two new statuses |
| `src/components/claims/ClaimsFilters.tsx` | Replace status dropdown with multi-select checkbox popover; strip `status` from API params |
| `src/components/claims/ClaimsTable.tsx` | Add Profile Link column; default compound sort; expanded sortable columns; reset sort control |
| `src/pages/Claims.tsx` | Active/All Claims toggle; localStorage persistence; wire archive filter and view mode to table |
| `src/components/claims/StatusUpdateModal.tsx` | Add new statuses to options list |
| `src/pages/NewClaim.tsx` | Add new statuses to status field options |
| `src/pages/EditClaim.tsx` | Add new statuses to status field options |
| `src/hooks/useClaims.ts` | Strip `status` param from API call; apply client-side status filter after fetch |

---

## 9. No-Change Scope

The following do **not** require changes in this phase:

- Cloudflare Worker (`clarity-admin-api`) — no new endpoints, no field changes
- Google Sheets workbook — no new columns or sheets
- `src/lib/api.ts` — no new API calls
- All pages outside of Claims (Dashboard, Analytics, Forecast, Overhead, PayPeriodSummary, Staff)
- Cloudflare Access configuration
- Routing (`App.tsx`)
