# Intent Entry Path (Module 4)

## Purpose
Define a single, consistent intent entry contract across UI/API entrypoints so every request can be audited and traced.

## Entry Types
- Manual UI: `/ops` (template-driven, deterministic)
- Natural Language: `/api/intent/analyze` (intent parsing only)
- Direct Task Create: `/api/intent/task/create` (sealed execution)

## Flow A — Manual Template (UI)
1. User chooses template + slots in `/ops`
2. Client calls `/api/intent/task/create` with:
   - `intent_name`
   - `template_id` + `template_slots`
   - `require_confirmation=true`
3. Execution created → Confirm → Run
4. Audit chain: `entry_created` → `execution_confirmed` → `sql_template_*`

## Flow B — Natural Language (API)
1. Client calls `/api/intent/analyze` with `raw_query`
2. Intent analyzer returns:
   - `intent.type`
   - `intent.extracted_slots`
   - `trace` (source, tokens_used)
3. Client passes result into `/api/intent/task/create`
4. Confirm → Run

## Flow C — Direct Task Create (API)
- Used when caller already knows intent + slots
- Must include `require_confirmation=true` for audited execution

## Trace Fields
Returned by `/api/intent/analyze`:
- `trace.analyzer`: `intent-analyzer`
- `trace.source`: `local_stub` (dev), can be LLM-backed in prod
- `trace.tokens_used`: number
- `trace.session_context_present`: boolean

## Notes
- Router remains deterministic and does not call LLM.
- Intent parsing is advisory only; Router owns final execution.
- All write actions must pass Human Gate (`confirm_token`).
