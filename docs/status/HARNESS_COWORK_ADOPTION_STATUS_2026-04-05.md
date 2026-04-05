# harness-cowork Adoption Status

Date: 2026-04-05
Reference: [anxiong2025/harness-cowork](https://github.com/anxiong2025/harness-cowork)
Workspace: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode`

## 1. Adoption Judgment

`harness-cowork` is useful as a **development harness reference**, not as a replacement for Nexa runtime architecture.

The correct absorption target is:
- repository workflow
- release discipline
- closure quality

The wrong absorption target would be:
- replacing Nexa session/runtime architecture
- importing an external planner/generator/evaluator shell as product runtime

## 2. What Nexa Already Has

The following ideas are already materially implemented in Nexa under different names:

1. deterministic verification
- implemented as runtime verification stage
- reference: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/NEXA_VERIFICATION_RUNTIME_BASELINE_2026-04-02.md`

2. bounded serialized mutation
- implemented as capability execution policy + write lanes
- reference: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/NEXA_RUNTIME_WRITE_LANE_ACCEPTANCE_2026-04-03.md`

3. stable per-turn runtime state
- implemented as session kernel
- reference: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/NEXA_SESSION_KERNEL_BASELINE_2026-04-03.md`

4. interaction history into reusable learning assets
- implemented as interaction log + learning asset derivation
- reference: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/NEXA_SYSTEM_LEARNING_ASSET_BASELINE_2026-04-04.md`

## 3. What Nexa Still Lacks

These are the parts worth planning next:

1. deterministic repository hooks
- pre-commit / pre-push / post-edit guardrails
- purpose: reduce step drift and catch broken boundaries before freeze

2. filesystem task contracts
- per-step implementation contract files for larger multi-file work
- purpose: keep implementation scope explicit and reviewable

3. evaluator feedback ledger
- filesystem feedback records for step closure and follow-up fixes
- purpose: make closure decisions less dependent on ephemeral session memory

4. stronger release harness
- stable release verification checklist and repeatable closure checks
- purpose: move release discipline out of operator memory

## 4. Classification Into Nexa Plan

### Already absorbed enough for current version
- verification-aware runtime
- write-lane mutation safety
- session-kernel runtime contract
- learning-asset derivation

These do **not** require more product work just because `harness-cowork` uses similar ideas.
They should only be mentioned in next-version iteration notes.

### Not yet absorbed and should enter the technical plan
- deterministic repository hooks
- task contract files
- evaluator feedback ledger
- release-harness checks

These belong to:
- product-design classification: `Development Harness / Release Discipline`
- engineering plan classification: `P1 platform deepening`

## 5. Recommended Execution Order

1. add deterministic repo hooks baseline
2. add filesystem task-contract baseline
3. add evaluator feedback ledger baseline
4. add release-harness closure checklist baseline

## 6. Non-Goals

Do not do these:
- import the external repo structure wholesale
- create a mandatory multi-agent planner/evaluator runtime
- replace Nexa product runtime with a dev-harness shell
- confuse repository workflow controls with customer-facing product features

## 7. Final Judgment

`harness-cowork` is worth absorbing only as a **narrow development-harness input**.

For Nexa:
- runtime lessons are already mostly represented
- repository-workflow lessons are the real remaining value
