# Nexa Runtime Cost Baseline (2026-04-02)

## Scope
- Add first-class runtime cost and token accounting for the current chat path.
- Keep cost accounting deterministic and configuration-driven.
- Do not attempt provider-perfect billing reconciliation in this baseline.

## What Changed
1. Added runtime cost extraction and persistence for `/api/chat/ask`.
2. Added a configurable pricing file for the current intent-analysis path:
   - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/configs/runtime-cost/runtime_cost_pricing_v1.json`
3. Added runtime loader and persistence service:
   - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/runtime-cost/runtime.ts`
   - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/runtime-cost/extract.ts`
4. Added a runtime cost surface:
   - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/costs/page.tsx`
   - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/components/runtime-cost/runtime-cost-surface.tsx`

## Captured Fields
- customer_id
- requester_id
- source_plane
- primary_capability_id
- matched_capability_ids
- verification_outcome
- tokens_used
- estimated_cost_usd
- duration_ms

## Runtime Behavior
- `runChatAsk()` now returns runtime metadata needed for accounting.
- `/api/chat/ask` persists a runtime cost event after interaction-learning persistence.
- The cost view is runtime-first and reads from `runtime_cost_events_op`.

## Boundary
This is an internal accounting baseline, not a billing engine.

Out of scope:
- provider-invoice reconciliation
- per-tenant billing workflows
- multi-model blended pricing
- queue/background task accounting
- mutation/write-path cost accounting outside chat

## Acceptance Evidence
- Focused tests passed:
  - `lib/runtime-cost/__tests__/extract.test.ts`
  - `lib/runtime-cost/__tests__/runtime.test.ts`
  - `lib/chat/__tests__/chat-ask-route-entry.test.ts`
  - `lib/chat/__tests__/runtime-verification.test.ts`
- Production build passed:
  - `npm run build`

## Required DB Step
Execute:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/docs/status/RUNTIME_COST_EVENTS_DDL.sql`

## Next Implication
The platform now has the minimum runtime primitives for:
1. capability-level cost visibility
2. verification vs. cost tradeoff analysis
3. future tenant-facing usage accounting
