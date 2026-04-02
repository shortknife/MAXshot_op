# Platform Asset Absorption Status (2026-04-02)

## Scope

This document summarizes the current absorption status of external project assets into the current MVP workspace.

Assessment buckets:
1. Already absorbed into the active product/runtime
2. Kept as reference-only assets
3. Must-do next-stage work
4. Explicitly not in scope

---

## 1. Already Absorbed

### 1.1 Platform framing

Accepted and frozen:
- `Nexa = platform`
- `MAXshot = customer sample solution`

Primary document:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/NEXA_PLATFORM_REFRAME_2026-04-01.md`

### 1.2 Core MVP harness

Absorbed as active runtime, not reference-only:
- Entry / Session / Intent / Gate / Sealer / Router / Capability / Audit / Delivery
- canonical facts ingestion
- business data query mainline

Primary documents:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/MVP_ONE_PAGER_2026-04-01.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/MVP_MODULE_IMPLEMENTATION_MAP_2026-04-01.md`

### 1.3 Parent project assets with direct MVP value

Absorbed into current workspace or current implementation:
- memory contract shape
- harness state model
- query corpus / regression phrasing assets
- selected templates and team-memory governance references

Primary documents:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/MAXSHOT_PARENT_PROJECT_ASSET_ASSESSMENT_2026-04-01.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/PARENT_PROJECT_HARNESS_STATE_MODEL_2026-04-01.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/parent-project-mined-2026-04-01/PARENT_PROJECT_MINED_ASSETS_SUMMARY_2026-04-01.md`

### 1.4 Nexa FAQ / KB Plane

Absorbed as active product plane with runtime wiring and product surface.

Runtime capabilities now in-system:
- `capability.faq_answering`
- `capability.faq_fallback`
- `capability.faq_qa_review`
- `capability.kb_upload_qc`

Product surfaces now in-system:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/chat/page.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/faq-review/page.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/kb-management/page.tsx`

Runtime tables now wired:
- `faq_review_queue_op`
- `faq_kb_qc_snapshot_op`

Bounded review workflow now wired:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/faq-review/action/route.ts`

Primary documents:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/AI_FAQ_BOT_NEXA_ASSET_ASSESSMENT_2026-04-01.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/NEXA_FAQ_KB_PLANE_STAGE1_ACCEPTANCE_2026-04-01.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/NEXA_FAQ_KB_PLANE_STAGE2_RUNTIME_ACCEPTANCE_2026-04-02.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/NEXA_FAQ_KB_PLANE_PRODUCT_SURFACE_SUMMARY_2026-04-02.md`

### 1.5 Claude Code / CC_MAXshot extracted value

Absorbed where directly useful:
- relative time parsing improvements
- adoption judgment and architecture notes
- bounded roadmap inputs for runtime evolution

Primary documents:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/CLAUDE_CODE_ARCHITECTURE_ANALYSIS_2026-04-01.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/CLAUDE_CODE_HARNESS_RUNTIME_DEEP_DIVE_2026-04-01.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/CLAUDE_CODE_ADOPTION_ASSESSMENT_2026-04-01.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/cc_maxshot_mined_2026-03-31/notes/CC_MAXshot_Asset_Mining_Summary_2026-03-31.md`

---

## 2. Kept As Reference

These assets are intentionally retained as reference material, not active code obligations.

### 2.1 CC_MAXshot mined assets

Reference-only directories:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/cc_maxshot_mined_2026-03-31/time-sql`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/cc_maxshot_mined_2026-03-31/test-corpus`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/cc_maxshot_mined_2026-03-31/database-history`

Reason:
- useful for design input, regression corpus, and schema history
- not suitable as direct implementation baseline

### 2.2 Claude Code research set

Reference-only research chain:
- overall architecture analysis
- runtime deep dive
- adoption assessment
- concept mapping to current platform

Reason:
- valuable as platform evolution input
- not a current MVP code migration target

### 2.3 Parent-project product knowledge and templates

Reference-first assets:
- product knowledge
- team memory governance notes
- templates
- test assets

Reason:
- governance and planning value remains high
- only selected parts should become runtime code

---

## 3. Must-Do Next Stage

These are the real gaps after asset absorption. They are not missing imports; they are next-stage product/runtime work.

### 3.1 Interaction learning log

Still missing:
- structured per-turn interaction log
- query / intent / capability / template / result learning corpus
- extraction path from runtime interactions to reusable system assets

Why it matters:
- this is the base for intent hard cases, template evolution, and follow-up quality improvement

### 3.2 Memory beyond thin layer

Current state:
- thin memory is present and usable

Still missing:
- stronger long-term memory design
- user preference memory
- working-mind synthesis
- memory-driven learning loop

### 3.3 KB mutation workflow

Current state:
- read-only FAQ / KB Plane is working
- review queue actions are working
- QC snapshot runtime is working

Still missing:
- true KB upload mutation workflow
- persistent KB inventory lifecycle
- post-review knowledge update flow
- operator workflow for accepting/rejecting KB content changes

### 3.4 Customer / tenant model

Current state:
- platform framing is defined
- `MAXshot` is treated as sample solution semantically

Still missing:
- formal tenant/customer model
- customer-bound access control
- per-solution capability exposure
- customer-specific KB ownership boundary

### 3.5 Runtime evolution items already identified

Still not implemented:
- unified session kernel
- formal verification stage
- concurrency-safety metadata
- cost accounting as first-class runtime infra

These are explicitly Post-MVP platform evolution tasks, not missing MVP acceptance items.

---

## 4. Explicitly Not In Scope

### 4.1 Whole-project codebase merging

Not in scope:
- merging full parent project codebase
- merging full `AI_FAQ_BOT` codebase
- merging full `CC_MAXshot` codebase

Reason:
- would re-introduce parallel architectures and unstable implementation patterns

### 4.2 Full legacy product/UI recreation

Not in scope:
- recreating old full Nexa front-end
- rebuilding historical role-based workspaces
- preserving old implementation paths one-to-one

Reason:
- current strategy is platform absorption into current runtime and product surface, not historical UI restoration

### 4.3 Immediate full-platform rename at code/path level

Not in scope now:
- repository rename
- global path rename
- environment/schema-wide rename sweep

Reason:
- high migration risk with limited short-term product value

### 4.4 Full complex strategy execution

Not in scope for current MVP:
- advanced autonomous strategy execution
- unrestricted multi-agent coordination
- broad mutation autonomy beyond bounded gates

Reason:
- current MVP remains a bounded system with controlled read/write surfaces

---

## Final Judgment

For current MVP purposes:
- external high-value assets have been substantially absorbed
- the remaining gaps are no longer “asset import” problems
- the remaining gaps are platform/product evolution tasks

Therefore the correct next-step framing is:
1. stop broad asset mining
2. keep reference archives as design input only
3. move roadmap focus to next-stage platform work

## Recommended Next Priority Order

1. interaction learning log
2. KB mutation workflow
3. customer / tenant model
4. stronger memory layer
5. runtime evolution items from Claude Code research
