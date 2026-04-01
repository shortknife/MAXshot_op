# Claude Code To MAXshot Mapping

Date: 2026-04-01
Workspace: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode`
Purpose: map Claude Code’s runtime concepts to the current MAXshot MVP architecture, identify what already exists, what is thin, and what is explicitly post-MVP.

Reference inputs:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/CLAUDE_CODE_ARCHITECTURE_ANALYSIS_2026-04-01.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/CLAUDE_CODE_HARNESS_RUNTIME_DEEP_DIVE_2026-04-01.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/CLAUDE_CODE_ADOPTION_ASSESSMENT_2026-04-01.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/MVP_MODULE_IMPLEMENTATION_MAP_2026-04-01.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/MVP_ONE_PAGER_2026-04-01.md`

## 1. Executive Summary

MAXshot already has a meaningful harness/runtime spine.

The short version:

- MAXshot already has the equivalent of **entry → intent → gate → sealer → router → capability → audit → delivery**.
- MAXshot does **not** yet have a Claude-Code-level **session kernel** or **task runtime**.
- MAXshot has a usable but thin **session context + memory** layer.
- MAXshot has a strong **business fact query plane**, which is more domain-specific and narrower than Claude Code’s general tool runtime.

The direct mapping judgment is:

- **already present in MVP**: around 50%
- **present but thin / partial**: around 30%
- **clearly post-MVP**: around 20%

## 2. Mapping Table

| Claude Code Concept | MAXshot Current Equivalent | Current Status | Judgment |
|---|---|---|---|
| Session kernel (`QueryEngine`) | No single kernel object; split across chat service + router + session context | partial | missing a unified runtime owner |
| Turn executor (`query.ts`) | Harness chain + chat ask + business intent handler | present | narrower but real |
| Structured input preprocessing | intent preprocessing + entry normalization | present | good enough for MVP |
| Runtime-controlled tool execution | capability execution + business query pipeline | present | domain-specific, not general-purpose |
| Rich tool execution context | capability context + filters + session context + memory refs | partial | thinner than Claude Code |
| Retry/recovery state machine | partial in chat/intent path, not unified as one state machine | partial | needs formalization later |
| Task abstraction | none at Claude-Code depth | weak | post-MVP gap |
| Background/local agents | none as first-class runtime tasks | weak | post-MVP gap |
| In-process teammates | none as runtime actor model | weak | post-MVP gap |
| Remote agents / remote tasks | none as runtime object | absent | post-MVP |
| Structured transport boundary | HTTP API boundaries exist; no single StructuredIO protocol | partial | enough for current channels, not unified |
| Permission/policy mediation in runtime | Gate + confirmation + write controls + audit | present | strong for MVP |
| Session transcript persistence | execution/audit/fact persistence, but not full conversation runtime transcript | partial | enough operationally, not kernel-grade |
| Memory writeback and weighting | implemented | present | thin but real |
| Session memory recall | session-context + router memory selection | partial | thin layer |
| Runtime skill discovery | none | absent | post-MVP |
| MCP/plugin runtime richness | capability registry only, not equivalent breadth | weak | intentionally narrower |
| Product command shell | not applicable | intentionally absent | not needed |
| TUI runtime shell | not applicable | intentionally absent | not needed |

## 3. What MAXshot Already Has That Maps Cleanly

### 3.1 Entry and turn initiation

Claude Code equivalent:
- CLI/host input + `processUserInput()`

MAXshot current files:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/chat/ask/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/intent/analyze/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/chat-request-preprocess.ts`

Current state:
- requests are normalized before execution
- intent analysis is separated from downstream business execution
- session context can be merged into request interpretation

Judgment:
- this already maps to Claude Code’s input normalization stage at MVP level
- it is narrower, but structurally sound

### 3.2 Deterministic routing spine

Claude Code equivalent:
- conversation runtime deciding what execution path to enter

MAXshot current files:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/router/router-main.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/router/task-decomposition.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/router/capability-scheduling.ts`

Current state:
- Router loads execution
- decomposes into capability chain
- selects memories
- executes capability chain deterministically
- writes audit events

Judgment:
- this is a real harness spine
- it is closer to a deterministic scheduler than Claude Code’s broader session kernel
- for MAXshot’s scope, this is already one of the strongest implemented pieces

### 3.3 Strong domain-specific execution substrate

Claude Code equivalent:
- generic tool runtime

MAXshot current files:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/capabilities/business-data-query.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/capabilities/business-query-provider.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/capabilities/business-query-pipeline.ts`

Current state:
- runtime does not expose a huge general-purpose tool universe
- instead it exposes a controlled business query plane over canonical fact tables
- filters, normalization, summarization, and response shaping are already implemented

Judgment:
- this is not Claude Code’s tool platform
- but it is the correct equivalent for current product scope
- MAXshot is intentionally narrower and more auditable here

### 3.4 Permission and policy enforcement

Claude Code equivalent:
- runtime-integrated permissions/sandbox/tool approval

MAXshot current files:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/execution/confirm/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/memory/writeback/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/memory/weight-apply/route.ts`
- write-enabled assertions and audit logging around write paths

Current state:
- write actions are gated
- confirmation is explicit
- memory changes are audited
- router only runs confirmed executions

Judgment:
- this is one of MAXshot’s strongest areas
- it maps well to the “runtime remains authority” principle

### 3.5 Audit-first persistence

Claude Code equivalent:
- transcript/session/result persistence

MAXshot current state:
- execution records
- fact writes
- audit events
- memory writeback audit chain
- canonical ingestion records

Judgment:
- MAXshot does not yet have Claude Code’s full session transcript runtime
- but it already has stronger business/audit persistence than many MVP systems

## 4. What MAXshot Has, But Only as a Thin Layer

### 4.1 Session harness / follow-up context

Current files:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/session-context.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/business-postprocess.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/handlers/business-intent-handler.ts`

What exists:
- session-scoped business context
- TTL-based follow-up inheritance
- inheritance for chain/protocol/vault/time window/compare targets

What is missing relative to Claude Code:
- no single conversation kernel object
- no formal per-turn state machine owned by a session runtime
- no deep message transcript as runtime state

Judgment:
- this is good MVP context continuity
- this is not yet a kernel-grade session runtime

### 4.2 Memory / Working Mind

Current files:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/router/memory-selection.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/memory/writeback/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/memory/weight-recommendation/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/memory/weight-apply/route.ts`

What exists:
- memory rows can be written
- weights can be adjusted
- memories can be selected by type and content tag scoring
- `createWorkingMind()` returns memory refs into runtime flow

What is missing relative to Claude Code:
- no deep synthesized working memory object
- no strong runtime recall pipeline
- no maintenance loop equivalent to session-memory extraction
- no strong user/profile memory

Judgment:
- this is real memory infrastructure
- but it is clearly thin-layer MVP memory

### 4.3 Transport boundary

Claude Code has:
- `StructuredIO`
- `HybridTransport`
- remote bridge modes

MAXshot has:
- HTTP API boundaries
- TG/web channel readiness
- route-level tracing and normalization

Current files:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/chat/ask/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/intent/analyze/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/ingestion/route.ts`

Judgment:
- MAXshot has channel interfaces
- it does not yet have one unified host/runtime protocol layer
- this is acceptable for current MVP scope

## 5. What MAXshot Clearly Does Not Have Yet

### 5.1 Session kernel equivalent to `QueryEngine`

MAXshot currently spreads runtime responsibilities across:
- API routes
- chat ask service
- intent analyzer
- router
- session context store

There is no single object that owns:
- mutable conversation state
- turn continuity
- transcript lifecycle
- memory injection lifecycle
- unified result semantics

Judgment:
- this is the clearest Claude Code gap if the product eventually wants a richer harness core

### 5.2 Task runtime

Claude Code has:
- `Task.ts`
- local agents
- remote agents
- in-process teammates
- task outputs
- task restoration/polling

MAXshot current state:
- no first-class task abstraction for background capability work
- no runtime actor model for subagents/teammates
- no task inspection/output runtime

Judgment:
- this is a deliberate non-MVP omission
- if future strategy/runtime complexity increases, this becomes a major architectural decision point

### 5.3 Runtime-managed subagent / teammate model

MAXshot current state:
- no true runtime teammates
- no background agent lifecycle
- no nested execution actors with separate state

Judgment:
- absent by design today
- post-MVP only if product actually needs it

### 5.4 Runtime skill/plugin discovery

Claude Code has dynamic skill discovery and conditional skill activation.

MAXshot current state:
- capability registry exists
- but runtime capability set is fixed and much narrower

Judgment:
- not currently needed
- useful only if MAXshot becomes a broader operating system rather than a bounded business system

## 6. The Most Important Difference In Philosophy

Claude Code is a **general agent runtime product**.

MAXshot is currently a **bounded business-query and execution-governance system**.

That difference changes what “missing” means.

For example:
- not having a TUI shell is not a weakness
- not having a massive command surface is not a weakness
- not having generic task swarms is not automatically a weakness

The real question is narrower:

**which Claude Code runtime ideas would improve MAXshot’s correctness or leverage without breaking its bounded-system posture?**

That narrows the relevant gaps to a smaller set.

## 7. Highest-Value Gaps For MAXshot

If MAXshot chooses to absorb Claude Code ideas later, the highest-value targets are:

### 1. Unified session kernel

Current issue:
- runtime concerns are split across multiple modules

Potential gain:
- one owner for conversation state, follow-up state, memory refs, and result lifecycle

Priority:
- high architectural value
- not necessary for current MVP

### 2. Formal turn state machine

Current issue:
- retries, clarification, recovery, and follow-up logic are distributed rather than modeled as one state machine

Potential gain:
- clearer invariants
- easier debugging and recovery reasoning

Priority:
- high for post-MVP harness maturity

### 3. Task abstraction for long-lived work

Current issue:
- system does not yet have a durable runtime object for background analyses or future long-running strategy tasks

Potential gain:
- would support richer async execution cleanly

Priority:
- medium to high, but only when product scope expands

### 4. Better structured host/runtime boundary

Current issue:
- channels exist, but there is no single structured runtime protocol

Potential gain:
- cleaner reuse across TG/web/future hosts

Priority:
- medium

### 5. Maintenance-loop style memory/evolution jobs

Current issue:
- memory exists, but learning/evolution loop is fragmented

Potential gain:
- could support interaction-log-driven learning assets later

Priority:
- medium, post-MVP

## 8. Low-Value Or Wrong-Stage Gaps

These should not drive design decisions now:

1. terminal product shell parity
2. command registry breadth
3. huge feature-flag matrix
4. generic plugin runtime surface
5. generic teammate swarms just because Claude Code has them
6. product-surface imitation

Those are not current leverage points for MAXshot.

## 9. Final Mapping Judgment

### Already equivalent enough for MVP

- entry normalization
- intent harness
- deterministic router spine
- bounded capability execution
- write gating and audit policy
- canonical ingestion and fact persistence
- bounded follow-up context

### Present but thin

- session continuity
- working memory
- runtime transport boundary
- result lifecycle unification

### Missing and only justified post-MVP

- session kernel object
- formal turn state machine
- first-class task runtime
- teammate/subagent runtime actors
- dynamic runtime skill discovery

## 10. Final Conclusion

The correct mapping conclusion is:

**MAXshot already has a valid bounded harness, but not yet a Claude-Code-style agent runtime kernel.**

That is not a failure. It is simply a different maturity level and a different product scope.

If MAXshot evolves further, the most defensible Claude Code borrowings would be:

1. a unified session kernel
2. a formal turn state machine
3. a first-class task runtime
4. a cleaner host/runtime protocol boundary

Everything else should be considered optional until the product truly needs it.
