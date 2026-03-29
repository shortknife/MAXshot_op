# FSD Registry-First Alignment Memo

- Date: 2026-03-20
- Scope: `admin-os` registry-first main flow alignment

## Aligned

- Capability registry is now the runtime truth source for active capabilities.
- Chat entry flow is capability-first:
  - analyzer output is normalized around `matched_capability_ids`
  - chat preprocess emits `matchedCapabilityIds` and `primaryCapabilityId`
  - business/content dispatch is capability-driven
- Router/task decomposition now prefers:
  - `matched_capability_ids`
  - `scope`
  - `template_id`
  before any canonical fallback
- `memory_refs_ref` is logged and propagated through router/chat audit paths.
- `memory_runtime` now travels through router/context with `router_context_only` policy and stable ref ids.
- `session_context != memory_refs` remains respected in current implementation.

## Still Compatibility-Layer

- `intent_type_canonical` is still emitted in API/meta/audit output.
- `intent-routing-map.ts` still exists for:
  - old payload compatibility
  - audit/meta compatibility
  - smoke contract stability
- Some route/helper signatures still carry `canonicalIntentType`, but no longer use it as primary routing truth.

## Known Gaps

- Business query capability now consumes router-provided memory refs plus memory runtime metadata, but full FSD-grade memory runtime is still not complete.
- Router fallback still retains a final canonical compatibility branch for legacy payloads.
- UI/UX is still MVP-form rather than final product interaction model.
- `publisher` has been explicitly downgraded to inactive in the current registry rather than remaining as an ambiguous active placeholder.

## Current Judgment

- Runtime behavior is substantially aligned with latest FSD direction.
- Remaining gaps are now mostly:
  - compatibility cleanup
  - deeper memory integration
  - UI/product polish

## Related ADR

- See `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/ADR_REGISTRY_FIRST_BINDING_DECISION_2026-03-20.md`
- Current explicit decision: analyzer may propose capability binding, router remains deterministic execution authority.
