# Parent Project Retention And Delete Guide (2026-04-01)

## 1. Purpose

This file defines what is still worth keeping from `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot` after the current mining pass.

The goal is simple:
- preserve product knowledge
- preserve reusable templates
- preserve test corpus and simulation assets
- avoid carrying the whole old workspace forward

---

## 2. Assets already preserved inside current workspace

The following categories are already copied into `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)`:

### Product knowledge
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/reference/parent-project-mined-2026-04-01/product-knowledge/Integration_Specification_v4.1.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/reference/parent-project-mined-2026-04-01/product-knowledge/Technical_Architecture_Intent_Analyzer_v1.0.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/reference/parent-project-mined-2026-04-01/product-knowledge/开票与工票执行跟踪规范_2026-02.md`

### Team memory governance
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/reference/parent-project-mined-2026-04-01/team-memory/team-memory-readme.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/reference/parent-project-mined-2026-04-01/team-memory/记忆存储机制说明_四层架构_2026-03.md`

### Templates
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/templates/parent-project/Capability_Schema_Template.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/templates/parent-project/Context_Rebuild_Guide_Template.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/templates/parent-project/Prompt_Design_Document_Template.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/templates/parent-project/Status_Template.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/templates/parent-project/TODO_Template.md`

### Test assets
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/reference/parent-project-mined-2026-04-01/test-assets/business-query-e2e_v1.0_skill_none_v1.0_source_qa-agent.spec.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/reference/parent-project-mined-2026-04-01/test-assets/simulate_router_18_v2_three_capabilities.js`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/reference/parent-project-mined-2026-04-01/test-assets/router_18_v2_three_capabilities_local_results.json`

### Active code absorption
- Memory contract abstraction
- WorkingMind shape tightening
- query regression corpus
- harness state-model extraction

---

## 3. Recommended directories to retain in the old project

If the old parent project is kept at all, keep only these directories as reference-grade archives:

1. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/LEO_Decision_Layer/2.Knowledge`
2. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/00.System/Team_Memory`
3. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/02.Templates`
4. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/admin-os/e2e`
5. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/Lily_QASpecialist/scripts`

These five directories are the only ones that still have ongoing product/reference value.

---

## 4. Directories that can be archived or deleted first

These categories are the lowest-value carryover:
- role workspaces used mostly for process tracking
- historical collaboration notes
- archived implementation batches
- old UI/page code not reused by current product
- legacy environment-specific implementation traces

In practice, this means most of the following can be archived or removed before the retained five directories are touched:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/Alex-CoreEngineer`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/LEE_MemoryManager`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/Lily_QASpecialist` except `scripts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/Sam_AIDeveloper`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/Mia_SocialMediaManager`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/admin-os` except `e2e`, and only if you are certain no further file-level mining is needed

---

## 5. Practical deletion sequence

Recommended order:
1. keep the old project untouched until this guide is committed
2. if desired, archive the whole old project externally once
3. retain only the five directories listed above
4. remove the rest of the old workspace
5. use the copies inside `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)` as the new reference source

---

## 6. Final judgment

The old parent project no longer needs to remain as a full working tree.

After this mining pass, it is safe to treat it as:
- partial archive source, if you want belt-and-suspenders retention
- or a shrink-to-five-reference-directories project

For current product work, the authoritative reusable assets now live in the current workspace.
