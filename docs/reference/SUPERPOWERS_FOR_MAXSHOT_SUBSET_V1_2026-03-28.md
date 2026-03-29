# Superpowers for MAXshot - Local Subset v1

- Date: 2026-03-28
- Status: Active / Reference Standard
- Source references:
  - `https://github.com/shortknife/superpowers`
  - `https://raw.githubusercontent.com/obra/superpowers/refs/heads/main/docs/README.codex.md`
- Scope: development workflow only
- Non-goal: this document does not change runtime architecture, product routing, or capability contracts

## 1. Why we keep only a subset

`superpowers` is useful for development harness, not as a direct solution for MAXshot runtime semantics.

For MAXshot, the value is:

1. forcing explicit design agreement before implementation
2. forcing narrower and verifiable implementation tasks
3. forcing targeted verification before closure
4. reducing "we built a lot, but did not agree what done means"

Therefore MAXshot does **not** adopt the whole framework.

We only adopt the parts that directly improve:

1. step-by-step closure quality
2. acceptance clarity
3. debugging discipline
4. reusable skill-style development knowledge

---

## 2. Adopted subset

MAXshot adopts the following 5 workflow/skill ideas as the local subset:

1. `brainstorming`
2. `writing-plans`
3. `systematic-debugging`
4. `verification-before-completion`
5. `dispatching-parallel-agents`

These are the only `superpowers` concepts that should influence the current MAXshot workflow by default.

---

## 3. How each adopted item maps to MAXshot

### 3.1 `brainstorming`

Use when:

1. a step boundary is unclear
2. the team has not agreed on MVP vs post-MVP scope
3. product intent and implementation target are drifting

MAXshot interpretation:

1. before changing a major step contract, define:
   - what this step owns
   - what this step does not own
   - what output artifact it must produce
   - what counts as MVP done
2. do not enter implementation until these questions are explicit

This is the main reason this subset is being adopted.

### 3.2 `writing-plans`

Use when:

1. work spans multiple files
2. refactor touches more than one step boundary
3. a user story contains both design and implementation risk

MAXshot interpretation:

1. plans must be step-aware
2. plans must separate:
   - contract work
   - runtime work
   - regression work
3. plans must say what is in MVP and what is post-MVP

### 3.3 `systematic-debugging`

Use when:

1. regression exists but root cause is unclear
2. multiple layers may be involved
   - prompt
   - step contract
   - runtime
   - provider
3. the same bug keeps reappearing under different tests

MAXshot interpretation:

1. isolate the failing query shape
2. identify the exact step boundary where drift starts
3. fix the root semantic contract, not only the user-visible output
4. rerun only the focused path first

### 3.4 `verification-before-completion`

Use always before declaring a step closed.

MAXshot interpretation:

1. closure requires both:
   - targeted acceptance checks
   - one final regression sweep
2. a step is not done because "the code looks right"
3. a step is done only when:
   - agreed acceptance criteria are satisfied
   - known post-MVP gaps are explicitly documented

### 3.5 `dispatching-parallel-agents`

Use when:

1. there are independent implementation tracks
2. the write scopes are disjoint
3. the result can be integrated deterministically

MAXshot interpretation:

1. use parallel agents for:
   - doc drafting vs runtime implementation
   - test matrix extension vs focused code changes
   - non-overlapping capability branches
2. do not use parallel agents for one tightly coupled semantic bug on the hot path

---

## 4. Explicitly not adopted right now

The following `superpowers` ideas are intentionally **not** part of the current MAXshot default workflow:

1. `using-git-worktrees`
2. mandatory `test-driven-development`
3. `subagent-driven-development` as the default for every task
4. branch-finalization workflow as a required ceremony for every step

Reason:

1. current MAXshot work is still in architecture/contract consolidation
2. forcing full worktree/TDD ceremony on every change would slow MVP closure
3. subagents are useful selectively, not as universal policy

These may be reintroduced later if the development cadence justifies them.

---

## 5. How this changes MAXshot process now

From this point forward, any major step work should follow this sequence:

1. define the step contract and MVP boundary
2. define focused acceptance examples
3. implement only against those examples
4. run focused verification first
5. run one final broader regression before closure
6. freeze or defer explicitly

This sequence is now the local development baseline for:

1. `Step 3` closure
2. later `Step 4/5` contract work
3. capability expansion that affects system semantics

---

## 6. Immediate application to current project

This subset directly explains the current Step 3 adjustment:

1. Step 3 should not continue as open-ended feature expansion
2. Step 3 must first close its MVP acceptance boundary
3. only after that should post-MVP composite query support be expanded

Therefore the next active rule is:

1. finish `Step 3 MVP Must`
2. ensure `MVP Tolerated` cases do not silently misroute
3. record `Post-MVP` cases without letting them block closure

---

## 7. Relationship to local skills

This subset is currently recorded as a document standard, not yet as installed local skills.

If later needed, MAXshot may convert this subset into local skills such as:

1. `maxshot-step-brainstorming`
2. `maxshot-step-closure-check`
3. `maxshot-semantic-debugging`
4. `maxshot-regression-discipline`

That conversion is optional and does not block current project progress.

