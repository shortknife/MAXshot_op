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

