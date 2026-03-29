# MAXshot Harness Gap Map

- Date: 2026-03-25
- Scope: `admin-os` current architecture vs. target harness architecture
- Primary external reference: [Anthropic - Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- Internal baselines:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP2_CURRENT_GAP_ANALYSIS_2026-03-21.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/REGISTRY_FIRST_DELIVERY_STATUS_2026-03-20.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/MAIN_FLOW_9STEP_ACCEPTANCE_2026-03-21.md`

## 1. Why this document exists

The current system has moved beyond a pure MVP problem of “missing capability.” The dominant problem is now harness quality:

- wrong capability can still execute on a valid query
- follow-up handling can still drift or contaminate a new topic
- capability output can be internally consistent but semantically wrong for the user request
- deployment and verification have required too much manual correction

This is a harness problem, not a base-model problem.

## 2. Working definition

For MAXshot, the harness is the system outside the model that makes agent behavior stable, auditable, and correct enough for long-running multi-step work.

Working formula:

- `MAXshot Agent = Model + Harness`

In our system, harness includes:

- registry-driven capability surface
- conversation/session management
- deterministic gate and router
- structured artifacts between stages
- evaluator/critic loops
- trace, audit, and replay
- deployment and regression verification

Important clarification:

- LLM is the primary semantic decision-maker
- harness is the reliability system around the LLM
- code is the enforcement mechanism of the harness, not a replacement for semantic reasoning

## 3. Current diagnosis

## 3.1 What is already good enough

1. Capability registry as runtime truth source is in place.
2. Router remains deterministic and is not directly delegated to the model.
3. Gate/Seal/Audit chain exists and is testable.
4. Main business capability (`data_fact_query`) is usable.
5. Regression scripts exist and are already part of the development loop.

## 3.2 What is still structurally weak

1. Step 2 conversation management is not yet first-class.
2. Step 3 matching is improved but still mixed with compatibility logic and legacy fallback.
3. There is no formal result evaluator between capability execution and user return.
4. Structured handoff artifacts between steps are not yet strict enough.
5. Canonical source rules per query type are not sufficiently hardened.
6. Deployment verification is still partially manual and not yet encoded as a stable release harness.

## 4. Anthropic harness ideas mapped to MAXshot

| Anthropic idea | What it means there | MAXshot current state | MAXshot gap | Recommendation |
|---|---|---|---|---|
| Structured handoff artifacts | Agents exchange files/contracts between sessions | We have step concepts and partial runtime objects | Artifacts are still partially implicit and spread across helpers | Define strict JSON contracts for all 9 main-flow steps |
| Planner / Generator / Evaluator split | Separate planning, implementation, and skepticism | We have analyzer + router + capability execution | We do not yet have a true skeptic/evaluator layer | Add a `critic` layer after execution and before final return |
| Context resets / compaction strategy | Prevent long-task drift and context anxiety | We have TTL and partial session state | No formal reset policy, no turn-relation contract | Finalize Step 2 as explicit conversation harness |
| Sprint contract before execution | Generator and evaluator agree on “done” before building | We ask some clarifications ad hoc | No formal query contract before capability execution | Introduce `Query Contract` before data query execution |
| Evaluator with independent criteria | External skeptical judge catches wrong-but-plausible output | No independent evaluator exists | Wrong routed answers can still reach user | Block final response unless critic passes semantic alignment |
| Long-running harness > stronger prompt | Better system design outperforms prompt-only optimization | We still spend too much effort on prompt patching | Prompt changes are compensating for missing system structure | Shift effort from prompt patching to harness hardening |

## 5. MAXshot harness target model

The target model for MAXshot should be:

1. `Matcher`
   - Purpose: capability match + slot extraction + relation classification
   - Main judge: LLM
   - Guardrails: Harness contract validation implemented by code

2. `Router`
   - Purpose: deterministic capability binding and execution authority
   - Main judge: Code
   - Guardrails: registry, gate policy, side-effect policy

3. `Executor`
   - Purpose: capability execution against canonical source
   - Main judge: Code / capability runtime
   - Guardrails: source contract, read-only policy, runtime validation

4. `Critic`
   - Purpose: reject semantically wrong answers before user sees them
   - Main judge: LLM + deterministic checks
   - Guardrails: required fields, capability consistency, error taxonomy, semantic fit

This is the smallest useful multi-role harness for the current product.

## 6. The four harness priorities

These are the highest-value harness upgrades. They should be treated as architecture work, not “nice to have” refactors.

### Priority 1 - Session Harness

Goal:
- make Step 2 a first-class conversation manager

Must define:
- turn relation taxonomy
  - `new_session`
  - `new_topic_same_window`
  - `continuation`
  - `clarification_reply`
  - `correction`
  - `history_callback`
- session reset policy
- slot inheritance policy
- clarification carry-over policy
- context expiry and recall policy

Current state:
- partly implemented
- still rule-heavy
- not yet fully explicit as a stable contract

Required correction:
- move relation understanding out of heuristic-heavy rule logic and into LLM-led classification

Blocking symptoms already seen:
- new question swallowed as old clarification
- follow-up ambiguity
- inconsistent TG/Web multi-turn experience

### Priority 2 - Intent Harness

Goal:
- make Step 3 registry-first, capability-aware, and contract-driven

Must define:
- active capability list as only executable surface
- match output contract
  - `matched_capability_ids`
  - `primary_capability_id`
  - `slots`
  - `need_clarification`
  - `clarification_target`
- explicit out-of-scope behavior
- explicit unknown behavior
- fallback boundaries

Current state:
- materially improved
- still retains compatibility layers and prompt patching pressure

Required correction:
- capability selection must remain registry-bounded, but semantic matching must be LLM-led rather than regex-led

Blocking symptoms already seen:
- product-definition questions entering business query path
- absolute date queries getting forced into generic time-window clarification

### Priority 3 - Artifact Contract

Goal:
- every step should emit one hard artifact; no invisible step-state mutation

Required artifacts:
1. `EntryEnvelope`
2. `ContextPacket`
3. `IntentIR`
4. `GateDecision`
5. `TaskSeal`
6. `CapabilityBinding`
7. `CapabilityResult`
8. `CriticDecision`
9. `UserResponse`

Current state:
- partial
- some runtime objects exist (`memory_runtime`, registry refs, task/execution payload)
- but no end-to-end strict artifact discipline

Blocking symptoms already seen:
- slots inferred in one layer being weakened or overridden later
- stale semantics surviving too long in helpers

### Priority 4 - Result Evaluator

Goal:
- no capability result reaches the user unless it passes semantic validation

Critic checks should include:
- capability matches the query class
- result answers the actual user ask
- error text matches true failure mode
- clarification request is justified
- evidence source is compatible with answer type
- final summary does not contradict rows/meta

Current state:
- missing

Blocking symptoms already seen:
- “what is MAXshot” returning APY output
- “latest execution” returning stale/incomplete rows without challenge
- ambiguous next-actions being treated as UI interaction rather than guidance

## 7. Query Contract proposal for `data_fact_query`

Before execution, the system should form a `Query Contract`.

Suggested shape:

```json
{
  "capability_id": "capability.data_fact_query",
  "query_class": "business_fact",
  "entity": "vault|execution|yield|allocation|rebalance",
  "metric": "apy|tvl|count|status|allocation|execution_detail",
  "aggregation": "latest|avg|max|min|top_n|list",
  "time_range": {
    "kind": "relative|absolute|none",
    "date_from": null,
    "date_to": null,
    "window": null,
    "timezone": "Asia/Shanghai"
  },
  "filters": {
    "chain": null,
    "protocol": null,
    "vault_name": null,
    "execution_id": null
  },
  "source_contract": {
    "canonical_source": "string",
    "freshness_key": "string",
    "requires_complete_row": true
  },
  "clarification": {
    "required": false,
    "missing_slots": []
  }
}
```

Interpretation:
- if the contract is complete enough, execute
- if incomplete, clarify
- if source contract cannot be satisfied, fail with accurate no-data / insufficient-data semantics

This is the query equivalent of a sprint contract.

## 8. Canonical source discipline

Current recurring weakness:
- query intent and source semantics are not always bound tightly enough

Example already observed:
- `latest execution` fell onto stale/incomplete rows because source freshness logic was weak

Recommendation:
- every `data_fact_query` subtype must have an explicit canonical source rule
- every canonical source rule must define:
  - source object
  - freshness column(s)
  - completeness rule
  - fallback source, if allowed
  - rejection rule, if source is insufficient

Example:

- `execution_detail.latest`
  - source: `executions`
  - freshness: `updated_at desc`, fallback `created_at desc`
  - completeness: `id/status` required, `vault_name` preferred; if missing, label as incomplete source row
  - fallback: none unless explicitly defined

This is a harness rule, not a prompt rule.

## 9. Where prompts still matter

Prompts still matter, but in a narrower role.

Prompts should be used for:
- semantic relation classification
- capability matching
- slot extraction
- clarification wording
- critic evaluation wording

Prompts should not be responsible for:
- router authority
- source truth selection
- freshness ordering
- side-effect permission
- audit state
- release verification

In other words:
- prompts should handle ambiguity
- harness should handle correctness boundaries

In MAXshot terms:
- LLM should lead semantic understanding
- harness should constrain and verify the LLM
- code should enforce those constraints without becoming the semantic decision-maker

## 10. Current anti-patterns to stop

1. Expanding capability count before hardening the harness.
2. Using prompt patching to compensate for missing source contracts.
3. Letting execution results reach the user without semantic criticism.
4. Keeping too many legacy compatibility branches in the hot path.
5. Treating deployment verification as manual operator memory instead of release harness.

## 11. Recommended execution order

### Phase A - Hardening, no capability expansion

1. Finalize Step 2 session harness
2. Finalize Step 3 intent harness
3. Introduce `Query Contract`
4. Introduce `CriticDecision`
5. Encode canonical source rules for top business query classes

### Phase B - Tighten the hot path

1. Reduce legacy compatibility branches in match/router path
2. Tighten gate/seal so they consume the new strict artifacts only
3. Make return path depend on critic pass/fail

### Phase C - Then expand capability surface

1. real `product_doc_qna` retrieval path
2. richer `content_generator` policies
3. `publisher` activation only after critic/audit path is stable

## 12. Concrete guidance for our next development cycle

For the next cycle, the engineering rule should be:

- do not add major new capability classes until the following exist:
  - Step 2 stable contract
  - Step 3 stable contract
  - Query Contract for `data_fact_query`
  - CriticDecision in the hot path

If forced to choose only one structural addition, choose:

- `CriticDecision`

Reason:
- it catches wrong-but-plausible system behavior that tests and prompts currently miss
- it converts many silent semantic failures into explicit retry / clarify / reject flows

If forced to choose two, choose:
1. `Step 2 session harness`
2. `CriticDecision`

## 13. Practical conclusion

Current MAXshot is not blocked by a weak model. It is limited by harness maturity.

The immediate path to better product behavior is:
- less prompt patching
- fewer hidden state transitions
- stricter artifacts
- explicit source contracts
- independent result criticism

That is the shortest path from “MVP that often works” to “agent system that is reliable enough to trust under real user interaction.”
