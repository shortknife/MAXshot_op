# Nexa FAQ / KB Plane Stage 2 Runtime Acceptance (2026-04-02)

## Scope

This acceptance freezes the second-stage runtime wiring for the Nexa FAQ / KB Plane.

Included runtime surfaces:
- `capability.faq_answering`
- `capability.faq_fallback`
- `capability.faq_qa_review`
- `capability.kb_upload_qc`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/app/faq-review/page.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/app/kb-management/page.tsx`

Runtime tables introduced in this stage:
- `faq_review_queue_op`
- `faq_kb_qc_snapshot_op`

DDL references:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/docs/status/FAQ_REVIEW_QUEUE_RUNTIME_DDL.sql`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/docs/status/FAQ_KB_QC_RUNTIME_DDL.sql`

## Acceptance Result

Status: `freeze now`

Stage 2 runtime wiring is accepted.

The FAQ / KB Plane is no longer operating only as a bounded seed-backed product surface. It now has verified runtime persistence and runtime-first read behavior for both review queue visibility and KB QC snapshot visibility.

## What Was Verified

### 1. FAQ review queue runtime wiring

Implemented runtime service:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/faq-kb/review-queue.ts`

Verified behavior:
- The FAQ review queue now reads from `faq_review_queue_op` first.
- If the runtime table is missing, unavailable, or empty, it falls back to the bounded seed queue.
- Low-confidence FAQ flows now attempt to write review items into the runtime queue.

Runtime write path:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/chat/handlers/qna-intent-handler.ts`

Acceptance evidence:
- A forced low-confidence FAQ flow produced:
  - `answer_meta.capability_id = faq_qa_review`
  - `answer_meta.review_payload.review_id` populated
  - `answer_meta.review_payload.queue_source = supabase`
- The latest inserted row was confirmed in `faq_review_queue_op`.
- Runtime queue loader returned:
  - `queue_source = supabase`

### 2. KB QC snapshot runtime wiring

Implemented runtime service:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/faq-kb/qc-runtime.ts`

Verified behavior:
- KB management now reads `faq_kb_qc_snapshot_op` first.
- If runtime snapshots are unavailable or incomplete, the system computes a manifest-based QC preview and attempts to upsert it into the runtime table.
- Once runtime rows exist, the management surface resolves from `supabase` instead of `computed`.

Acceptance evidence:
- Runtime table query succeeded.
- Loader returned:
  - `qc_source = supabase`
  - `qc_count = 5`

### 3. Natural-path FAQ behavior remained correct

Validated normal FAQ grounded answer path:
- Query: `What does the Pro plan include?`
- Result:
  - grounded FAQ answer returned
  - `fallback_required = false`
  - `review_required = false`

This confirms the runtime queue is not incorrectly triggered for healthy FAQ retrieval.

## UI Runtime State

### `/faq-review`

Current runtime behavior:
- route is dynamic
- shows `queue_id`
- shows `source: supabase | seed`
- presents reason/scope statistics over runtime-first data

### `/kb-management`

Current runtime behavior:
- route is dynamic
- shows `generated` timestamp
- shows `source: supabase | computed`
- presents QC readiness from runtime snapshot first

## Validation Commands

Focused tests passed:
```bash
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os
npx vitest run   lib/faq-kb/__tests__/qc-runtime.test.ts   lib/faq-kb/__tests__/review-queue.test.ts   lib/faq-kb/__tests__/loaders.test.ts   lib/capabilities/__tests__/kb-upload-qc.test.ts   lib/chat/handlers/__tests__/qna-intent-handler.test.ts
```

Production build passed:
```bash
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os
rm -rf .next
npm run build
```

## Current Stage Boundary

Accepted in Stage 2:
- runtime-backed review queue
- runtime-backed KB QC snapshots
- runtime-first product surfaces
- bounded fallback behavior preserved

Not included in Stage 2:
- end-user KB upload workflow
- review resolution workflow
- queue mutation UI
- tenant isolation model
- billing / access governance

## Next Recommended Step

Do not add more FAQ / KB capabilities.

The next rational step is product workflow completion, not new capability proliferation:
1. review queue actions
2. KB upload workflow realism
3. management mutation surface
4. customer-bound access model
