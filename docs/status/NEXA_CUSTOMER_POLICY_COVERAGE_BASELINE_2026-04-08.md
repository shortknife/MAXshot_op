# Nexa Customer Policy Coverage Baseline

- Date: 2026-04-08
- Status: accepted baseline
- Scope: extend customer-policy surface enforcement from the first protected pages into the remaining operator-heavy secondary surfaces, without widening the policy model itself.

## What changed

1. Expanded focused surface coverage in customer workspace assets
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/customer-assets/maxshot/workspace.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/customer-assets/ops-observer/workspace.md`
- `maxshot` now explicitly covers:
  - `ops`
  - `operations`
  - `outcome`
  - `learning-assets`
- `ops-observer` now explicitly covers:
  - `operations`
- This keeps the policy source of truth in filesystem customer assets instead of adding ad hoc page rules.

2. Applied shared `requiredSurface` enforcement to the remaining operator-heavy pages in scope
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/audit/page.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/components/learning-assets/learning-assets-surface.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/ops/page.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/operations/page.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/outcome/page.tsx`
- These pages now use the same shared `AuthGuard requiredSurface="..."` contract as the earlier protected customer surfaces.

3. Added focused coverage tests for workspace policy
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/customers/__tests__/workspace.test.ts`
- New checks confirm:
  - `maxshot` includes `operations` and `learning-assets`
  - `ops-observer` includes `audit` and `operations`
  - `ops-observer` still does not include `kb-management`

## Why this block mattered

After the enforcement block, the first set of customer-sensitive pages was protected, but several secondary operational pages still used authentication-only access. That left policy coverage uneven. This block closes the most obvious coverage gap by extending the same deterministic surface guard pattern to the remaining operator-heavy pages and aligning filesystem workspace assets with the intended access model.

## Validation

- Focused suite: `20/20 passed`
- Production build: `passed`
- Live browser acceptance:
  - `maxshot-ops`:
    - `/operations` allowed
    - `/learning-assets` allowed
    - `/audit -> /chat` denied by policy
  - `ops-auditor`:
    - `/audit` allowed
    - `/operations` allowed
    - `/kb-management -> /chat` denied by policy
