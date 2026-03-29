# Audit Field Contract v1 (Router)

Date: 2026-03-12

## Baseline
- All audit events contain: `event_type`, `timestamp`, `data.execution_id`.
- Runtime execution status remains `in_progress` for DB compatibility.
- FSD-compatible step status is emitted as `step_status` (e.g. `executing`).

## Required Event Fields

### intent_received
- `execution_id`
- `intent_name`
- `intent_type` (compat)
- `status`
- `step_status`

### task_decomposed
- `execution_id`
- `intent_name`
- `capability_chain`
- `memory_query`
- `status`
- `step_status`

### memory_selected
- `execution_id`
- `intent_name`
- `memory_refs_ref` (id list / inline serialized refs)
- `count`
- `status`
- `step_status`

### capability_executed
- `execution_id`
- `intent_name`
- `capability_id`
- `capability_version`
- `status`
- `step_status`
- `invocation_source`
- `elapsed_ms`
- `failure_mode`

## Normalization Rules
- In audit logger flush stage:
  - always inject `data.execution_id`
  - always inject `data.status` when present
  - inject `data.step_status = data.step_status ?? (data.status === 'in_progress' ? 'executing' : data.status)`

## Compatibility Notes
- Existing readers using `status` are unaffected.
- New readers should prefer `step_status` for FSD-aligned step semantics.
