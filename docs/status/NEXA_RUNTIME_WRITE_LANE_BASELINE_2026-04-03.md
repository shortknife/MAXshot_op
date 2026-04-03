# Nexa Runtime Write-Lane Baseline (2026-04-03)

## Scope

This baseline turns non-concurrency-safe capability metadata into actual runtime serialization.

Accepted scope:
- runtime write-lane table and lease model
- serialized mutation enforcement for `capability.kb_upload_qc`
- serialized mutation enforcement for `capability.faq_qa_review`
- `write_lane_busy` response contract for conflicting writes

## Why

Capability execution policy already declared `concurrency_safe = false` for KB source mutation and FAQ review mutation, but runtime behavior was still unconstrained. Without a lane, two operators could issue conflicting writes against the same mutation scope at the same time.

## Lane model

- lane key = `mutation_scope:customer_id`
- one active lease per lane key
- duplicate lease acquisition returns `write_lane_busy`
- successful mutations release the lease after completion

## Current serialized scopes

- `kb_source_inventory:maxshot`
- `faq_review_queue:maxshot`

## Enforcement points

- `POST /api/kb-source/action`
  - register path acquires a write lane before source draft creation
- `transitionKbSourceItem()`
  - acquires a write lane after customer scope is resolved
- `transitionFaqReviewItem()`
  - acquires a write lane after customer scope is resolved

## DDL

- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/docs/status/RUNTIME_WRITE_LANES_DDL.sql`

## Deferred

Not part of this baseline:
- lease expiry / takeover
- multi-step workflow orchestration
- background mutation queues
- router-wide task serialization
- cost-aware queue scheduling
