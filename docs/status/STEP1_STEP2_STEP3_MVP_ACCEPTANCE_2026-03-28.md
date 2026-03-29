# Step 1 / Step 2 / Step 3 MVP Acceptance Baseline

- Date: 2026-03-28
- Status: Active / Official
- Scope: `Step 1` `Step 2` `Step 3`
- Purpose: define the MVP completion boundary before any further runtime expansion
- Governing architecture:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/MAXshot_产品架构设计_v5.2_Harness_OS.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP1_ENTRY_ENVELOPE_CONTRACT_V1_2026-03-21.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP2_SESSION_HARNESS_CONTRACT_V2_2026-03-26.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP3_INTENT_HARNESS_CONTRACT_V1_2026-03-27.md`

## 1. Why this baseline exists

Recent Step 3 testing exposed a real gap:

- implementation progress and regression pass rate were improving
- but the team had not yet fixed the exact MVP completion boundary
- therefore some queries were judged as "failed" even though they belonged to post-MVP complexity

This file fixes that problem by defining:

1. what each step must do for MVP
2. what is acceptable but not required for MVP
3. what is explicitly post-MVP and must not block MVP closure

---

## 2. MVP decision rule

The rule for these three steps is:

- `MVP Must`: must work correctly and consistently
- `MVP Tolerated`: may work partially, may degrade to clarification, but must not silently misroute into the wrong business meaning
- `Post-MVP`: may be rejected, clarified, or downgraded without blocking MVP closure

This means:

- MVP is not "understand any natural language perfectly"
- MVP is "make the common single-goal business conversation reliable"

---

## 3. Step 1 - Entry

### 3.1 MVP Must

Step 1 must:

1. accept chat/raw input and normalize it into one stable `Entry Envelope`
2. preserve `raw_query` without semantic rewriting
3. preserve `session_id` if present and allow `null` if absent
4. emit stable channel/request identity fields
5. avoid producing business semantics such as:
   - capability
   - scope
   - clarification
   - gate result

### 3.2 MVP Tolerated

The current code may still include local anti-contamination guard logic near the entry path if:

1. it exists only to stop obvious stale-context corruption
2. it does not become the main semantic decision path
3. the external contract still remains "pure Entry Envelope"

### 3.3 Post-MVP

The following are not required for Step 1 MVP closure:

1. full three-channel parity across TG / Web / Notion
2. message batching / steer windows
3. platform-native provider abstraction beyond the current active entry path
4. richer entry-level policy segmentation by actor / ACL / role

### 3.4 Current status

Step 1 is considered:

- `MVP acceptable`
- `frozen enough for current work`

Reason:

1. the contract is already narrow and stable
2. the current known gaps are architecture cleanliness gaps, not MVP blockers
3. those gaps belong to post-MVP entry/platform hardening

---

## 4. Step 2 - Session Harness

### 4.1 MVP Must

Step 2 must:

1. classify turn relation using the official taxonomy:
   - `new_session`
   - `new_topic_same_window`
   - `continuation`
   - `clarification_reply`
   - `correction`
   - `history_callback`
2. produce one stable `ContextPacket`
3. decide whether context inheritance is allowed
4. carry or clear clarification state correctly
5. prevent stale clarification contamination
6. support common follow-up semantics across Web and TG

### 4.2 MVP Tolerated

The following are acceptable in MVP:

1. fallback heuristics exist as explicit backup
2. `history_callback` is supported conservatively rather than deeply
3. some advanced recall behavior remains shallow as long as it does not corrupt the active turn

### 4.3 Post-MVP

The following do not block Step 2 MVP closure:

1. deep memory retrieval beyond current context shell
2. multi-turn recall across longer history windows
3. steer-like correction windows before capability dispatch
4. richer multi-channel identity/actor memory models

### 4.4 Current status

Step 2 is considered:

- `MVP complete`
- `frozen baseline`

Reason:

1. it already has an accepted freeze decision
2. the current remaining gaps are memory-system depth and future UX sophistication
3. those are explicitly outside current MVP closure

Reference:

- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP2_FREEZE_DECISION_2026-03-27.md`

---

## 5. Step 3 - Intent Harness

### 5.1 Step 3 core output for MVP

For MVP, Step 3 must turn one user turn into a stable semantic object that answers these five questions:

1. which capability should handle this turn
2. which slots are true enough to pass downstream
3. whether clarification is required
4. whether the request is in scope or out of scope
5. whether the result is already executable as a runtime contract

In practice, the MVP authority fields are:

- `matched_capability_id`
- `matched_capability_ids`
- `slots`
- `need_clarification`
- `intent_type`
- `in_scope`
- `query_contract.completeness`

### 5.2 Step 3 MVP Must

Step 3 must correctly support:

1. single-goal business queries
   - one business domain
   - one main metric
   - one main time range
   - one main target object
2. common follow-up queries
   - `最近7天`
   - `Base 呢`
   - `那其 TVL 呢`
   - `不是平均，是最高`
3. basic clarification decisions
   - missing time range
   - missing aggregation
   - missing target object
4. basic in-scope / out-of-scope / general-qna separation
5. contract formation for normal business queries
   - yield
   - vault list
   - execution detail
   - rebalance/action summary

### 5.3 Step 3 MVP Tolerated

The following are allowed in MVP as long as they do not silently collapse into the wrong meaning:

1. dual-output same-domain questions
   - `最高和最低分别是多少`
   - `次数和原因是什么`
2. simple compare questions
   - `A 和 B 的 APY 比较`
3. month or week summary questions that can be mapped into one dominant contract
4. partial downgrade to one clarification turn when the request is still underspecified

Rules for tolerated cases:

1. they may trigger clarification
2. they may choose one dominant executable subgoal
3. they must not silently misroute into a different domain
4. they must not claim a semantically wrong contract is fully ready

### 5.4 Step 3 Post-MVP

The following do not block Step 3 MVP closure:

1. multi-goal composite queries in one sentence
   - `均值是多少，最高和最低分别是多少`
2. multi-period comparison contracts
   - `2月和3月比较`
3. comparative ranking over change/delta
   - `提高最多`
   - `变化最大`
4. one sentence that simultaneously requires:
   - comparison
   - ranking
   - aggregation override
   - explanation
5. automatic decomposition of one complex user turn into multiple executable sub-queries

These are explicitly `Post-MVP` because they require a deeper contract model than the current single-turn single-contract MVP.

### 5.5 Step 3 current gap statement

Based on the recent three-query inspection, current Step 3 behavior is:

#### Already strong enough for MVP

1. capability match on normal business queries
2. basic scope classification
3. basic out-of-scope separation
4. common follow-up carryover after Step 2
5. single-domain rebalance-style questions

#### Still weak against MVP quality goals

1. some tolerated composite questions are still over-collapsed into one wrong aggregation
2. `query_contract.ready=true` is still too permissive when semantic completeness is not actually met
3. dual-goal requests are not consistently downgraded to clarification vs dominant-goal execution

#### Clearly beyond MVP

1. cross-month change ranking
2. comparative uplift ranking with custom aggregation semantics
3. multi-object multi-aggregation compound questions

### 5.6 MVP closure decision for Step 3

Step 3 is **not yet frozen**, but it can be considered:

- `MVP-near`
- `ready for final MVP closure work`

Step 3 may be frozen for MVP when the following are all true:

1. all `MVP Must` cases are stable
2. `MVP Tolerated` cases do not silently misroute
3. `Post-MVP` cases are explicitly documented as:
   - clarification
   - downgrade
   - or unsupported-in-MVP
4. `query_contract.ready` is only true when the semantic contract is genuinely executable

---

## 6. How to judge future test cases

When a new Step 3 test case appears, judge it in this order:

1. Is it `MVP Must`?
   - if yes, it must work correctly
2. Is it `MVP Tolerated`?
   - if yes, clarification or downgrade may still pass
3. Is it `Post-MVP`?
   - if yes, it must not block MVP closure, but should be recorded as expansion work

This is now the required evaluation order for Step 3 acceptance.

---

## 7. Practical conclusion

Current MVP judgment across the first three steps is:

| Step | MVP status | Freeze status | Main conclusion |
| --- | --- | --- | --- |
| Step 1 | Acceptable | Frozen enough | current gaps are platform/entry expansion, not MVP blockers |
| Step 2 | Complete | Frozen | current remaining gaps are deeper memory features, not MVP blockers |
| Step 3 | Near-complete | Not frozen | main remaining work is to close the single-contract MVP boundary and explicitly downgrade post-MVP query shapes |

---

## 8. Next action rule

From this point onward, Step 3 work must follow this rule:

1. close `MVP Must`
2. prevent silent failure on `MVP Tolerated`
3. document `Post-MVP`

Do not use post-MVP composite queries as the sole evidence that Step 3 MVP has failed.

