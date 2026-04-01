# MVP Module Implementation Map

Date: 2026-04-01
Workspace: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode`
Baseline:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/MAXshot_产品架构设计_v5.2_Harness_OS.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/MVP_ONE_PAGER_2026-04-01.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/MILESTONE_DATA_FACT_QUERY_STAGE_COMPLETE_2026-03-31.md`

Status: `milestone snapshot`

## 1. Reading Rule

This document does **not** measure code coverage.

Implementation rate here means:
- whether the module exists in the latest product design
- whether there is real runtime code for it
- whether it is part of the current MVP mainline
- whether it has freeze / acceptance evidence
- whether it is mature enough to be treated as delivered vs merely present

Two reference views:
- MVP mainline completion: approximately `85% ~ 90%`
- Full v5.2 design completion: approximately `65% ~ 72%`

The gap comes mainly from:
- Working Mind depth
- system learning / evolution loop
- side-effect publishing
- UI / product polish
- complex strategy capability

## 2. Module Map

| Module | Implementation Rate | Status | MVP Judgment |
|---|---:|---|---|
| Entry / Input Normalization | 90% | stable | delivered for MVP |
| Session Harness / Multi-turn Context | 85% | stable | delivered for MVP |
| Intent Harness | 85% | stable | delivered for MVP |
| Gate / Boundary + Confirmation | 90% | frozen | delivered for MVP |
| Sealer / Immutable Execution Input | 90% | frozen | delivered for MVP |
| Router / Deterministic Scheduling | 90% | frozen | delivered for MVP |
| Capability Execution Layer | 88% | frozen | delivered for MVP |
| Trace + Audit | 90% | frozen | delivered for MVP |
| Delivery / Critic / Return | 88% | frozen | delivered for MVP |
| Ingestion / Canonical Fact Write Path | 90% | live | delivered for MVP |
| `capability.data_fact_query` | 90% | mainline complete | delivered for MVP |
| `capability.product_doc_qna` | 75% | usable | non-blocking gap remains |
| `capability.content_generator` | 70% | usable | non-blocking gap remains |
| `capability.context_assembler` | 80% | usable | delivered as internal support |
| `capability.publisher` | 5% | inactive | post-MVP |
| Memory / Working Mind | 40% | thin-layer only | MVP partial only |
| Evolution / Learning Loop | 30% | fragmented | post-MVP |
| TG / Web Query Channel Readiness | 80% | usable | delivered for MVP |
| Admin UI / Ops UI | 60% | MVP form | non-blocking gap remains |
| Marketing / Content Ops Branch | 55% | partial | non-blocking gap remains |
| Complex Strategy Understanding / Execution | 20% | weak | explicitly post-MVP |

## 3. Current Delivered Mainline

The following should now be treated as delivered MVP mainline:

1. Harness 9-step execution spine
2. canonical ingestion into fact tables
3. business query over canonical facts
4. bounded TG / Web question entry
5. bounded multi-turn context
6. thin memory layer
7. audit-first delivery and replay posture

This means the product is no longer in the “prototype only” state.
It is now a usable, bounded MVP system.

## 4. Modules With Real Code But Not Mature Yet

These modules exist and are usable, but should not be over-claimed:

1. `capability.product_doc_qna`
2. `capability.content_generator`
3. `capability.context_assembler`
4. Admin / Ops UI surfaces
5. Marketing / Content Ops support branch

Interpretation:
- present
- usable in constrained cases
- not yet the strongest product surface

## 5. Explicit Post-MVP Areas

The following should remain outside current MVP promise:

1. complex strategy execution
2. mature long-term user memory
3. full Working Mind synthesis
4. strong semantic retrieval memory
5. interaction-learning closed loop
6. active publisher side-effect surface
7. full channel parity and strong product polish

These areas may exist in partial code form or design form, but they are not current MVP completion criteria.

## 6. Evidence Basis

### 6.1 Frozen / accepted harness steps

Frozen / accepted for MVP:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP2_FREEZE_DECISION_2026-03-27.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP3_FREEZE_DECISION_2026-03-28.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP5_FREEZE_DECISION_2026-03-29.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP6_FREEZE_DECISION_2026-03-29.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP7_FREEZE_DECISION_2026-03-29.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP8_FREEZE_DECISION_2026-03-29.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP9_FREEZE_DECISION_2026-03-29.md`

### 6.2 Mainline product evidence

- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/MILESTONE_DATA_FACT_QUERY_STAGE_COMPLETE_2026-03-31.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/MVP_ONE_PAGER_2026-04-01.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/project-memory/DECISION_LOG.md`

### 6.3 Runtime truth

- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/configs/capability-registry/capability_registry_v1.json`

Current active capability surface:
1. `capability.data_fact_query`
2. `capability.product_doc_qna`
3. `capability.content_generator`
4. `capability.context_assembler`

Inactive capability:
1. `capability.publisher`

## 7. Management-Level Summary

If viewed from delivery management rather than architecture purity:

- Core Runtime / Harness: `88%`
- Business Query Value Plane: `90%`
- Memory / Evolution Plane: `35%`
- Content / Marketing Plane: `60%`
- Side-effect / Publishing Plane: `5%`
- Product UI / Control Plane: `60%`

## 8. Final Milestone Judgment

As of 2026-04-01, the correct milestone judgment is:

- `MVP business-query mainline complete`
- `Harness runtime complete enough for bounded release use`
- `Memory exists but remains thin-layer`
- `Strategy-grade intelligence remains post-MVP`
- `Productization and learning-loop work remain next-stage planning items`
