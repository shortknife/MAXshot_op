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
