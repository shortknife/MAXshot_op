# Nexa v5.3 FSD Upgrade Map (2026-04-02)

## Purpose

This document maps the v5.3 delta design into the existing FSD reference set.

Reference baseline:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/FSD/`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/NEXA_V5_3_DELTA_DESIGN_2026-04-02.md`

The goal is not to rewrite the entire FSD immediately.
The goal is to identify which chapters need a v5.3 supplement or replacement first.

---

## 1. Highest-Priority Chapters To Upgrade

### A. One-Pager / Read First

Current references:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/FSD/00_Read_First/00.1_One-Pager_System_Intent.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/FSD/00_Read_First/00.6_Product_Experience_Map.md`

Upgrade required:
- replace single-system framing with `Nexa platform` framing
- explicitly distinguish `Nexa` from `MAXshot`
- introduce product planes in the first-read section

Priority: `P0`

### B. Layer Model

Current references:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/FSD/02_Layer_Model/02.1_Layer_Overview.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/FSD/02_Layer_Model/02.2_Layer_Responsibility_Matrix.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/FSD/02_Layer_Model/02.5_Capability_Definition_And_Registry.md`

Upgrade required:
- extend from layer-only model to `layer + plane` model
- define ownership of `Nexa Core`, `Ops / Data Plane`, `FAQ / KB Plane`, `Customer Solution Layer`
- map capability families by plane instead of only by generic layer role

Priority: `P0`

### C. Execution Model

Current references:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/FSD/03_Execution_Model/03.2_Execution_Lifecycle.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/FSD/03_Execution_Model/03.4_Replay_And_Audit_Flow.md`

Upgrade required:
- add `Verify` as a first-class execution stage
- distinguish review capabilities from mutation capabilities
- add bounded mutation lifecycle and status-transition model

Priority: `P0`

### D. Working Mind

Current references:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/FSD/04_Working_Mind/04.1_Working_Mind_Overview.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/FSD/04_Working_Mind/04.2_Memory_Types_And_Roles.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/FSD/04_Working_Mind/04.5_Evolution_Engine_And_Insight_Formation.md`

Upgrade required:
- formalize three-layer memory model
- separate session context from system learning memory
- define customer long-term memory as future structured layer
- connect learning loop to structured interaction logs

Priority: `P0`

---

## 2. Medium-Priority Chapters To Upgrade

### E. Intelligence Boundary

Current references:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/FSD/05_Intelligence_Boundary/05.1_Allowed_Intelligence.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/FSD/05_Intelligence_Boundary/05.4_Require_Confirmation_Flow.md`

Upgrade required:
- update bounded mutation model
- define mutation metadata expectations
- clarify review vs confirm vs verify

Priority: `P1`

### F. System Integration

Current references:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/FSD/08_System_Integration/08.2_Router_Responsibilities_v1.0.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/FSD/08_System_Integration/08.4_End_to_End_Request_Flow_v1.0.md`

Upgrade required:
- integrate FAQ / KB Plane into top-level system model
- describe customer-solution boundary and future tenant model
- describe runtime-backed review queue and KB QC surfaces

Priority: `P1`

### G. Observability

Current references:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/FSD/09_Observability/09.1_Log_Types_And_Schemas_v1.0.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/FSD/09_Observability/09.4_Production_Failure_Playbook_v1.0.md`

Upgrade required:
- add verification metrics
- add FAQ / KB queue metrics
- add interaction-learning and cost-accounting metrics
- add mutation-safety observability rules

Priority: `P1`

---

## 3. Lower-Priority Chapters To Revisit Later

### H. User Journey

Current references:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/FSD/01_User_Journey/`

Why later:
- user journey should be updated after customer/tenant model and KB mutation workflows are more concrete

Priority: `P2`

### I. Intent Analyzer

Current references:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/FSD/06_Intent_Analyzer/`

Why later:
- current intent harness is already accepted for MVP
- next change should follow interaction-learning and verification upgrades, not precede them

Priority: `P2`

### J. Skills Compatibility

Current references:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/FSD/07_Skills_Compatibility/`

Why later:
- useful only after runtime evolution work becomes concrete

Priority: `P3`

---

## 4. Suggested Documentation Order

Recommended authoring order:
1. one-pager / platform framing supplement
2. layer + plane model supplement
3. execution model supplement
4. working mind / learning supplement
5. system integration supplement
6. observability supplement

This order matches the actual product risk:
- identity first
- ownership second
- execution model third
- memory/learning fourth
- integration and observability after structure is stable

---

## 5. Recommended Deliverable Shape

For v5.3, prefer supplements rather than destructive rewrites.

Recommended pattern:
- keep old FSD as v5.0/v5.2 reference
- add v5.3 delta documents in `docs/status/`
- only after implementation stabilizes, fold deltas back into a refreshed full FSD set

This avoids rewriting the documentation faster than the product can absorb it.

---

## 6. Final Judgment

The next product-design upgrade should focus on four primary FSD areas:
1. one-pager / platform framing
2. layer model -> plane-aware model
3. execution lifecycle -> verification-aware lifecycle
4. working mind -> three-layer memory model

These four upgrades are enough to move the product design from:
- bounded MVP system design

to:
- bounded Nexa platform design
