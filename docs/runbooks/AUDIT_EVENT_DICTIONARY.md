# Audit Event Dictionary

## Standard Fields
- `event_type` (string)
- `timestamp` (ISO)
- `data.execution_id` (string)
- `data.status` (string, optional)
- `data.reason` (string, optional)

## Core Events
- `entry_created`
- `execution_confirmed`
- `execution_rejected`
- `execution_replay_requested`
- `execution_retry_created`
- `execution_expired`
- `router_start`
- `router_preflight`
- `task_decomposed`
- `memory_selected`
- `capability_executed`
- `router_complete`

## SQL Template Events
- `sql_template_requested`
- `sql_template_rendered`
- `sql_template_explain_requested`
- `sql_template_explain_rejected`
- `sql_template_executed`

## Writeback Events
- `memory_writeback_requested`
- `memory_writeback_approved`
- `memory_writeback_written`
- `memory_weight_adjustment_requested`
- `memory_weight_adjustment_approved`
- `memory_weight_adjustment_applied`

## Blocked Events
- `write_blocked` (includes `request_path`)
