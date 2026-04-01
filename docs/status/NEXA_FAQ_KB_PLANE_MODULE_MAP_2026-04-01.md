# Nexa FAQ / KB Plane Module Map (2026-04-01)

## 1. Purpose

This document maps the imported Nexa FAQ product assets into the current platform structure.

It does not activate new code paths yet.
It defines where the FAQ / KB plane should live inside the current platform.

---

## 2. Current platform baseline

### Existing platform capabilities
1. `capability.data_fact_query`
2. `capability.product_doc_qna`
3. `capability.content_generator`
4. `capability.context_assembler`
5. `capability.publisher` (inactive)

### Current platform strengths
- bounded harness
- deterministic router
- execution/audit model
- business facts plane
- chat entry and follow-up handling
- thin memory layer

### Current platform gap relevant to Nexa FAQ
- no first-class FAQ / KB plane
- no customer knowledge-base lifecycle
- no FAQ fallback/QA capability family
- no FAQ-specific API surface model

---

## 3. Nexa platform target layers

### Layer A. Nexa Core
- harness
- router
- capability runtime
- audit/trace
- session context
- thin memory

### Layer B. Nexa Ops / Data Plane
- market/execution/allocation/rebalance facts
- business query runtime
- operations-facing query UX

### Layer C. Nexa FAQ / KB Plane
- knowledge-base upload and QC
- FAQ answering
- FAQ fallback
- FAQ QA review
- customer-facing FAQ API / channel output rules

### Layer D. Customer Solutions
- MAXshot sample solution
- future customer tenants / solution packs

---

## 4. FAQ / KB Plane capability mapping

### C1. Knowledge Base Upload & QC
**Candidate capability id**:
- `capability.kb_upload_qc`

**Source asset**:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/reference/nexa-faq-mined-2026-04-01/skills/kb-upload-qc.md`

**Role**:
- upload Markdown/customer docs
- parse/chunk/vectorize
- quality check / manual review marking
- persist ingest results

**Status**:
- product-defined
- not implemented in current runtime

### C2. FAQ Answering
**Candidate capability id**:
- `capability.faq_answering`

**Source asset**:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/reference/nexa-faq-mined-2026-04-01/skills/faq-answering.md`

**Role**:
- retrieve top-k knowledge chunks
- generate structured FAQ answer
- attach citations/confidence
- produce channel-ready answer payload

**Status**:
- product-defined
- should not be collapsed into `capability.product_doc_qna`

### C3. FAQ Fallback
**Candidate capability id**:
- `capability.faq_fallback`

**Source asset**:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/reference/nexa-faq-mined-2026-04-01/skills/faq-fallback.md`

**Role**:
- unify FAQ-specific fallback outputs
- map low-confidence / oos / sensitive / generation-fail cases
- set manual-review markers

**Status**:
- product-defined
- currently absent as a first-class capability

### C4. FAQ QA Review
**Candidate capability id**:
- `capability.faq_qa_review`

**Source asset**:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/reference/nexa-faq-mined-2026-04-01/skills/faq-qa-review.md`

**Role**:
- route flagged FAQ responses into QA/ops review flow
- support SLA/manual-review tracking

**Status**:
- product-defined
- currently absent as a first-class capability

---

## 5. Relationship to existing capabilities

### `capability.product_doc_qna`
Keep it as:
- platform/product documentation QnA
- internal docs / protocol explanation / product docs

Do **not** redefine it into customer FAQ answering.

### `capability.data_fact_query`
Keep it as:
- ops/data facts plane
- execution/yield/allocation/rebalance/business facts

Do **not** overload it with customer KB retrieval.

### `capability.context_assembler`
Can remain an internal support capability and later help both:
- ops/data plane
- faq/kb plane

---

## 6. Minimal integration sequence

### Phase 1
- keep imported FAQ assets as reference-only
- freeze platform naming: Nexa platform, MAXshot sample solution
- define FAQ / KB plane in docs and capability map

### Phase 2
- add FAQ capability entries to platform planning docs
- define contract shapes for:
  - kb ingest request
  - faq answer request
  - faq fallback result
  - faq qa review task

### Phase 3
- implement one thin vertical slice:
  - `capability.faq_answering`
  - read-only, no customer billing path yet

### Phase 4
- implement KB upload/QC and QA review supporting paths

---

## 7. What should not happen

1. Do not merge the old FAQ project as a second runtime.
2. Do not reuse its historical process scaffolding as product code.
3. Do not overload existing capabilities with FAQ responsibilities they were not designed for.
4. Do not rename the current repository physically before the capability/module map is stable.

---

## 8. Result

After this mapping step, the platform structure is now conceptually clear:
- current runtime remains valid
- FAQ assets are preserved
- Nexa becomes the platform frame
- MAXshot becomes one solution under that frame
- FAQ / KB work has a defined landing zone instead of remaining an external side project
