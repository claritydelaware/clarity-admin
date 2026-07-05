# Data QA page — staged, not active

Removed from the live app on 2026-07-05 because the "Duplicate Claim IDs" rule
(and likely others) needed payer-specific handling the dataset didn't fit
cleanly yet — see the anomaly-rule discussion in that session's history.
Known issues found before shelving:

- Health Options reuses one claim ID across many dates of service for the
  same client (their claim ID behaves like a case/authorization number, not
  a per-visit ID) — the "different dates of service" duplicate check needs
  to skip this pattern per-payer, not treat it as an error.
- Same claim ID + same date + same CPT code can still be legitimate when it's
  a primary/secondary coordination-of-benefits submission (e.g. Medicare +
  a secondary payer) — the "same CPT repeated" check needs to also compare
  insurance before flagging.
- A claim ID shared across two *different* clients on the same date is a
  distinct, more serious case that deserves its own always-on check rather
  than being folded into the code/date logic.

## To revive

**Frontend** (`clarity-admin`):
1. Move `DataQA.tsx` back to `src/pages/DataQA.tsx` and `useDataQA.ts` back to
   `src/hooks/useDataQA.ts`, restoring their original import paths (see git
   history around 2026-07-05 for the pre-move versions), or keep them as
   self-contained files as staged here.
2. Re-add the route in `src/App.tsx` (`<Route path="qa" element={<DataQA />} />`).
3. Re-add `{ to: '/qa', label: 'Data QA', icon: ShieldAlert }` to `NAV` in
   `src/components/layout/Sidebar.tsx`.
4. Re-add `'/qa': { label: 'Data QA' }` to `BREADCRUMBS` in
   `src/components/layout/Topbar.tsx`.

**Worker** (`clarity-admin-api`):
1. Move `qa-anomalies.ts`'s `getQaAnomalies` function back into `src/index.ts`
   (it depends on that file's `sheetRead`, `json`, `rowToClaim`, `Claim`, `Env`
   — none of which are exported, so it must live in the same file).
2. Re-add the route: `if (request.method === 'GET' && p === '/api/qa/anomalies') return getQaAnomalies(env, token, origin)`.
3. Fix the rule refinements above before re-exposing this to real data.
