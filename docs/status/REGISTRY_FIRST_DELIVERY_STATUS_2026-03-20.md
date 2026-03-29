# Registry-First Delivery Status

- Date: 2026-03-20
- Scope: `admin-os`
- Status: PASS

## 1. Current Architecture Position

- Runtime capability truth source: local registry
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/configs/capability-registry/capability_registry_v1.json`
- Active capabilities: 4
  - `capability.data_fact_query`
  - `capability.product_doc_qna`
  - `capability.content_generator`
  - `capability.context_assembler`
- Inactive capability:
  - `capability.publisher`
- Current contract:
  - analyzer may output `matched_capability_ids`
  - router remains deterministic execution authority
  - canonical intent is compatibility/audit only

## 2. Main Flow Progress

| Step | Status | Notes |
|------|--------|-------|
| Step 1 Entry | Complete | `/api/chat/ask` stable |
| Step 2 Registry Load | Complete | runtime reads local capability registry |
| Step 3 Capability Match | Complete | analyzer is capability-aware and emits `matched_capability_ids` |
| Step 4 Gate | Complete | gate validates capability binding, slot completeness, side-effect confirmation, max 3 matches |
| Step 5 Sealer | Complete | task + execution sealing stable |
| Step 6 Router | Mostly complete | capability-first, legacy canonical fallback retained for compatibility only |
| Step 7 Capability Execute | Complete for MVP | main capabilities available; `publisher` remains placeholder-level for MVP |
| Step 8 Trace + Audit | Complete | `intent_name`, `memory_refs_ref`, canonical event type, lineage, causality all covered |
| Step 9 Return / UX | Partial | main product flow works; UI is still MVP form, not final conversation UX |

## 3. Regression Baseline

- `npm run lint` -> PASS
- `BASE_URL=http://127.0.0.1:3003 npm run test:all:with-dev` -> PASS
- `phase0` -> `92/92`
- `phase1` -> `32/32`
- `phase2` -> `33/33`
- `UAT` -> `overall=PASS`
- `phase_report_stale` -> `false`

## 4. What Was Explicitly Hardened

- capability registry is runtime truth source
- analyzer prompt is registry-aware
- `matched_capability_ids` limited to 3
- gate rejects over-matched requests before execution creation
- task sealing also rejects over-matched requests
- chat dispatch is capability-first
- router/task decomposition prefers capability binding before canonical fallback
- `memory_refs_ref` now includes registry refs and semantic refs
- `memory_runtime` now moves through router/context as a structured runtime object

## 5. Known Remaining Gaps

1. UI still shows MVP interaction shape, not final product-grade conversational UX.
2. `publisher` is intentionally inactive in the current registry and not available as an active runtime capability.
3. Some canonical compatibility fields still exist in helper signatures to preserve contract stability.
4. Full FSD-grade memory runtime is not complete; current implementation is sufficient for MVP auditability, not the final memory system.

## 6. Practical Conclusion

- Current branch is ready for:
  - internal user testing
  - capability-first demo
  - continued product iteration on top of stable regression baseline
- Current branch is not yet the final form of:
  - product conversation UX
  - full memory runtime
  - strict router-only capability binding
