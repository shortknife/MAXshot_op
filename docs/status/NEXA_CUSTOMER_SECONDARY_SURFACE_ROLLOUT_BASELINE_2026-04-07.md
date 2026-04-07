# Nexa Customer Secondary Surface Rollout Baseline

- Date: 2026-04-07
- Status: accepted baseline
- Scope: interaction log and runtime cost secondary surfaces now consume composed customer default experience instead of rendering raw customer policy or direct customer asset posture reads.

## What changed

1. Added a reusable decorator in `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/customers/runtime-policy.ts`
- `decorateWithCustomerDefaultExperience(...)` now decorates operational rows with the same composed default-experience contract already used in primary surfaces.

2. Migrated interaction log server loading
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/interaction-log/page.tsx`
- interaction log rows are decorated before render.

3. Migrated runtime cost server loading
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/costs/page.tsx`
- runtime cost rows are decorated before render.

4. Updated secondary surface rendering
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/components/interaction-log/interaction-log-surface.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/components/runtime-cost/runtime-cost-surface.tsx`
- both surfaces now show `summary`, `primary_plane`, `default_entry_path`, and `policy_version` from composed customer defaults.

## Why this block mattered

The customer runtime policy stack already controlled workspace, auth, routing, delivery, review, clarification, and memory behavior. The remaining gap was secondary surfaces still treating policy mostly as raw evidence. This block closes that gap and makes customer-aware defaults visible in operational evidence screens without reintroducing direct asset reads into UI code.

## Validation

- Focused test suite: `53/53 passed`
- Production build: `passed`
- Live evidence:
  - recent interaction row exists with `customer_id = ops-observer`
  - recent cost row exists with `customer_id = maxshot`
- The live Supabase evidence confirms that the two secondary surfaces have customer-tagged operational data available for decoration, while the new server-side decorator and UI tests confirm the composed default experience is rendered consistently.
