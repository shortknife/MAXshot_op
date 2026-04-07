# Nexa Customer Policy Evidence Block Acceptance

- Date: 2026-04-07
- Block: Customer Policy Evidence Block
- Result: accepted and frozen

## Block goal

Unify customer-aware policy evidence across primary and secondary surfaces so UI-facing policy summaries come from one composed contract, while raw runtime policy remains available only as debug/evidence metadata.

## Completed scope

1. Shared `customer_policy_evidence` contract added
2. Shared evidence card component added
3. Workspace API, auth challenge/verify, and chat runtime now emit customer policy evidence
4. Login, chat, customers, interaction log, and runtime cost now consume the shared evidence layer

## Concentrated validation

### Tests
- `27/27 passed`

### Build
- `npm run build` passed

### Live acceptance
- `/api/customers/workspace?customer_id=nexa-demo`
  - `policy_version = 1.5`
  - `primary_plane = faq_kb`
- `/api/auth/challenge`
  - `customer = maxshot`
  - `customer_policy_evidence.primary_plane = ops_data`
- `/api/auth/verify`
  - `identity_id = maxshot-ops`
  - `verification_method = email_code`
  - `customer_policy_evidence.policy_version = 1.5`
- operational evidence remains present in Supabase:
  - `interaction_learning_log_op` recent row with `customer_id = ops-observer`
  - `runtime_cost_events_op` recent row with `customer_id = maxshot`

## Freeze decision

Freeze this block now.

The remaining customer-aware work should focus on missing behavior layers, not more ad hoc evidence reshaping inside pages.
