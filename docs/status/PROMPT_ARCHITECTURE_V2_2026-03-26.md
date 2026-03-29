# Prompt Architecture V2

## Goal
Prompt 从“单层规则清单”升级为“schema-first, layered harness”。

原则：
- LLM-first for semantics
- Harness-enforced for reliability
- Code only validates, constrains, and blocks contradictions

## Current Layering

### Layer 1 - Turn Relation
- Prompt: `turn_relation_classifier_op_v2`
- Responsibility:
  - classify relation only
  - decide whether current turn inherits scope / time window / target object
- Output contract:
  - `type`
  - `inherits_scope`
  - `inherits_time_window`
  - `inherits_target_object`
  - `confidence`
  - `reason`

### Layer 2 - Intent Match
- Prompt: `intent_analyzer_op_v2`
- Responsibility:
  - match active capability
  - extract semantically correct draft slots
  - detect whether clarification is required
- Output contract:
  - `matched_capability_ids`
  - `primary_capability_id`
  - `in_scope`
  - `need_clarification`
  - `missing_slots`
  - `clarification_question`
  - `clarification_options`
  - `slots`
  - `confidence`

### Layer 3 - Intent Critic
- Prompt: `intent_critic_op_v1`
- Responsibility:
  - verify semantic preservation
  - repair obvious drift in time semantics / metric identity / follow-up inheritance
- Output contract:
  - `pass`
  - `reason`
  - `issues`
  - `repaired_output`

### Layer 4 - Intent Normalizer
- Prompt: `intent_normalizer_op_v1`
- Responsibility:
  - normalize draft intent into runtime-facing canonical slot schema
  - keep `scope`, `metric`, `entity`, calendar fields, and capability choice coherent
- Output contract:
  - `intent_type`
  - `matched_capability_ids`
  - `matched_capability_id`
  - `in_scope`
  - `need_clarification`
  - `clarification_question`
  - `clarification_options`
  - `slots`
  - `confidence`

## Why This Split
Old prompt problems:
- capability match, slot extraction, clarification wording mixed together
- month/week/day semantics collapsed into rolling windows
- follow-up fragments reset into generic new questions
- TVL / APY / vault list / rebalance action semantics drifted
- hidden schema hints in runtime conflicted with local prompt contract

V2 fixes:
- separate relation from capability
- separate extraction from critique
- add a dedicated normalizer instead of if/else slot repair
- inject `current_datetime` explicitly
- keep all outputs JSON-schema based
- make failures attributable by layer

## Runtime Wiring
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/context-manager/turn-relation-classifier.ts`
  - loads `turn_relation_classifier_op_v2` first, then v1 fallback
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/intent-analyzer/deepseek-client.ts`
  - loads `intent_analyzer_op_v2` first, then v1 fallback
  - runs `intent_critic_op_v1` after matcher output
  - runs `intent_normalizer_op_v1` after critic output
  - injects `current_datetime` into prompt user templates and schema hint

## Constraints
- Prompt must not rely on giant regex enumerations
- Prompt must preserve explicit time semantics exactly
- Clarification wording is allowed, but only one question per turn
- Product/capability self-description should resolve as capability-aware explanation, not a metrics query

## Known Remaining Gaps
- prompt layer is now strong enough for the 5 baseline recognition cases, but runtime answering is still a separate problem
- `product_doc_qna` still needs a better downstream answer source
- month/week/day SQL contract still depends on downstream query planner maturity
