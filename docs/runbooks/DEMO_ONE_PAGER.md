# Demo One Pager (Phase 6 Delivery)

## Goal
- Show a complete, auditable MVP flow in one pass:
  `Entry -> Confirm -> Run -> Outcome -> Audit`

## Preconditions
- Admin OS running on `http://localhost:3003`
- `.env.local` contains:
  - `NEXT_PUBLIC_READ_ONLY_DEMO=false`
  - `NEXT_PUBLIC_WRITE_ENABLE=true`
  - `WRITE_CONFIRM_TOKEN=<token>`
  - `PORT=3003`

## 6-Minute Script
1. Open `/ops`
- Enable `Use SQL Template (Read-only)`
- Pick `latest_executions`
- Set `template_slots`: `{"limit":3}`
- Click `Create Execution` and read `execution_id`

2. Open `/confirmations`
- Confirm with `operator_id=admin`
- Use `confirm_token=<token>`

3. Open `/operations`
- Click `Run`
- Show status/message feedback

4. Open `/outcome?exec_id=<execution_id>`
- Show `Snapshot Header`
- Show `Result` exists

5. Open `/audit?exec_id=<execution_id>`
- Show event chain:
  - `entry_created`
  - `execution_confirmed`
  - `sql_template_executed`
- Show KPI and failure reason panel

6. Optional compare
- In `/outcome`, fill `counterpart_execution_id`
- Click `Compare With`
- Read `delta_count`

## Key Claims to State
- Router is deterministic and auditable.
- Writes are gated by human confirmation token.
- Replay/Retry/Expire are explicit operator actions.
- SQL execution is template-based and guarded.

## Expected Output Format
```
execution_id: <uuid>
outcome: success
audit_events:
  - entry_created
  - execution_confirmed
  - sql_template_executed
compare:
  delta_count: <number>
```
