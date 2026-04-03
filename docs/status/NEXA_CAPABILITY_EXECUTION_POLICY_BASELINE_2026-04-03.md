# Nexa Capability Execution Policy Baseline (2026-04-03)

## Scope

This baseline standardizes capability execution metadata for runtime-enforced mutation policy.

Accepted scope:
- execution metadata added to capability registry
- mutation scope declared per mutating capability
- serialized vs concurrency-safe hint exposed at runtime
- KB source and FAQ review writes routed through capability policy checks
- Customers page surfaces mutation policy details

## Why

Customer capability exposure and operator boundary were already enforced, but write-side controls were still partially ad hoc in route handlers. The platform needed a capability-native policy layer so mutation rules are declared once and reused consistently.

## Runtime policy fields

Per capability, the registry may now declare:
- `execution_mode`
- `mutation_scope`
- `concurrency_safe`
- `requires_confirmation`
- `requires_verification`

## Current mutation policies

- `capability.kb_upload_qc`
  - `execution_mode = mutation`
  - `mutation_scope = kb_source_inventory`
  - `concurrency_safe = false`
- `capability.faq_qa_review`
  - `execution_mode = mutation`
  - `mutation_scope = faq_review_queue`
  - `concurrency_safe = false`

## Enforcement points

- `POST /api/kb-source/action`
  - register path now validates capability mutation policy before write
- `transitionKbSourceItem()`
  - validates capability mutation policy before status transition
- `transitionFaqReviewItem()`
  - validates capability mutation policy before review transition

## Result

The platform no longer relies on route-local hardcoded mutation semantics alone. Write-side behavior is now anchored in capability metadata and can be extended to future mutation families.

## Deferred

Not part of this baseline:
- global router-wide serialization queues
- async task runtime
- mutation locking across sessions
- cost-aware mutation scheduling
- operator IAM beyond current bounded registry
