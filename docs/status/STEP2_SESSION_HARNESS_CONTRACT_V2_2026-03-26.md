# Step 2 Session Harness Contract v2

- Date: 2026-03-26
- Status: Frozen / Accepted for MVP
- Scope: `Step 2 - Context Load`
- Standard type: v5.2 execution contract
- MVP baseline: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP1_STEP2_STEP3_MVP_ACCEPTANCE_2026-03-28.md`
- Workflow subset: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/SUPERPOWERS_FOR_MAXSHOT_SUBSET_V1_2026-03-28.md`
- Freeze decision: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP2_FREEZE_DECISION_2026-03-27.md`

## 1. Purpose

Step 2 exists to answer one question only:

- What is the relationship between this user message and the existing conversation state, and what context is allowed to flow into Step 3?

Step 2 does **not** answer:
- what capability should run
- what intent label is final
- whether execution is allowed
- what result should be returned

Those belong to later steps.

## 2. Principle

Step 2 follows the v5.2 system principle:

- LLM-first for semantics
- Harness-enforced for reliability
- Code as enforcement layer, not semantic brain

Therefore:
- LLM is the primary judge of turn relation
- Code enforces session TTL, inheritance rules, clarification bounds, and artifact validity
- Rule heuristics may exist only as fallback, never as the main semantics path

## 3. Inputs

Step 2 input is one `EntryEnvelope` plus runtime dependencies.

```json
{
  "entry": {
    "entry_channel": "web_chat|telegram|notion|system",
    "session_id": "string|null",
    "request_id": "string",
    "raw_query": "string",
    "received_at": "ISO-8601",
    "requester_id": "string|null",
    "entry_meta": {}
  },
  "runtime": {
    "active_capabilities": [],
    "session_store": {},
    "clarification_store": {},
    "memory_store": {}
  }
}
```

## 4. Output

Step 2 must emit exactly one stable artifact:

```json
{
  "context_packet": {
    "session_resolution": {
      "session_id": "string",
      "thread_action": "continue|fork_new|reset",
      "confidence": 0.0,
      "reason": "string"
    },
    "turn_relation": {
      "type": "new_session|new_topic_same_window|continuation|clarification_reply|correction|history_callback",
      "confidence": 0.0,
      "reason": "string"
    },
    "conversation_context": {
      "pending_clarification": {
        "exists": false,
        "scope": null,
        "missing_slots": []
      },
      "active_context": {},
      "recent_turns_summary": []
    },
    "registry_context": {
      "active_capability_ids": [],
      "registry_version": "string"
    },
    "memory_runtime": {
      "source_policy": "router_context_only",
      "ref_ids": [],
      "memory_ref_count": 0
    },
    "policy_decision": {
      "inherit_context": false,
      "clear_pending_clarification": false,
      "override_fields": [],
      "trigger_recall": false
    },
    "effective_query": "string",
    "context_ready": true
  }
}
```

## 5. Turn relation taxonomy

Only these values are legal:

1. `new_session`
2. `new_topic_same_window`
3. `continuation`
4. `clarification_reply`
5. `correction`
6. `history_callback`

No free-form labels are permitted.

## 6. Semantic responsibility split

### 6.1 LLM responsibilities

LLM must primarily determine:
- whether this turn continues the prior topic
- whether this is a clarification answer
- whether this is a correction
- whether this starts a new topic in the same window
- whether this explicitly recalls earlier history
- why that relation was chosen

### 6.2 Code / harness responsibilities

Code must enforce:
- session TTL
- thread reset policy
- clarification max-turn policy
- slot inheritance policy
- memory runtime shape
- context packet schema validity

## 7. Context inheritance policy

### `continuation`
- may inherit active business context
- may inherit unresolved narrowing fields
- may not silently rewrite user raw query into a fabricated standalone question

### `clarification_reply`
- may inherit pending clarification state
- may inherit unresolved slots from the last open question
- must not become a hidden intent decision by itself

### `correction`
- may inherit the prior topic shell
- must allow explicit overriding of conflicting fields

### `new_topic_same_window`
- must clear old business context
- may retain only session/channel identity

### `history_callback`
- must not inherit prior active business context blindly
- should trigger recall policy if enabled

### `new_session`
- must reset inherited business context
- should preserve only minimal identity/channel metadata

## 8. Prohibited implementations

The following are prohibited as the main Step 2 path:

1. regex-led turn classification
2. keyword-if-else conversation management
3. string concatenation as the main follow-up mechanism
4. hidden mutation across helper layers without `ContextPacket`
5. business-only context assumptions when entry is actually product/content/general

## 9. Acceptance criteria

Step 2 passes only if:

1. TG and Web use the same relation taxonomy.
2. Step 2 emits one strict `ContextPacket`.
3. Turn relation is LLM-led on the hot path.
4. Heuristics exist only as explicit fallback.
5. New question contamination by stale clarification is blocked.
6. Step 2 does not emit Step 3 fields such as capability match or intent label.

## 10. Freeze note

This contract is the frozen Step 2 baseline after the 2026-03-27 closure decision.

Freeze decision file:

- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP2_FREEZE_DECISION_2026-03-27.md`
