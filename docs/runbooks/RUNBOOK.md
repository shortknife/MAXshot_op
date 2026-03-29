# MAXshot Admin OS Operator Runbook (P4)

This runbook standardizes daily operations, confirmations, retries, replays, and incident response.
All actions are explicit and audit-first. No implicit decisions are allowed.

## 1. Operator Onboarding Checklist (≤ 30 minutes)

1. Login + Access
   - Visit `/login` and authenticate.
   - Audit expectation: none (access only).
2. Ops Request creation
   - Go to `/ops`, create an execution.
   - Audit expectation: `entry_created`.
3. Marketing Request creation
   - Go to `/marketing`, select `template_id`, create an execution.
   - Audit expectation: `entry_created`, then `template_resolved` or `template_fallback`.
4. Pending Confirmations
   - Go to `/confirmations` or `/operations`, confirm or reject.
   - Audit expectation: `execution_confirmed` or `execution_rejected`.
5. Execution Audit + Replay
   - Go to `/audit?exec_id=...`, review `audit_log`.
   - Use `/operations` → Replay.
   - Audit expectation: `execution_replay_requested`.
6. Compare snapshots
   - Go to `/operations`, compare two execution IDs.
   - Audit expectation: none (read-only).
7. Escalation trigger (failed / rejected / expired)
   - If status is `failed`, `rejected`, or `expired`, follow incident response below.

## 2. Standard Operating Procedures (SOPs)

### 2.1 Create Ops Execution
1. `/ops` → Create
2. If pending confirmation, confirm and run
3. Review `/audit?exec_id=...`

Audit expectations:
- `entry_created`
- `execution_confirmed` (if confirmation required)
- `router_preflight`, `router_start`, `capability_executed`, `router_complete`

### 2.2 Create Marketing Execution
1. `/marketing` → select `template_id` → Create
2. Confirm and run (side_effect)
3. Review `/audit?exec_id=...`

Audit expectations:
- `entry_created`
- `execution_confirmed`
- `template_resolved` or `template_fallback`
- `router_preflight`, `router_start`, `capability_executed`, `router_complete`

### 2.3 Confirm / Reject Side-Effect
1. `/confirmations` or `/operations`
2. Confirm → Run, or Reject → No run

Audit expectations:
- `execution_confirmed` or `execution_rejected`

### 2.4 Replay
1. `/operations` → Replay

Audit expectations:
- `execution_replay_requested`

### 2.5 Retry
1. Call `/api/execution/retry` (or UI button if added)
2. Confirm and run the new execution

Audit expectations:
- `execution_retry_created`

## 3. Incident Response (Minimal)

### 3.1 Failed execution
1. Open `/audit?exec_id=...`
2. Check for `capability_fallback` / `capability_reject`
3. Decide: retry, correct inputs, or reject

### 3.2 Expired execution
1. Confirm stale request
2. Decide: retry or close

### 3.3 Missing evidence
1. Verify fallback reason exists
2. If missing, file audit gap issue

## 4. Audit Expectations Table

| Action | Expected audit event(s) |
|---|---|
| Ops creation | `entry_created` |
| Marketing creation | `entry_created` |
| Confirm | `execution_confirmed` |
| Reject | `execution_rejected` |
| Router run | `router_preflight`, `router_start`, `capability_executed`, `router_complete` |
| Template usage | `template_resolved` / `template_fallback` |
| Replay | `execution_replay_requested` |
| Retry | `execution_retry_created` |

## 5. Notes

- `_op` tables are the sole execution fact source.
- All actions must be explicit and audit-first.
- Router remains the final authority.
