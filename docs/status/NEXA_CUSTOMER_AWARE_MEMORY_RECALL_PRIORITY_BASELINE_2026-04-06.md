# Nexa Customer-Aware Memory Recall Priority Baseline

- Date: 2026-04-06
- Status: accepted
- Freeze: yes

## Decision

Add filesystem-managed customer recall priority to long-term memory assets so Working Mind selection can prioritize customer-profile memory deterministically per customer.

## Why

Customer memory already existed, but recall ranking still treated customer-profile memory as mostly passive metadata. Nexa needed customer-specific recall priority so the active customer posture can shape which memory refs reach Working Mind first.

## Scope

- Extend `customer-assets/<customer>/memory.md` with recall priority and recall focus tags.
- Parse recall posture in customer asset runtime.
- Apply customer-aware recall scoring in memory selection.
- Propagate recall-priority evidence into Working Mind, session kernel, and interaction-log visibility.

## Implementation

### Filesystem assets
- `admin-os/customer-assets/maxshot/memory.md`
- `admin-os/customer-assets/nexa-demo/memory.md`
- `admin-os/customer-assets/ops-observer/memory.md`

### Runtime
- `admin-os/lib/customers/asset-runtime.ts`
- `admin-os/lib/customers/memory.ts`
- `admin-os/lib/router/memory-selection.ts`
- `admin-os/lib/capabilities/memory-refs.ts`
- `admin-os/lib/chat/context-manager/types.ts`
- `admin-os/lib/chat/session-kernel.ts`
- `admin-os/lib/interaction-learning/extract.ts`

### Product surface
- `admin-os/components/interaction-log/interaction-log-surface.tsx`

### Tests
- `admin-os/lib/customers/__tests__/asset-runtime.test.ts`
- `admin-os/lib/router/__tests__/memory-selection.test.ts`
- `admin-os/lib/chat/__tests__/session-kernel.test.ts`
- `admin-os/lib/interaction-learning/__tests__/extract.test.ts`

## Acceptance

### Deterministic tests
- `npx vitest run lib/customers/__tests__/asset-runtime.test.ts lib/router/__tests__/memory-selection.test.ts lib/chat/__tests__/session-kernel.test.ts lib/interaction-learning/__tests__/extract.test.ts`
- Result: `7/7 passed`

### Build
- `npm run build`
- Result: passed

### Runtime check
- Environment: local env exec with real runtime dependencies
- Invocation: direct `selectMemories(...)` and `createWorkingMind(...)`
- Customer: `maxshot`
- Context tags: `['vault', 'apy', 'execution']`
- Result:
  - `refCount = 6`
  - `firstMemoryOrigin = customer_profile`
  - `firstRecallPriority = customer_first`
  - `customerRecallPriorityApplied = true`
  - `customerRecallPriority = customer_first`

## Consequence

Nexa now lets customer posture influence memory recall deterministically before routing and delivery. Customer-profile memory is no longer just present in Working Mind; it can be intentionally prioritized according to filesystem-managed customer memory assets.
