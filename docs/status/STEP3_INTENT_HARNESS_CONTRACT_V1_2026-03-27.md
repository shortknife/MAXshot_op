# Step 3 Intent Harness Contract V1

> Status: Frozen / Accepted for MVP  
> Effective date: 2026-03-27  
> Depends on: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP2_FREEZE_DECISION_2026-03-27.md`  
> Architecture source of truth: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/MAXshot_产品架构设计_v5.2_Harness_OS.md`
> MVP acceptance baseline: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP1_STEP2_STEP3_MVP_ACCEPTANCE_2026-03-28.md`
> Freeze decision: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP3_FREEZE_DECISION_2026-03-28.md`

## 1. Goal

Step 3 is the **Intent Harness**. It converts the Step 2 `ContextPacket` plus current user query into a **registry-first, runtime-facing semantic contract**.

Step 3 answers one question only:

> Given the current query and the Step 2 conversation state, which active capability should handle this request, what slots are semantically true, and is clarification required before execution?

Step 3 is the first place where **capability match** exists. Step 2 must not emit capability conclusions.

---

## 2. Responsibilities

Step 3 must:

1. Match against the **active capability surface** only.
2. Produce `matched_capability_ids` and one `matched_capability_id`.
3. Extract semantically correct slots.
4. Decide whether clarification is required.
5. Preserve explicit user constraints:
   - calendar semantics
   - metric identity
   - target object
   - comparison targets
   - inherited context allowed by Step 2
6. Normalize the result into a runtime-facing output contract.
7. Leave deterministic routing authority to Router.

Step 3 must not:

1. Decide capability chain or task decomposition.
2. Generate SQL.
3. Execute capability logic.
4. Rewrite explicit user semantics into easier rolling windows.
5. Let legacy canonical intent labels override matched capability.

---

## 3. LLM / Harness / Code split

### 3.1 LLM responsibilities

LLM is the **primary semantic judge** for:

1. capability match
2. slot extraction
3. clarification target
4. unknown vs out_of_scope vs in_scope
5. semantic preservation across follow-up turns

### 3.2 Harness responsibilities

Harness enforces:

1. active registry surface
2. max matched capability count
3. allowed output schema
4. critic pass/fail
5. normalization into runtime contract
6. audit / trace metadata

### 3.3 Code responsibilities

Code is the enforcement layer only:

1. loads registry and prompts
2. injects context
3. validates schema
4. blocks contradictions
5. keeps compatibility fields for audit only
6. does not replace semantic judgment with regex/if-else routing

---

## 4. Inputs

Step 3 input contract:

```json
{
  "raw_query": "string",
  "intent_query": "string",
  "session_id": "string|null",
  "context_packet": {
    "turn_relation": {},
    "conversation_context": {},
    "registry_context": {},
    "memory_runtime": {},
    "policy_decision": {}
  }
}
```

Required upstream assumptions:

1. `context_packet` comes from Step 2 only.
2. Step 2 may carry inherited context, but must not pre-classify capability.
3. active capability registry is loaded from the local registry authority.

---

## 5. Outputs

Step 3 official runtime contract:

```json
{
  "intent_type": "business_query|general_qna|out_of_scope|content_brief|marketing_gen",
  "matched_capability_ids": ["capability.id"],
  "matched_capability_id": "capability.id|null",
  "in_scope": true,
  "need_clarification": false,
  "clarification_question": "",
  "clarification_options": [],
  "slots": {},
  "confidence": 0.0,
  "trace": {
    "matcher_prompt": {},
    "critic_prompt": {},
    "normalizer_prompt": {},
    "registry_version": "string|null"
  }
}
```

### 5.1 Allowed `slots`

For `capability.data_fact_query`, the normalized slot surface is:

- `scope`: `yield | vault | allocation | execution | rebalance`
- `metric`: `apy | tvl | vault_list | rebalance_action | execution_detail`
- `entity`: `vault | chain | protocol | market | execution | rebalance_action`
- `aggregation`: `avg | max | min | latest | compare | top_n | bottom_n`
- `timezone`
- `date_from`
- `date_to`
- `calendar_year`
- `calendar_month`
- `week_of_month`
- `exact_day`
- `compare_targets`
- `return_fields`
- `question_shape`
- `chain`
- `protocol`
- `vault_name`

Compatibility fields are allowed for audit only:

- `intent_type_canonical`
- legacy aliases needed by old handlers during migration

Compatibility fields must not be the source of routing authority.

---

## 6. Prompt layers inside Step 3

Step 3 currently uses three semantic layers:

1. `intent_analyzer_op_v2`
   - capability match
   - draft slot extraction
2. `intent_critic_op_v1`
   - semantic drift check
   - repair obvious semantic contradictions
3. `intent_normalizer_op_v1`
   - canonical runtime-facing slot shape

Step 3 consumes Step 2 `turn_relation`, but turn relation itself remains a Step 2 concern.

---

## 7. Clarification contract

Clarification is allowed only when execution is genuinely underspecified.

Step 3 must not ask clarification when the user already supplied:

1. explicit month / week / exact day / absolute date range
2. explicit aggregation (`avg/max/min/latest`)
3. explicit target object when the current capability only needs one target

Clarification rules:

1. one question only
2. example completions allowed
3. no fake UI-button semantics inside Step 3
4. clarification wording must remain semantically faithful to the current query

---

## 8. Failure and fallback

Step 3 failure policy:

1. If LLM output is invalid JSON:
   - do not silently invent a capability
   - return analyzer failure trace
   - allow guarded fallback only if local compatibility parser can stay within registry and schema
2. If capability match exceeds max allowed count:
   - reject as `unknown` or require clarification
3. If output violates registry or schema:
   - block and mark `intent_contract_invalid`
4. If critic detects semantic drift:
   - prefer repaired output
   - if unrepairable, return clarification or failure, not silent coercion

Degraded mode is allowed only for:

1. read-only business query
2. product capability explanation

No side-effect capability may be selected in degraded mode.

---

## 9. Current gaps to close in implementation

The current codebase still violates this contract in these places:

1. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/intent-compat.ts`
   - still contains heavy legacy heuristic rewrites
   - currently mixes compatibility repair with capability authority
2. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/intent-analyzer/intent-parsing.ts`
   - still validates legacy intent labels rather than the v5.2 Step 3 contract
3. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/chat-request-preprocess.ts`
   - still performs part of slot inheritance/repair outside a formal Step 3 contract object
4. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/intent/analyze/route.ts`
   - still exposes a legacy analyzer response shape and trace fields

These are implementation migration items, not Step 3 design authority.

---

## 10. Done definition

Step 3 is considered done only when all are true:

1. capability authority comes from `matched_capability_ids` / `matched_capability_id`
2. Step 3 no longer depends on regex-first fallback for mainline semantics
3. clarification decisions are produced by the Step 3 semantic contract, not compatibility rewrites
4. absolute date / month / week / exact-day questions survive through Step 3 unchanged
5. capability-overview questions resolve to `capability.product_doc_qna` without metrics misroute
6. runtime consumes a single official Step 3 output shape
7. focused Step 3 test matrix passes

---

## 11. Freeze rule

Until Step 3 is accepted:

1. Step 2 remains frozen and must not be reopened for Step 3 defects.
2. Any new bug must first be classified as:
   - Step 2 relation issue
   - Step 3 semantic issue
   - Query Contract issue
   - capability/runtime issue
3. No Step 3 change may reintroduce Step 2-style query patching.
