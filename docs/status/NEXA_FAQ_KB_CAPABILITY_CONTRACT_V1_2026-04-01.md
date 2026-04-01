# Nexa FAQ / KB Capability Contract V1 (2026-04-01)

- Status: Drafted / Accepted as planning contract
- Scope: `Nexa FAQ / KB Plane`
- Depends on:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/status/NEXA_PLATFORM_REFRAME_2026-04-01.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/status/NEXA_FAQ_KB_PLANE_MODULE_MAP_2026-04-01.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/status/NEXA_PLATFORM_ROADMAP_2026-04-01.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/status/STEP7_CAPABILITY_EXECUTION_CONTRACT_V1_2026-03-29.md`

## 1. Goal

Define the first formal contract family for the Nexa FAQ / KB Plane without changing the current MVP runtime behavior.

This contract exists to:
1. prevent FAQ responsibilities from leaking into existing capabilities
2. make FAQ capabilities first-class planning objects
3. prepare one thin vertical slice implementation later

This contract does **not** activate the capability family in runtime yet.

---

## 2. Capability Family

The FAQ / KB Plane is defined as four capabilities:

1. `capability.kb_upload_qc`
2. `capability.faq_answering`
3. `capability.faq_fallback`
4. `capability.faq_qa_review`

### 2.1 Lifecycle expectation

Initial intended lifecycle:
- `capability.kb_upload_qc` = `planned`
- `capability.faq_answering` = `planned`
- `capability.faq_fallback` = `planned`
- `capability.faq_qa_review` = `planned`

Activation rule:
- only `capability.faq_answering` should be implemented first
- the other three should remain planning-level until the first vertical slice is stable

---

## 3. Shared Plane Rules

All FAQ / KB Plane capabilities must follow these rules:

1. customer FAQ is a separate product plane from ops/data facts
2. FAQ answers must be grounded in bounded KB sources
3. no FAQ capability may produce an answer without explicit retrieval evidence or bounded fallback semantics
4. FAQ capability results must preserve confidence / fallback / reviewability signals
5. FAQ plane must not silently reuse `capability.product_doc_qna` as a substitute for customer KB answering

---

## 4. Capability Contracts

## 4.1 `capability.faq_answering`

### Role
- answer customer-facing FAQ requests from a bounded KB source
- return structured answer + source evidence + confidence marker

### Risk class
- `read_only`

### Prompt slot schema

```json
{
  "question": "natural_language",
  "kb_scope": "optional string",
  "customer_context": "optional string",
  "channel": "optional string",
  "locale": "optional string"
}
```

### Runtime slot schema

```json
{
  "type": "object",
  "required": ["question"],
  "properties": {
    "question": { "type": "string" },
    "kb_scope": { "type": ["string", "null"] },
    "customer_context": { "type": ["string", "null"] },
    "channel": { "type": ["string", "null"] },
    "locale": { "type": ["string", "null"] },
    "top_k": { "type": ["integer", "null"], "minimum": 1, "maximum": 10 },
    "min_confidence": { "type": ["number", "null"], "minimum": 0, "maximum": 1 }
  },
  "additionalProperties": true
}
```

### Output contract

```json
{
  "capability_id": "capability.faq_answering",
  "status": "success|failed",
  "result": {
    "answer": "string|null",
    "summary": "string|null",
    "citations": [
      {
        "source_id": "string",
        "title": "string|null",
        "snippet": "string|null"
      }
    ],
    "confidence": 0.0,
    "fallback_required": false,
    "review_required": false
  },
  "error": "string|null",
  "audit": {},
  "metadata": {
    "kb_scope": "string|null",
    "retrieval_count": 0
  }
}
```

### MVP implementation target
- first vertical slice capability
- read-only only
- no billing, no customer admin, no workflow side effects

---

## 4.2 `capability.faq_fallback`

### Role
- produce bounded, policy-safe fallback outputs for FAQ requests
- normalize low-confidence / out-of-scope / blocked-answer cases

### Risk class
- `read_only`

### Input contract

```json
{
  "question": "string",
  "reason": "low_confidence|out_of_scope|unsafe|no_source|generation_failed",
  "channel": "string|null",
  "kb_scope": "string|null"
}
```

### Output contract

```json
{
  "capability_id": "capability.faq_fallback",
  "status": "success|failed",
  "result": {
    "fallback_message": "string",
    "review_required": true,
    "reason": "string",
    "next_step": "clarify|handoff|retry_later|manual_review"
  },
  "error": "string|null",
  "audit": {},
  "metadata": {}
}
```

### Activation rule
- not in first slice
- only enabled after real FAQ answering exists

---

## 4.3 `capability.faq_qa_review`

### Role
- create a review-ready payload for flagged FAQ cases
- preserve the answer attempt, evidence, and failure reason for manual handling

### Risk class
- `read_only` for initial phase
- may later become `side_effect` if it opens tickets or queues automatically

### Input contract

```json
{
  "question": "string",
  "draft_answer": "string|null",
  "reason": "string",
  "citations": [],
  "confidence": 0.0,
  "customer_context": "string|null"
}
```

### Output contract

```json
{
  "capability_id": "capability.faq_qa_review",
  "status": "success|failed",
  "result": {
    "review_payload": {
      "question": "string",
      "draft_answer": "string|null",
      "reason": "string",
      "citations": []
    },
    "manual_review_required": true
  },
  "error": "string|null",
  "audit": {},
  "metadata": {}
}
```

### Activation rule
- not in first slice
- should follow FAQ fallback

---

## 4.4 `capability.kb_upload_qc`

### Role
- ingest bounded customer KB material
- produce parse/QC outcome and readiness status

### Risk class
- `side_effect`

### Input contract

```json
{
  "source_type": "markdown|pdf|url|text",
  "source_ref": "string",
  "customer_context": "string|null",
  "kb_scope": "string|null",
  "uploaded_by": "string|null"
}
```

### Output contract

```json
{
  "capability_id": "capability.kb_upload_qc",
  "status": "success|failed",
  "result": {
    "ingest_status": "accepted|needs_review|rejected",
    "document_count": 0,
    "chunk_count": 0,
    "qc_flags": []
  },
  "error": "string|null",
  "audit": {},
  "metadata": {
    "kb_scope": "string|null"
  }
}
```

### Activation rule
- not in first slice
- should be introduced after FAQ answering proves real value

---

## 5. Failure Modes

Standard FAQ / KB Plane failure modes:
- `kb_source_not_found`
- `kb_scope_not_resolved`
- `faq_low_confidence`
- `faq_no_grounding_evidence`
- `faq_out_of_scope`
- `faq_policy_blocked`
- `faq_generation_failed`
- `kb_ingest_parse_failed`
- `kb_ingest_qc_failed`
- `manual_review_required`

These must be preserved explicitly in capability outputs.

---

## 6. First Vertical Slice Acceptance Contract

The first implementation slice is complete only when all of the following are true:

1. `capability.faq_answering` exists as its own capability id
2. it does not borrow `capability.product_doc_qna` runtime identity
3. it returns answer + evidence + confidence fields
4. low-confidence cases do not silently masquerade as successful grounded answers
5. router/gate can distinguish FAQ plane requests from ops/data plane requests
6. current ops/data MVP mainline is not regressed

---

## 7. Deferred Areas

This contract intentionally defers:
- billing
- customer admin UI
- tenant management
- advanced KB lifecycle
- cross-channel formatting parity
- automatic external review queue creation

These belong to later phases, not the initial FAQ plane activation.

---

## 8. Final Judgment

The FAQ / KB Plane is now contract-defined as a separate capability family.

This means the platform can proceed to:
1. registry design
2. routing boundary design
3. thin-slice implementation planning

without overloading existing MVP capabilities.
