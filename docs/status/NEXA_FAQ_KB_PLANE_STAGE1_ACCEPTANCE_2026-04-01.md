# Nexa FAQ / KB Plane Stage 1 Acceptance (2026-04-01)

- Status: `freeze now`
- Scope: `Nexa FAQ / KB Plane Stage 1`
- Decision basis:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/status/NEXA_FAQ_KB_CAPABILITY_CONTRACT_V1_2026-04-01.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/status/NEXA_FAQ_KB_ROUTING_BOUNDARY_V1_2026-04-01.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/status/NEXA_FAQ_ANSWERING_THIN_SLICE_IMPLEMENTATION_V1_2026-04-01.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/status/NEXA_FAQ_CAPABILITY_REGISTRY_PROPOSAL_V1_2026-04-01.md`

## 1. Stage Goal

Bring imported FAQ / KB assets into the current runtime as a first-class capability family, without weakening existing ops/data and product-doc paths.

Stage 1 is accepted only if the runtime can:
1. route FAQ requests into their own capability family
2. answer bounded FAQ questions from controlled KB material
3. degrade explicitly when grounding is weak
4. package flagged cases for manual review
5. keep KB ingest/QC isolated behind its own side-effect boundary

## 2. Accepted Runtime Surface

### Active capabilities
1. `capability.faq_answering`
2. `capability.faq_fallback`
3. `capability.faq_qa_review`
4. `capability.kb_upload_qc`

### Active KB artifacts
1. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/app/configs/faq-kb/faq_kb_manifest_v1.json`
2. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/app/configs/faq-kb/account-access.md`
3. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/app/configs/faq-kb/plans-and-billing.md`
4. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/app/configs/faq-kb/knowledge-base.md`

### Owned routing boundary
- `capability.data_fact_query`: ops/data facts only
- `capability.product_doc_qna`: platform/product docs only
- `capability.faq_*`: customer FAQ / KB only

## 3. Implementation Evidence

### Hot-path implementation
1. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/capabilities/faq-answering.ts`
2. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/capabilities/faq-fallback.ts`
3. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/capabilities/faq-qa-review.ts`
4. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/capabilities/kb-upload-qc.ts`
5. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/capabilities/faq-kb-retriever.ts`
6. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/chat/handlers/qna-intent-handler.ts`
7. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/chat/intent-compat.ts`
8. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/router/capability-scheduling.ts`
9. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/router/capability-catalog.ts`
10. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/app/chat/page.tsx`

### Focused tests
1. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/capabilities/__tests__/faq-answering.test.ts`
2. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/capabilities/__tests__/faq-fallback.test.ts`
3. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/capabilities/__tests__/faq-qa-review.test.ts`
4. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/capabilities/__tests__/kb-upload-qc.test.ts`
5. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/chat/handlers/__tests__/qna-intent-handler.test.ts`
6. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/chat/__tests__/intent-compat-shell.test.ts`
7. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/router/__tests__/capability-scheduling-step7.test.ts`
8. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/router/__tests__/gate-decision.test.ts`

### Acceptance commands used
```bash
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os
npx vitest run \
  lib/capabilities/__tests__/faq-qa-review.test.ts \
  lib/capabilities/__tests__/faq-fallback.test.ts \
  lib/capabilities/__tests__/faq-answering.test.ts \
  lib/capabilities/__tests__/kb-upload-qc.test.ts \
  lib/chat/handlers/__tests__/qna-intent-handler.test.ts \
  lib/chat/__tests__/intent-compat-shell.test.ts \
  lib/router/__tests__/capability-scheduling-step7.test.ts \
  lib/router/__tests__/gate-decision.test.ts
```

```bash
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os
npm run build
```

```bash
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os
PORT=3003 npm run dev
npm run test:phase0
```

### Latest results
- Focused tests: `29 / 29 passed`
- Build: `passed`
- Broad regression: `test:phase0 => Total 93, Passed 93, Failed 0`

## 4. Scope Discipline Check

### MVP Must
1. FAQ-like support queries route into FAQ path: pass
2. FAQ answers return citations/confidence: pass
3. FAQ low-confidence path is explicit: pass
4. Manual review payload is created for flagged FAQ cases: pass
5. KB upload/QC stays behind its own capability and gate semantics: pass
6. Existing product-doc and ops/data query paths do not silently collapse into FAQ path: pass

### MVP Tolerated
1. KB source is still file-based and bounded
2. `kb_upload_qc` is still preview-oriented for `url` and `pdf`
3. QA review only prepares payload; it does not open queues or tickets
4. FAQ citations are controlled snippets, not full retrieval infrastructure

### Post-MVP
1. queue/dashboard for review work
2. richer KB ingestion and parsing
3. remote source fetch and validation
4. tenant/customer isolation
5. reviewer assignment / SLA workflow
6. stronger FAQ admin UI

## 5. Contract Drift Decision

The original thin-slice design excluded `faq_fallback`, `faq_qa_review`, and `kb_upload_qc` from the first implementation.

That boundary was intentionally expanded during implementation for one reason: imported FAQ assets were only genuinely absorbed once the FAQ family could complete a full bounded path:
- answer
- fallback
- review packaging
- ingest/QC preview

This is accepted drift, not uncontrolled scope creep, because:
1. all four capabilities remained within the FAQ / KB Plane contract
2. the new work did not weaken existing Step7 or chat routing contracts
3. focused tests and broad regression both stayed green

## 6. Blockers

None for Stage 1 freeze.

## 7. Freeze Decision

Decision: `freeze now`

Reason:
1. contract surface is clear
2. owned boundary is clear
3. runtime behavior is verifiable
4. focused tests are present
5. one broader regression passed
6. remaining work is post-stage evolution, not unresolved correctness risk

## 8. Next Step

Do not add more FAQ capabilities.

The next work should move to one of these areas:
1. FAQ / KB Plane management surface
2. review queue visibility
3. KB source expansion under existing contracts
