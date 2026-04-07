# Nexa Customer Mutation Surface Block Acceptance

- Date: 2026-04-07
- Block: Customer Mutation Surface Block
- Result: accepted and frozen

## Block goal

Move FAQ review and KB management onto the same shared customer policy evidence layer already used by auth, workspace, chat, and secondary surfaces, while keeping operator-only mutation controls clearly labeled as bounded runtime actions.

## Completed scope

1. FAQ review page decorates review rows with `customer_policy_evidence` before rendering
2. KB management page decorates inventory rows with `customer_policy_evidence` before rendering
3. Both mutation surfaces render the shared customer mutation context card
4. Both mutation surfaces explicitly separate customer policy evidence from operator-only mutation controls

## Concentrated validation

### Tests
- `27/27 passed`

### Build
- `npm run build` passed

### Live acceptance
- Supabase review queue runtime evidence:
  - `review_id = faq-review-1775464325727-ganl7g`
  - `customer_id = maxshot`
  - `queue_status = prepared`
- Supabase KB source inventory runtime evidence:
  - `source_id = lane-free-source-5724`
  - `customer_id = maxshot`
  - `source_status = draft`
- Local `/faq-review` and `/kb-management` server paths compiled successfully under `next dev` and `next build` with shared customer policy evidence decoration enabled

## Freeze decision

Freeze this block now.

The next work should target remaining weak behavior layers, not more page-local mutation display cleanup.
