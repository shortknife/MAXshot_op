# Nexa v5.3 Delta Design (2026-04-02)

## 1. Purpose

This document defines the next product-design upgrade on top of the current bounded MVP.

It is a **delta design**, not a full rewrite.

Why delta instead of rewrite:
- the MVP mainline is already real and accepted
- platform framing has already shifted from `MAXshot platform` to `Nexa platform`
- high-value external assets have already been absorbed
- the remaining work is structural upgrade, not greenfield ideation

This document upgrades product design in six areas:
1. platform topology
2. plane model
3. verification-aware execution model
4. three-layer memory model
5. learning and mutation roadmap
6. development harness and release discipline

---

## 2. Baseline

This delta builds on the following accepted baseline:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/MVP_ONE_PAGER_2026-04-01.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/MVP_MODULE_IMPLEMENTATION_MAP_2026-04-01.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/NEXA_PLATFORM_REFRAME_2026-04-01.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/NEXA_PLATFORM_ROADMAP_2026-04-01.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/PLATFORM_ASSET_ABSORPTION_STATUS_2026-04-02.md`

External design inputs already absorbed:
- parent project harness / memory / governance assets
- Nexa FAQ / KB product assets
- Claude Code runtime pattern study
- CC_MAXshot time/sql/test assets

---

## 3. Executive Decision

### 3.1 Product identity

Active rule:
- `Nexa` = platform / product family / runtime architecture
- `MAXshot` = customer sample solution / reference deployment

### 3.2 Product structure

The product should no longer be described as a single-system tool.
It should be described as a platform with distinct product planes.

### 3.3 Upgrade direction

The next design upgrade is:
- **not** more feature enumeration
- **not** a broad asset-mining phase
- **not** a repo-wide rename

It is:
- platformization of the product design
- formalization of product planes
- formalization of verification and bounded mutation
- formalization of memory and learning layers
- formalization of development-time harness controls for safe iteration

---

## 4. Nexa Platform Topology

### 4.1 Nexa Core

Owns:
- entry normalization
- session harness
- intent harness
- gate
- sealer
- router
- capability execution runtime
- audit / trace
- bounded delivery
- thin runtime memory

Status:
- accepted MVP spine

### 4.2 Nexa Ops / Data Plane

Owns:
- canonical ingestion
- fact tables
- business data query
- execution / rebalance / yield / allocation explanation
- operational and audit-facing query surfaces

Status:
- accepted MVP mainline

### 4.3 Nexa FAQ / KB Plane

Owns:
- knowledge-base source set
- FAQ answering
- FAQ fallback
- FAQ QA review
- KB QC
- review queue
- KB management visibility

Status:
- stage 2 runtime wiring accepted
- still early product workflow maturity

### 4.4 Customer Solution Layer

Owns:
- customer-specific solution packaging
- customer KB ownership
- customer-specific capability exposure
- future tenant separation

Current examples:
- `MAXshot`

Status:
- conceptually defined only

---

## 5. Plane Model Upgrade

## 5.1 Why a plane model is needed

The old design center was primarily a bounded autonomous system.
The new design center must support multiple value planes without collapsing them into one generic chat surface.

A plane model is needed to prevent these design failures:
- forcing customer FAQ into product-doc QnA
- forcing customer KB operations into ops/data query
- mixing platform runtime concerns with customer solution concerns
- overloading a single intent/capability family with unrelated responsibilities

## 5.2 Plane rule

Each plane must define:
1. its owned capabilities
2. its owned data surfaces
3. its allowed mutation scope
4. its review / verification path
5. its observability metrics
6. its customer boundary

## 5.3 Current plane set

| Plane | Role | Current State |
|---|---|---|
| Nexa Core | runtime spine | stable MVP |
| Ops / Data Plane | operational facts and query | stable MVP |
| FAQ / KB Plane | customer knowledge query and review | stage 2 accepted |
| Customer Solution Layer | tenant/solution packaging | not formalized |

---

## 6. Execution Model Upgrade

The existing execution spine should be upgraded conceptually from:
- Interpret -> Route -> Execute -> Deliver

to:
- Interpret -> Route -> Execute -> Verify -> Deliver -> Learn

## 6.1 Verify as a first-class stage

This is the most important structural upgrade.

`Verify` is not just test infrastructure.
It is a product/runtime stage.

Verification examples in current system:
- FAQ low-confidence review
- KB QC
- side-effect confirmation
- bounded review queue actions

Future verification forms:
- business query sanity pass
- bounded mutation validation
- contradiction / stale-context checks
- customer-scope validation before write actions

### Design rule

Any capability with one of the following properties should define a verification form:
- low-confidence grounded answer
- mutation intent
- cross-scope write potential
- customer-visible irreversible consequence

## 6.2 Bounded mutation model

Mutations should be treated as a first-class system category.

Capability classes should now be described as:
1. read capability
2. analysis capability
3. review capability
4. mutation capability

Mutation-capability design metadata should eventually include:
- `confirmation_required`
- `mutation_scope`
- `concurrency_safe`
- `rollback_or_compensation_expectation`
- `cost_visibility_required`

This absorbs the useful part of the Claude Code tool-governance lesson without copying its entire runtime architecture.

---

## 7. Development Harness Upgrade

The platform now has enough runtime maturity that release quality is increasingly constrained by development discipline rather than missing core capability only.

Useful external development-harness lessons should be absorbed narrowly, not by replacing Nexa runtime architecture.

### 7.1 What is already absorbed in product/runtime

The following ideas are already substantially represented in Nexa:
- deterministic verification instead of trust in free-form model output
- bounded mutation policy and serialized write lanes
- session-kernel snapshots as a stable runtime contract
- interaction-log to learning-asset derivation

These should be treated as **implemented platform equivalents**, even if the external naming differs.

### 7.2 What is still missing

The following remain missing and should be treated as next-stage development harness work:
1. deterministic local hooks for edit / commit / push boundaries
2. filesystem-based task contracts for multi-step implementation work
3. filesystem-based evaluator feedback ledger for closure decisions
4. stronger release-harness checks before step freeze

### 7.3 Design rule

Development-harness additions should:
- live in repository workflow and docs, not in customer-facing runtime
- strengthen freeze quality and release safety
- avoid introducing a heavy multi-agent runtime as a prerequisite

### 7.4 Current adoption judgment

Absorb only:
- deterministic hooks / guardrails
- externalized implementation state (`contracts`, `progress`, `eval_feedback`)
- skeptical evaluator closure pattern

Do not absorb:
- external project shell conventions as runtime architecture
- full planner/generator/evaluator orchestration as a required product layer

---

## 7. Memory Model Upgrade

Current memory is real but thin.
The next design should formalize a three-layer model.

## 7.1 Layer 1: Session Context

Purpose:
- immediate conversation continuity
- follow-up inheritance
- active clarification state
- recent scope / time / chain / protocol continuity

Examples:
- session context snapshot
- recent turns summary
- active compare targets
- temporary clarified slots

## 7.2 Layer 2: System Learning Memory

Purpose:
- accumulate reusable system intelligence from interaction traces
- improve intent handling, templates, and follow-up quality

This layer should store structured learning assets, not raw conversational dumps.

Examples:
- intent hard cases
- query phrasing corpus
- template candidates
- follow-up resolution cases
- failure / fallback clusters

This is the correct place for the interaction-learning log concept.

## 7.3 Layer 3: Customer Long-Term Memory

Purpose:
- future per-customer preference memory
- customer-bound knowledge or query profile
- persistent biasing for presentation and retrieval

Examples:
- preferred scope or reporting style
- preferred chain/protocol focus
- preferred query language/style
- customer-specific FAQ ownership / review preferences

This layer should remain constrained and structured.
It is **not** a full chat transcript memory.

---

## 8. Learning Model Upgrade

The current design has evolution fragments but not a closed learning loop.

The next design should formalize:
1. interaction capture
2. learning extraction
3. system asset formation
4. bounded redeployment

### 8.1 Interaction capture

Each meaningful interaction should eventually be stored as structured runtime evidence:
- raw query
- normalized/effective query
- intent result
- matched capability
- query contract
- output class
- fallback/review signals
- citations/confidence when applicable

### 8.2 Learning extraction

Periodic extraction should produce:
- hard-case corpora
- template improvement candidates
- verification failure patterns
- follow-up resolution patterns

### 8.3 System asset formation

Only extracted, normalized assets should feed back into the system.

Examples:
- prompt or contract revisions
- new bounded examples
- template library additions
- memory-weight adjustments

### 8.4 Design rule

The system should learn through **structured assets**, not through unrestricted raw memory accumulation.

---

## 9. Prompt Model Upgrade

Prompt design should be treated as a runtime assembly problem, not as isolated prompt text.

Prompt layers should eventually be formalized as:
1. static policy layer
2. runtime context layer
3. capability prompt layer
4. delivery shaping layer

This is a selective absorption from Claude Code’s prompt-runtime lesson.

This does **not** imply longer prompts.
It implies better prompt ownership and composition.

---

## 10. Observability Upgrade

Current observability already covers audit and replay, but the next design should add plane-aware metrics.

New observability categories to add in design:
1. verification metrics
2. review throughput metrics
3. FAQ / KB queue quality metrics
4. interaction-learning metrics
5. cost accounting metrics
6. mutation safety metrics

Examples:
- FAQ fallback rate
- FAQ review approval / reject / resolve ratios
- KB QC acceptance distribution
- interaction log growth and hard-case extraction rate
- capability-level token/cost accounting
- mutation success vs blocked ratio

---

## 11. What We Explicitly Do Not Upgrade Yet

The following remain intentionally deferred:
- full repo/path rename to Nexa
- full customer/tenant implementation
- strong long-term user memory
- unrestricted multi-agent runtime
- complex autonomous strategy execution
- broad side-effect autonomy
- full historical Nexa UI recreation

This keeps the design upgrade bounded and compatible with the current MVP spine.

---

## 12. v5.3 Design Priorities

Priority order after this delta:
1. interaction learning log
2. KB mutation workflow
3. customer / tenant model
4. stronger memory layer
5. runtime evolution items (verification, session kernel, concurrency metadata, cost accounting)

---

## 13. Acceptance Rule For This Delta

This design delta is complete when:
1. platform identity is explicit
2. plane model is explicit
3. verification-aware execution is explicit
4. three-layer memory model is explicit
5. next-stage roadmap is tied to these structures

This delta does **not** require immediate code changes.
It is a design freeze intended to guide the next implementation cycle.
