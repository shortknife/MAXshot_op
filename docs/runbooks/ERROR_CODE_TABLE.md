# Error Code Table (Phase 2)

## Write / Gate
- `write_blocked_read_only` — Read-only demo mode
- `write_blocked_disabled` — Write not enabled
- `write_blocked_missing_operator` — Missing operator_id
- `write_blocked_invalid_token` — Invalid confirm_token

## Execution
- `Execution not confirmed` — Run blocked before confirmation
- `Execution not pending confirmation` — Confirm called on non-pending execution
- `Execution already terminal` — Expire called after terminal

## SQL Template
- `sql_template_explain_failed` — EXPLAIN RPC missing or failed
- `sql_multi_statement` — Semicolon/multi-statement
- `sql_not_select` — Non-SELECT SQL
- `sql_table_not_allowed` — Table outside allowed list
- `limit_too_large` — Limit exceeds guard

## Writeback
- `missing_fields` — Required fields missing
- `invalid_weight` — Weight not number
- `memory_not_found` — Memory missing
