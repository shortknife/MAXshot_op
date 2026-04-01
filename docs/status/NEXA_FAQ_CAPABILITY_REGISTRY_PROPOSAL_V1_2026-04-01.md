# Nexa FAQ Capability Registry Proposal V1 (2026-04-01)

- Status: Planning proposal
- Purpose: define how the FAQ / KB Plane should enter the existing capability registry without changing current runtime behavior yet

## 1. Registry Strategy

The existing registry remains the system of record.

Immediate rule:
- do not activate FAQ capabilities in the runtime registry yet
- define their future registry shape first
- add them only when the first thin vertical slice is ready to implement

Reason:
- avoids registry drift without runtime ownership
- keeps current MVP stable

---

## 2. Proposed New Capability Entries

## 2.1 `capability.faq_answering`

```json
{
  "capability_id": "capability.faq_answering",
  "aliases": ["faq_answering", "customer_faq"],
  "name": "FAQ Answering",
  "description": "Answer customer-facing FAQ questions from bounded KB sources with citations and confidence markers.",
  "lifecycle": "planned",
  "risk_class": "read_only",
  "examples": [
    "How do I reset my password?",
    "What does the Pro plan include?",
    "How can I upload invoices?"
  ],
  "prompt_slot_schema": {
    "description": "Customer FAQ question plus optional KB scope and channel context.",
    "fields": [
      { "name": "question", "type": "natural_language", "required": true },
      { "name": "kb_scope", "type": "string", "required": false },
      { "name": "customer_context", "type": "string", "required": false },
      { "name": "channel", "type": "string", "required": false },
      { "name": "locale", "type": "string", "required": false }
    ]
  },
  "runtime_slot_schema": {
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
  },
  "clarification_policy": {
    "max_turns": 2,
    "ui_mode": "natural_language_only",
    "allow_multi_match": false,
    "ask_for": ["kb_scope", "customer_context", "locale"],
    "prefer_examples_over_buttons": true
  },
  "tags": ["faq", "kb", "customer_support", "read_only"]
}
```

## 2.2 `capability.faq_fallback`

```json
{
  "capability_id": "capability.faq_fallback",
  "aliases": ["faq_fallback"],
  "name": "FAQ Fallback",
  "description": "Return safe bounded fallback outputs for low-confidence or blocked FAQ cases.",
  "lifecycle": "planned",
  "risk_class": "read_only",
  "examples": [
    "I don't know the answer from the KB",
    "This request is outside supported FAQ scope"
  ],
  "prompt_slot_schema": { "description": "Internal fallback capability.", "fields": [] },
  "runtime_slot_schema": {
    "type": "object",
    "required": ["question", "reason"],
    "properties": {
      "question": { "type": "string" },
      "reason": { "type": "string" },
      "kb_scope": { "type": ["string", "null"] },
      "channel": { "type": ["string", "null"] }
    },
    "additionalProperties": true
  },
  "clarification_policy": {
    "max_turns": 0,
    "ui_mode": "natural_language_only",
    "allow_multi_match": false,
    "ask_for": []
  },
  "tags": ["faq", "fallback", "review_safe"]
}
```

## 2.3 `capability.faq_qa_review`

```json
{
  "capability_id": "capability.faq_qa_review",
  "aliases": ["faq_qa_review"],
  "name": "FAQ QA Review",
  "description": "Prepare flagged FAQ cases for manual QA review.",
  "lifecycle": "planned",
  "risk_class": "read_only",
  "examples": [
    "Package this low-confidence answer for review"
  ],
  "prompt_slot_schema": { "description": "Internal review packaging capability.", "fields": [] },
  "runtime_slot_schema": {
    "type": "object",
    "required": ["question", "reason"],
    "properties": {
      "question": { "type": "string" },
      "draft_answer": { "type": ["string", "null"] },
      "reason": { "type": "string" },
      "confidence": { "type": ["number", "null"], "minimum": 0, "maximum": 1 }
    },
    "additionalProperties": true
  },
  "clarification_policy": {
    "max_turns": 0,
    "ui_mode": "natural_language_only",
    "allow_multi_match": false,
    "ask_for": []
  },
  "tags": ["faq", "review", "ops_support"]
}
```

## 2.4 `capability.kb_upload_qc`

```json
{
  "capability_id": "capability.kb_upload_qc",
  "aliases": ["kb_upload_qc"],
  "name": "KB Upload & QC",
  "description": "Ingest KB source material and return a QC result for readiness.",
  "lifecycle": "planned",
  "risk_class": "side_effect",
  "examples": [
    "Upload a customer KB markdown file",
    "Validate a new FAQ document before indexing"
  ],
  "prompt_slot_schema": {
    "description": "KB source metadata for ingest.",
    "fields": [
      { "name": "source_type", "type": "enum", "required": true, "values": ["markdown", "pdf", "url", "text"] },
      { "name": "source_ref", "type": "string", "required": true },
      { "name": "kb_scope", "type": "string", "required": false },
      { "name": "customer_context", "type": "string", "required": false }
    ]
  },
  "runtime_slot_schema": {
    "type": "object",
    "required": ["source_type", "source_ref"],
    "properties": {
      "source_type": { "type": "string", "enum": ["markdown", "pdf", "url", "text"] },
      "source_ref": { "type": "string" },
      "kb_scope": { "type": ["string", "null"] },
      "customer_context": { "type": ["string", "null"] },
      "uploaded_by": { "type": ["string", "null"] }
    },
    "additionalProperties": true
  },
  "clarification_policy": {
    "max_turns": 1,
    "ui_mode": "natural_language_only",
    "allow_multi_match": false,
    "ask_for": ["kb_scope", "customer_context"]
  },
  "tags": ["kb", "ingest", "qc", "side_effect"]
}
```

---

## 3. Activation Order

Recommended activation order:
1. add `capability.faq_answering` when the thin slice starts
2. keep the other three as planning-only until after slice validation
3. do not activate `capability.kb_upload_qc` until side-effect policy and review flow are ready

---

## 4. Registry Boundary Rule

When these entries are eventually added to the registry:
- they must be registered under their own ids
- they must not alias to `capability.product_doc_qna`
- they must not alias to `capability.data_fact_query`
- routing must remain explicit and deterministic

---

## 5. Final Judgment

The registry shape for the FAQ / KB Plane is now sufficiently defined for the next planning step:
- routing integration design
- thin-slice acceptance planning
- later runtime registration
