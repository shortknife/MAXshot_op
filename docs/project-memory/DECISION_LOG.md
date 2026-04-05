# Decision Log

## D-001
- Decision: `Step1-9` are frozen as MVP baselines.
- Why: each step completed brainstorming, contract, focused tests, closure, and freeze evidence.
- Consequence: current work is validation and hardening, not new step design.

## D-002
- Decision: keep `Post-MVP` complex queries out of `Step3` freeze scope.
- Why: complex composite semantics were delaying delivery and were not required for MVP usefulness.
- Consequence: unsupported composite queries should degrade to clarification, not fake readiness.

## D-003
- Decision: `Step4` is gate-only.
- Why: Step ownership drift caused confusion earlier.
- Consequence: `Step4` may `continue_chat | pass | require_confirmation`; it must not re-do Step3 semantics.

## D-004
- Decision: `Step5` seals only `pass` and `require_confirmation`.
- Why: sealing must operate on authoritative gate output.
- Consequence: `continue_chat` and `out_of_scope` must not enter seal path.

## D-005
- Decision: `Step6` consumes sealed authority and routes deterministically.
- Why: router must not reinterpret raw user intent.
- Consequence: downstream execution uses sealed primary capability and normalized router input only.

## D-006
- Decision: `Step8` and `Step9` use canonical audit/delivery shapes.
- Why: delivery validation exposed integration drift at trace and response layers.
- Consequence: audit writes and final delivery must flow through shared helpers, not route-local formatting.

## D-007
- Decision: adopt a lightweight development memory layer instead of a complex memory system.
- Why: current project memory existed, but was scattered and costly to recover.
- Consequence: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/project-memory/*` becomes the working-memory entry point; `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/*` remains evidence.

## D-008
- Decision: do not integrate `Claude-mem` into the current Codex desktop workflow now.
- Why: the current environment already has Codex-native state plus project-memory docs, while `Claude-mem` is designed primarily for Cursor/OpenClaw/Claude Code style hooks.
- Consequence: strengthen local project memory files instead of introducing a third memory system.

## D-009
- Decision: ingestion hardening comes after green mainline and starts with shared code, not trigger replacement.
- Why: the core problem is data-quality enforcement, not the trigger mechanism.
- Consequence: implement shared ingestion core first; defer trigger-shell replacement decisions.

## D-010
- Decision: stop new `execution_logs_rag` / embedding writes and treat RAG evidence as legacy.
- Why: current fact-table path is live, while embedding availability is unstable and no longer justifies being on the critical path.
- Consequence: investigation and business query paths should rely on canonical fact tables first; RAG remains historical only.

## D-011
- Decision: product memory should evolve as `structured interaction log -> system learning assets -> user long-term memory`, not as per-turn freeform documents.
- Why: raw conversation transcripts are useful for audit and corpus building, but they are a poor primary format for retrieval, statistics, template evolution, and future user-preference memory.
- Consequence: near-term work should capture each query/response into structured operational logs; later iterations can derive intent hard cases, query-template examples, and user preference memory from that layer.

## D-012
- Decision: treat `Nexa` as the platform/product-family name and `MAXshot` as a customer sample solution, not the platform identity.
- Why: the current workspace already contains a general runtime plus imported FAQ platform assets, so keeping `MAXshot` as the platform name would blur platform identity and customer identity.
- Consequence: documentation and future module planning should use `Nexa platform` framing first; any repository-wide physical rename remains a separate later migration.

## D-013
- Decision: define the FAQ / KB Plane as a separate capability family instead of extending existing read-only capabilities.
- Why: customer FAQ, platform documentation QnA, and ops/data fact queries have different grounding sources, evidence expectations, and fallback behavior.
- Consequence: the next implementation phase must introduce `capability.faq_answering` and related FAQ capabilities under a distinct contract and routing boundary; `capability.product_doc_qna` and `capability.data_fact_query` must retain their current ownership boundaries.

## D-014
- Decision: freeze `Nexa FAQ / KB Plane Stage 1` after the four-capability bounded path became green.
- Why: imported FAQ assets were only fully absorbed once the runtime could execute the complete bounded chain `faq_answering -> faq_fallback -> faq_qa_review` alongside isolated `kb_upload_qc`, with focused tests, build, and phase0 regression all passing.
- Consequence: further work should shift from adding FAQ capabilities to management surfaces, review visibility, and stronger KB source expansion under the current contracts.




## D-016 Nexa v5.3 Delta Design Direction (2026-04-02)

- Decision: do not rewrite the full FSD immediately; create a v5.3 delta design on top of the accepted MVP baseline.
- Core upgrade themes: platform topology, plane model, verification-aware execution, three-layer memory model, and learning/mutation roadmap.
- Immediate documentation priority: one-pager/platform framing, layer model, execution model, and Working Mind.
- Deferred implementation priority: interaction learning log, KB mutation workflow, customer/tenant model, stronger memory, and runtime evolution work.
## D-015 FAQ / KB Plane Stage 2 Runtime Wiring Accepted (2026-04-02)
- Scope: runtime-backed `faq_review_queue_op` and `faq_kb_qc_snapshot_op`
- Decision: freeze Stage 2 runtime wiring after real database validation
- Acceptance basis:
  - low-confidence FAQ path successfully wrote runtime review queue rows
  - KB QC runtime snapshot successfully resolved from Supabase
  - natural FAQ grounded path remained non-reviewing
- Implication: FAQ / KB Plane now has verified runtime persistence for review and QC surfaces; further work should move to workflow completion rather than adding more capability types


## D-017 Platform Stage-Next Baseline Accepted (2026-04-02)
- Decision: accept and freeze the current stage-next baseline after live runtime verification of interaction learning log, KB mutation workflow, and customer-bound runtime persistence.
- Why: the platform now carries `customer_id` across KB source inventory, FAQ review queue, and interaction learning, which is sufficient to treat customer/tenant modeling as a real runtime baseline rather than a documentation-only construct.
- Accepted scope: interaction learning log runtime, KB source inventory workflow, FAQ review persistence, customer registry baseline.
- Deferred: full tenant isolation, IAM, customer-bound capability exposure policy, customer admin suite, billing/provisioning.


## D-018 Customer Capability Exposure Baseline Accepted (2026-04-02)
- Decision: enforce customer-bound capability exposure and mutation policy at the current FAQ / KB entry points before expanding deeper tenant features.
- Why: the platform already carries `customer_id`, but without capability exposure rules it still behaves like a customer-labeled single-tenant system.
- Accepted scope: customer registry policy fields, FAQ access blocking, KB mutation blocking, and Customers page policy visibility.
- Deferred: router-wide policy enforcement, IAM, billing/provisioning, and tenant-isolated storage.


## D-019 Operator Boundary Baseline Accepted (2026-04-02)
- Decision: add a runtime operator registry and enforce operator-to-customer scope at current FAQ review and KB mutation write paths.
- Why: customer capability exposure alone is insufficient if any operator can still mutate customer-bound state with a valid write token.
- Accepted scope: operator registry, customer-scope checks for KB register/transition and FAQ review transition, and Customers page operator visibility.
- Deferred: authenticated operator identity, tenant IAM, role hierarchy, and broader route-wide policy enforcement.


## D-020 Stronger Memory Baseline Accepted (2026-04-02)
- Decision: upgrade the memory system from router-context-only selection to a bounded hybrid model that can incorporate interaction-derived learning refs.
- Why: the platform already captures structured interaction logs, but without feeding them back into Working Mind selection there is no real bridge from learning data to runtime behavior.
- Accepted scope: interaction-learning-to-memory transformation, hybrid memory selection, `WorkingMind.learning_ref_count`, and memory runtime policy visibility.
- Deferred: user preference memory, customer long-term memory, autonomous memory evolution, and prompt/runtime redesign around memory.


## D-021 Verification Runtime Baseline Accepted (2026-04-02)
- Decision: introduce a first-class verification stage into the runtime by adding deterministic post-execution verification before final delivery.
- Why: the platform execution model already claims `Interpret -> Route -> Execute -> Verify -> Deliver -> Learn`, but before this change `Verify` existed only as scattered critics and review paths rather than a formal runtime step.
- Accepted scope: runtime verification for business and QnA outputs, explicit `verification_decision`, and `verify_and_finalize` stage instrumentation in chat flow.
- Deferred: verification agents, autonomous repair loops, verification-specific prompts, and customer-specific verification policy.


## D-022 Runtime Cost Baseline Accepted (2026-04-02)
- Decision: add runtime token/cost accounting now as a configurable internal estimate, rather than waiting for a full billing or multi-provider accounting system.
- Why: the platform already has customer boundaries, verification, and interaction learning; without cost visibility there is still no concrete basis for operational tradeoff decisions.
- Accepted scope: chat-path runtime cost events, pricing config, runtime cost surface, and persistence into `runtime_cost_events_op`.
- Deferred: invoice-grade billing, tenant billing workflows, background-task accounting, and provider reconciliation.

## D-023 Capability Execution Policy Baseline Accepted (2026-04-03)
- Decision: standardize write-side capability metadata and enforce mutation policy through registry-backed execution rules rather than route-local hardcoded checks.
- Why: customer exposure and operator scope existed, but mutation semantics were still scattered across FAQ / KB routes and runtime helpers.
- Accepted scope: `execution_mode`, `mutation_scope`, `concurrency_safe`, `requires_confirmation`, and `requires_verification` metadata; runtime mutation policy enforcement for KB source inventory and FAQ review queue; policy visibility in Customers page.
- Deferred: router-wide serialization queues, async task runtime, global capability scheduler constraints, and richer IAM.

## D-024 Runtime Write-Lane Baseline Accepted (2026-04-03)
- Decision: enforce serialized write lanes for non-concurrency-safe mutation capabilities using a runtime lease table keyed by `mutation_scope:customer_id`.
- Why: capability policy metadata already declared serialized mutation scopes, but runtime behavior still allowed concurrent conflicting writes.
- Accepted scope: write-lane runtime, `write_lane_busy` contract, KB source mutation serialization, and FAQ review mutation serialization.
- Deferred: lease expiry/takeover, durable queues, workflow orchestration, and router-wide task lanes.

## D-025 Runtime Write-Lane Acceptance Completed (2026-04-03)
- Decision: accept and freeze the runtime write-lane baseline after live Supabase validation.
- Why: both KB source mutation and FAQ review mutation now return `409 write_lane_busy` under an active lease and succeed after lease release, with no residual active lane rows left behind.
- Accepted scope: real runtime contention handling, post-release success path, and lane cleanup verification for FAQ / KB mutation families.
- Deferred: lease expiry, queue takeover, and router-wide generalized execution lanes.

## D-026 Session Kernel Baseline Accepted
- Date: 2026-04-03
- Decision: Add a formal per-turn `session_kernel` snapshot into chat runtime metadata instead of continuing to rely on scattered session, recall, verification, and working-mind fields.
- Why: The platform now has customer boundary, verification, cost, learning log, and memory baselines. A session kernel is required to make runtime state auditable and reusable without introducing a heavier orchestration runtime too early.
- Scope: Prepared kernel build, post-verification finalization, interaction-log extraction, and UI visibility.
- Consequence: Future runtime evolution can build on one stable session snapshot contract rather than re-deriving state from multiple meta fragments.

## D-027 Prompt Runtime Baseline Accepted
- Date: 2026-04-03
- Decision: Add a unified `prompt_runtime` snapshot to chat runtime metadata so prompt assembly can be audited through one stable contract instead of scattered per-surface prompt fields only.
- Why: The platform now has session kernel, verification, cost, and learning baselines. Prompt source and assembly state must be normalized before stronger prompt policy or runtime prompt orchestration can be introduced.
- Scope: Prompt runtime normalization, chat metadata attachment, interaction-log extraction, and UI visibility.
- Consequence: Future prompt-policy, prompt replay, and prompt observability work can build on one runtime contract.

## D-028 Prompt Policy Baseline Accepted
- Date: 2026-04-03
- Decision: Add a runtime prompt policy layer that checks prompt source eligibility and execution prompt requirements per customer and capability.
- Why: Prompt runtime is now visible, but visibility alone is insufficient. Prompt usage must become governable and verification-aware before prompt editing and override workflows expand.
- Scope: Prompt policy registry, per-turn prompt policy evaluation, verification integration, interaction-log extraction, and UI visibility.
- Consequence: Future prompt governance can build on an enforceable source-policy baseline instead of relying on conventions only.

## D-029 Prompt Governance Surface Baseline Accepted
- Date: 2026-04-03
- Decision: Upgrade `/prompts` into a governance surface that combines prompt inventory, policy summary, runtime evidence, and bounded editing.
- Why: Prompt runtime and prompt policy baselines are now in place. The product needs a management surface that reflects those controls instead of exposing only a raw edit form.
- Scope: Governance snapshot loader, prompt surface redesign, main navigation entry, and runtime/policy rollups.
- Consequence: Future prompt approval, rollback, and release workflows can be added on top of an already structured product surface.

## D-030 Prompt Release / Rollback Baseline Accepted
- Date: 2026-04-03
- Decision: Add a bounded prompt release and rollback path before introducing richer prompt approval workflow.
- Why: Prompt governance is now visible, but active prompt changes still need explicit runtime controls, serialized mutation, and operator-attributed release logging.
- Scope: prompt mutation capability metadata, prompt release runtime, prompt action API, version history in `/prompts`, and release event logging.
- Consequence: Future prompt approval, staged rollout, and rollback safety checks can build on an already governed mutation baseline.

## D-031 Prompt Filesystem Baseline Accepted
- Date: 2026-04-04
- Decision: Switch prompt source of truth from Supabase-managed rows to filesystem-managed markdown documents under `admin-os/prompts/`.
- Why: Prompt assets are now platform runtime assets, closer to code than to operational data. Git-native review, diff, versioning, and rollback are a better fit than table mutation.
- Scope: markdown prompt inventory, filesystem prompt registry, runtime prompt-source switch, filesystem-first `/prompts` governance surface, and deprecation of Supabase prompt mutation path.
- Consequence: Prompt management is now single-path and auditable through repository history rather than mixed table/config sourcing.

## D-032 Prompt Legacy Cleanup Accepted
- Date: 2026-04-04
- Decision: Remove obsolete Supabase prompt-management assets and old local JSON prompt source configs after filesystem prompt migration.
- Why: Leaving release runtime, table-oriented docs, or legacy prompt JSON in place would preserve multiple prompt paths and keep the product mentally inconsistent.
- Scope: remove prompt release runtime artifacts, remove `prompt-library-op` configs, remove `capability.prompt_governance_mutation`, and update current status docs to filesystem-first wording.
- Consequence: Prompt architecture is now single-path in code and in current product status documents.


## D-033 System Learning Asset Baseline Accepted
- Date: 2026-04-04
- Decision: Add a first-class learning asset derivation layer on top of runtime interaction logs.
- Why: The platform already records interaction history, prompt policy, verification outcome, and customer signals, but those records were not yet transformed into reusable operational assets.
- Scope: hard-case derivation, capability candidate aggregation, customer profile rollups, prompt policy issue extraction, `/learning-assets` surface, and markdown export.
- Consequence: Future memory evolution, prompt tuning, and capability refinement can start from structured learning assets instead of raw logs only.


## D-034 Customer Memory and Wallet Baseline Accepted
- Date: 2026-04-04
- Decision: Add filesystem-managed customer long-term memory and wallet contract assets, and inject customer-profile memory into working mind.
- Why: The platform already had customer identity and boundary control, but still lacked a usable long-term preference layer and a simple wallet/payment posture for future agent commerce.
- Scope: customer asset markdown, asset runtime loaders, customer-profile memory refs, customer page redesign, and wallet contract visibility.
- Consequence: Nexa now has a lightweight customer-aware model that supports future wallet/payment work without adopting a heavy SaaS dashboard architecture.


## D-035 Hybrid Identity Baseline Accepted
- Date: 2026-04-04
- Decision: replace the old email-whitelist login path with a filesystem-managed hybrid identity model supporting both email and wallet login.
- Why: wallet is needed now as identity binding and future commerce posture, not as immediate payment execution. Email and wallet therefore need to resolve to one runtime identity contract.
- Scope: identity markdown assets, server-side identity resolution, login API route, hybrid login page, and identity propagation into chat runtime.
- Consequence: Nexa now has customer-aware hybrid identity without introducing a heavy SaaS IAM or payment system.


## D-036 Customer Auth Verification Baseline Accepted
- Date: 2026-04-05
- Decision: add a lightweight verification layer above hybrid identity using email code challenge and wallet signature challenge.
- Why: customer-aware identity existed, but the entry path still resolved identities directly without proof. A minimal verification step is required before session issuance.
- Scope: challenge/verify API routes, auth runtime persistence, email code verification, wallet signature verification, login UI upgrade, and auth audit events.
- Consequence: Nexa now has a complete verified entry process without adopting heavy SaaS IAM or enabling payment execution.


## D-037 Identity-Aware Workspace Baseline Accepted
- Date: 2026-04-05
- Decision: surface active identity, customer scope, and verification posture directly in the workspace shell.
- Why: auth, customer, and operator boundaries were already enforced in runtime, but the product surface still hid who the current operator was and what customer context was active.
- Scope: identity context strip, recent auth event visibility, auth events API, and current customer workspace highlight.
- Consequence: Nexa now behaves more like a customer-aware workspace and less like a collection of disconnected capability pages.

## D-038 Customer Capability Presets Baseline Accepted
- Date: 2026-04-05
- Decision: add filesystem-managed customer workspace presets and expose them across chat, customer workspace, and session-kernel runtime.
- Why: customer identity, capability policy, and long-term memory were already in place, but the product still treated every customer workspace as visually and operationally identical.
- Scope: workspace markdown assets, runtime preset loader, customer workspace API, customer-specific chat quick queries and summary, and session-kernel preset hints.
- Consequence: Nexa now presents a distinct default posture per customer without introducing a heavy tenant dashboard or duplicating product shells.

## D-039 harness-cowork Narrow Adoption Accepted
- Date: 2026-04-05
- Decision: absorb `harness-cowork` only as a development-harness and release-discipline input, not as a replacement for Nexa runtime architecture.
- Why: Nexa already has runtime-side equivalents for verification, serialized mutation, session-kernel state, and learning-asset derivation. The remaining value lies in repository workflow discipline.
- Scope: classify deterministic hooks, task contracts, evaluator feedback ledger, and release-harness checks as next-stage platform-deepening work.
- Consequence: external harness lessons strengthen implementation quality without distorting Nexa product architecture.

## D-040 Deterministic Hooks Baseline Accepted
- Date: 2026-04-05
- Decision: add deterministic repository hooks for `pre-commit` and `pre-push`, with a stable default gate and an explicit stronger full-smoke path.
- Why: runtime verification and mutation safety already exist, but repository workflow still depended too much on manual discipline. A first mechanical gate is needed before adding richer contracts and evaluator ledgers.
- Scope: forbidden-file blocking, staged diff checks, lint on admin code in pre-commit, build gate in pre-push, optional full-smoke escalation, and local git hook installation.
- Consequence: Nexa now has a real repository-level harness baseline without making existing unrelated smoke regressions a permanent push blocker.
