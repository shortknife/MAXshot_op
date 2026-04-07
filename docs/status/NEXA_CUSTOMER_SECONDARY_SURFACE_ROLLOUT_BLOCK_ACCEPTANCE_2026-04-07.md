# Nexa Customer Secondary Surface Rollout Block Acceptance

- Date: 2026-04-07
- Block: Customer Secondary Surface Rollout Block
- Result: accepted and frozen

## Block goal

Roll out composed customer default experience to secondary operational surfaces so they no longer rely on raw preset/posture reads and instead consume the same runtime-policy-first contract used across the main customer-aware product flow.

## Completed scope

1. Interaction log surface migrated to composed customer defaults
2. Runtime cost surface migrated to composed customer defaults
3. Shared row decorator added to runtime policy layer
4. Secondary surface evidence rendering aligned to one customer-aware contract

## Concentrated validation

### Tests
- `53/53 passed`

### Build
- `npm run build` passed

### Live acceptance
- Supabase interaction evidence:
  - `log_id = ilog-1775184743756-7jx8xx`
  - `customer_id = ops-observer`
- Supabase cost evidence:
  - `event_id = cost-1775179522362-8laguv`
  - `customer_id = maxshot`

## Freeze decision

Freeze this block now.

The customer-aware stack now covers:
- primary surfaces
- auth and workspace surfaces
- secondary operational evidence surfaces

The next customer-policy work should move to broader rollout or deeper policy-driven evidence, not keep patching these two surfaces.
