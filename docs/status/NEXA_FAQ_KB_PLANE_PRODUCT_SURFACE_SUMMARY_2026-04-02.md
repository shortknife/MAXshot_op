# Nexa FAQ / KB Plane Product Surface Summary (2026-04-02)

- Status: `stage-1 closed`
- Scope: product-facing surface summary for the current FAQ / KB Plane
- Related acceptance:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/status/NEXA_FAQ_KB_PLANE_STAGE1_ACCEPTANCE_2026-04-01.md`

## 1. What Is Now In Product

The imported FAQ / KB assets are no longer just reference material.
They are now represented inside the current product surface in three visible layers:

1. runtime capability family
2. chat-facing review-aware FAQ experience
3. FAQ / KB management visibility pages

This means the FAQ / KB Plane is now part of the platform product shape, not an external annex.

---

## 2. Runtime Layer

### Active capabilities
1. `capability.faq_answering`
2. `capability.faq_fallback`
3. `capability.faq_qa_review`
4. `capability.kb_upload_qc`

### Runtime behavior now supported
1. FAQ-like support questions route into FAQ capability family
2. grounded answers return citations and confidence
3. low-confidence FAQ answers trigger bounded fallback
4. flagged FAQ answers generate manual review payloads
5. KB ingest/QC remains isolated as its own capability and side-effect boundary

### Core implementation files
1. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/capabilities/faq-answering.ts`
2. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/capabilities/faq-fallback.ts`
3. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/capabilities/faq-qa-review.ts`
4. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/capabilities/kb-upload-qc.ts`
5. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/capabilities/faq-kb-retriever.ts`

---

## 3. User-Facing Pages

### 3.1 Chat surface
- Route: `/chat`
- File:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/app/chat/page.tsx`

Current FAQ-related UI behavior:
1. shows FAQ capability badge
2. shows confidence badge
3. shows fallback badge
4. shows review-required badge
5. shows FAQ citations
6. shows review payload summary
7. links into review queue page

### 3.2 FAQ Review Queue
- Route: `/faq-review`
- File:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/app/faq-review/page.tsx`

Current purpose:
1. make manual review path visible
2. expose prepared review payload examples
3. show priority, reason, scope, channel, draft answer, citations
4. validate that review packaging is legible at product level

Current data source:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/app/configs/faq-kb/review_queue_seed_v1.json`

### 3.3 KB Management
- Route: `/kb-management`
- File:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/app/kb-management/page.tsx`

Current purpose:
1. show bounded KB manifest inventory
2. show current source scopes and keywords
3. show QC readiness states
4. expose accepted vs needs-review sources

Current data sources:
1. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/app/configs/faq-kb/faq_kb_manifest_v1.json`
2. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/app/configs/faq-kb/qc_preview_seed_v1.json`

### Navigation integration
- File:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/components/app-nav.tsx`

Current nav entries added:
1. `FAQ Review`
2. `KB Management`

---

## 4. Product Boundary Now Enforced

### FAQ / KB Plane owns
1. customer FAQ retrieval and answer grounding
2. FAQ fallback semantics
3. FAQ review packaging
4. KB ingest/QC preview visibility
5. FAQ review visibility surface
6. KB management visibility surface

### FAQ / KB Plane does not own
1. ops/data facts
2. platform documentation QnA
3. queue/ticket creation
4. reviewer assignment workflow
5. tenant isolation
6. billing/admin lifecycle

### Boundary files
1. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/status/NEXA_FAQ_KB_ROUTING_BOUNDARY_V1_2026-04-01.md`
2. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/status/NEXA_FAQ_KB_CAPABILITY_CONTRACT_V1_2026-04-01.md`

---

## 5. Verification Evidence

### Focused capability/runtime evidence
- accepted in:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/status/NEXA_FAQ_KB_PLANE_STAGE1_ACCEPTANCE_2026-04-01.md`

### Build evidence
```bash
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os
npm run build
```

### Result
- build passed after the new `/faq-review` and `/kb-management` routes were added

---

## 6. Current Maturity Assessment

### What is already product-real
1. FAQ capability family is active
2. FAQ fallback/review chain is visible
3. KB assets have a visible management surface
4. imported FAQ project assets have been re-expressed in current product structure

### What is still read-only / seed-based
1. review queue data
2. QC preview data
3. bounded KB source inventory
4. URL/PDF ingest deeper handling

### What is still post-stage
1. real review queue persistence
2. ticketing / reviewer workflow
3. richer KB ingestion and parsing
4. external source sync
5. tenant-aware KB isolation

---

## 7. Final Summary

The current FAQ / KB Plane has now been absorbed into the product at both layers:

1. system/runtime layer
2. visible product surface layer

Stage 1 should therefore be treated as closed not only from a capability perspective, but also from a product-surface perspective.

The next work should not add more FAQ capabilities.
The next work should deepen one of these existing surfaces:
1. review queue data realism
2. KB management realism
3. bounded KB source expansion
