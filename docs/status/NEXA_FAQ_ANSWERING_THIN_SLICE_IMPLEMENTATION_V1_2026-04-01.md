# Nexa FAQ Answering Thin-Slice Implementation V1 (2026-04-01)

- Status: Implementation design
- Target phase: `Phase 2 - Thin FAQ Vertical Slice`
- Depends on:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/status/NEXA_PLATFORM_ROADMAP_2026-04-01.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/status/NEXA_FAQ_KB_CAPABILITY_CONTRACT_V1_2026-04-01.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/status/NEXA_FAQ_KB_ROUTING_BOUNDARY_V1_2026-04-01.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/status/NEXA_FAQ_CAPABILITY_REGISTRY_PROPOSAL_V1_2026-04-01.md`

## 1. Goal

Implement the smallest real FAQ plane path without destabilizing the existing MVP mainline.

The thin slice must prove three things:
1. FAQ requests can be routed into their own capability id
2. FAQ answers can be grounded in a bounded KB source
3. fallback behavior is explicit when grounding is weak or absent

This slice is intentionally read-only.

---

## 2. Slice Boundary

### Included
1. `capability.faq_answering`
2. routing boundary support for FAQ requests
3. one bounded KB source adapter
4. structured FAQ answer output with citations/confidence
5. bounded fallback output inside the same capability path for MVP

### Excluded
1. `capability.kb_upload_qc`
2. `capability.faq_qa_review`
3. `capability.faq_fallback` as a separate runtime capability
4. customer admin UI
5. billing / tenancy / queueing
6. full repository rename

Interpretation:
- the capability family is defined now
- the first implementation only ships one active capability and one internal fallback path

---

## 3. Minimal Technical Strategy

## 3.1 Runtime shape

Add one new read-only capability function:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/capabilities/faq-answering.ts`

This function should:
1. accept a bounded FAQ request envelope
2. resolve one KB source provider
3. retrieve candidate passages
4. build a grounded answer result
5. return confidence and citations
6. return bounded fallback if retrieval grounding is insufficient

### 3.2 Initial KB source strategy

Do not introduce full KB ingestion first.

Use a single bounded source strategy for MVP slice:
- file-based approved KB documents under current repository control
- or one static content source manifest

Recommended landing zone:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/app/configs/faq-kb/`

Recommended first artifact:
- a manifest file describing documents/scope ids
- a minimal retriever that does deterministic section matching or simple scoring

Reason:
- gives immediate grounding
- avoids vector/search infra before the plane proves value

---

## 4. Code Integration Points

## 4.1 Capability registry

Files to update later:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/app/configs/capability-registry/capability_registry_v1.json`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/router/capability-catalog.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/router/capability-scheduling.ts`

Required change:
- add `capability.faq_answering` as `active` only when the implementation file and tests exist

Not yet:
- do not activate `capability.faq_fallback`
- do not activate `capability.faq_qa_review`
- do not activate `capability.kb_upload_qc`

## 4.2 Intent and routing integration

Current routing split already distinguishes:
- business/data path
- qna path

Files to inspect/change later:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/chat/intent-compat.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/chat/chat-intent-lane.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/router/task-decomposition.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/router/router-main.ts`

Required behavior:
- FAQ-like support/usage requests must resolve to `capability.faq_answering`
- platform-doc questions remain on `capability.product_doc_qna`
- ops/data questions remain on `capability.data_fact_query`

## 4.3 Chat entry compatibility

A minimal chat-side path may also require:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/chat/handlers/faq-intent-handler.ts`

Rule:
- do not overload `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/chat/handlers/qna-intent-handler.ts` if that causes platform-doc and customer-FAQ logic to collapse together

Recommended approach:
- add a dedicated FAQ handler if chat lane branching would otherwise become ambiguous

---

## 5. MVP Retrieval Design

## 5.1 Retrieval mode

Use deterministic retrieval first.

Recommended sequence:
1. normalize question
2. score KB sections/documents by title/heading/text term overlap
3. pick top `k`
4. assemble answer context from those passages
5. produce answer only if score/confidence threshold is met

Do not start with:
- embeddings
- remote vector store
- broad semantic retrieval infra

Reason:
- keeps slice small
- fits current platform emphasis on bounded, auditable behavior

## 5.2 Evidence requirement

Successful FAQ answers must include:
- source id
- title or section label when available
- snippet or excerpt summary
- confidence score

If this cannot be produced, the capability must degrade to bounded fallback.

---

## 6. MVP Fallback Design

For the first slice, fallback can remain internal to `capability.faq_answering`.

Meaning:
- the capability returns `status=success` only for grounded answers
- low-grounding or no-source cases return a distinct bounded result shape
- no silent conversion into platform-doc answers

Recommended result flags:
- `fallback_required`
- `review_required`
- `confidence`
- `reason`

A separate `capability.faq_fallback` should be activated only later.

---

## 7. Acceptance Criteria

The thin slice is acceptable only if all of the following are true:

1. `capability.faq_answering` exists and is invokable through Step 7
2. at least one deterministic FAQ request resolves to that capability instead of `capability.product_doc_qna`
3. grounded answers include citations/confidence
4. unsupported or weakly grounded FAQ requests do not silently route to `capability.product_doc_qna`
5. existing `capability.data_fact_query` and `capability.product_doc_qna` behavior remains unchanged for their current request classes
6. build passes
7. focused tests cover:
   - successful FAQ route
   - fallback FAQ route
   - no regression of product-doc questions
   - no regression of data-fact questions

---

## 8. Recommended File Plan

### New files
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/capabilities/faq-answering.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/capabilities/faq-kb-retriever.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/chat/handlers/faq-intent-handler.ts` (only if needed)
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/app/configs/faq-kb/faq_kb_manifest_v1.json`

### Existing files likely to change
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/app/configs/capability-registry/capability_registry_v1.json`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/router/capability-scheduling.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/router/capability-catalog.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/chat/intent-compat.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/chat/chat-intent-lane.ts`

### Tests likely to add
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/router/__tests__/capability-scheduling-step7.test.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/chat/__tests__/faq-routing.test.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/capabilities/__tests__/faq-answering.test.ts`

---

## 9. Implementation Order

1. add FAQ KB manifest and retriever
2. implement `faq-answering.ts`
3. add inactive/planned registry shape locally
4. activate `capability.faq_answering` only when tests exist
5. wire chat/router routing boundary
6. verify no regression on current read-only capabilities

---

## 10. Final Judgment

The next real build step should not be a broad FAQ platform rollout.

It should be a narrow, auditable, deterministic first slice:
- one capability
- one bounded KB source
- explicit citations
- explicit fallback
- zero ambiguity with current MVP capability ownership
