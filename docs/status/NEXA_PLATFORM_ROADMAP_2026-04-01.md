# Nexa Platform Roadmap (2026-04-01)

## 1. Purpose

This document converts the recent asset absorption work into an execution order.

Scope:
- freeze platform framing
- define next-stage product planning order
- separate documentation reframing from code implementation

This document does **not** start a full repository rename.

---

## 2. Current Platform Baseline

### 2.1 What is already stable

The current workspace already has a usable bounded MVP mainline:
- harness runtime
- deterministic router
- capability execution
- audit / trace
- canonical fact ingestion
- data / ops query plane
- thin memory layer
- TG / web question entry

### 2.2 What has now been absorbed as reference assets

#### Parent project assets
Absorbed for platform strengthening:
- memory contract patterns
- harness / intent state definitions
- query corpus and test assets
- templates and team-memory governance materials

#### Nexa FAQ assets
Absorbed for platform expansion:
- FAQ / KB product requirements
- FAQ engine functional design
- FAQ-specific capability definitions
- platform naming reference (`Nexa`)

### 2.3 New framing rule

From now on:
- `Nexa` = platform / architecture / product family
- `MAXshot` = customer sample solution / reference tenant

This rule is active at the documentation and planning level.
It is not yet a physical repository rename.

---

## 3. Planning Principle

Do **not** combine these three activities into one execution stream:
1. platform identity reframing
2. external asset absorption
3. large-scale feature implementation

Correct order:
1. finish platform governance and structure freeze
2. define next-stage roadmap on top of the frozen structure
3. implement one thin vertical slice at a time
4. add repository-level harness discipline only where runtime maturity justifies it

Reason:
- avoids naming drift during implementation
- avoids overloading existing capabilities with new product responsibilities
- keeps the current MVP mainline stable while the platform expands

---

## 4. Platform Layer Model

### Layer A. Nexa Core
Owns:
- entry normalization
- session harness
- intent harness
- gate / sealer / router
- capability execution runtime
- audit / trace
- thin memory

Status:
- mostly stable
- current MVP spine

### Layer B. Nexa Ops / Data Plane
Owns:
- canonical ingestion
- fact tables
- business data query
- execution / yield / allocation / rebalance explanation

Status:
- mainline complete for MVP

### Layer C. Nexa FAQ / KB Plane
Owns:
- KB upload and QC
- FAQ retrieval and answer generation
- FAQ fallback
- FAQ QA review
- customer-facing FAQ query surface

Status:
- product-defined
- not yet implemented as first-class runtime capability family

### Layer D. Customer Solutions
Owns:
- MAXshot sample solution
- future customer solution packs / tenants

Status:
- conceptually defined
- not yet formalized in runtime isolation terms

### Layer E. Development Harness / Release Discipline
Owns:
- deterministic repository hooks
- task contracts for multi-step implementation work
- evaluator feedback ledger
- release / freeze verification harness

Status:
- partially represented in runtime equivalents
- not yet formalized in repository workflow

---

## 5. Roadmap Decision

### Decision A. Platform reframing comes before broad feature build-out

Accepted.

Interpretation:
- platform structure must be clear before adding FAQ code paths
- current runtime should not be renamed or split prematurely
- MAXshot-specific logic should gradually be treated as one solution under Nexa

### Decision B. FAQ / KB Plane should be added as a new product plane, not by overloading existing capabilities

Accepted.

Interpretation:
- do not force customer FAQ into `capability.product_doc_qna`
- do not force customer KB retrieval into `capability.data_fact_query`
- define separate FAQ capability family

### Decision C. Full physical rename is deferred

Accepted.

Interpretation:
- no immediate repository rename
- no global string replacement pass
- no env/schema/path migration yet

A rename should happen only after the FAQ plane contracts and initial implementation are stable.

### Decision D. Development harness lessons should be absorbed narrowly

Accepted.

Interpretation:
- absorb deterministic hooks / contracts / evaluator closure patterns
- do not import an external agent shell as Nexa runtime
- development harness belongs to repository workflow, not customer-facing product runtime

---

## 6. Recommended Phase Order

## Phase 0. Platform Governance Freeze

Goal:
- freeze the conceptual platform model

Deliverables:
- `Nexa` platform framing
- FAQ / KB Plane module map
- parent-project and Nexa asset references stored in current workspace
- roadmap and sequencing decision

Status:
- complete

Exit criteria:
- all future planning can reference Nexa platform terminology without ambiguity

---

## Phase 1. FAQ / KB Plane Contract Definition

Goal:
- define the new capability family without altering the current MVP runtime behavior

Required outputs:
1. capability entries for:
   - `capability.kb_upload_qc`
   - `capability.faq_answering`
   - `capability.faq_fallback`
   - `capability.faq_qa_review`
2. contract definitions for:
   - KB ingest request/result
   - FAQ answer request/result
   - FAQ fallback result
   - FAQ QA review task
3. routing boundary rules:
   - ops/data query vs product-doc qna vs customer FAQ

Recommended scope rule:
- design and registry first
- implementation second

Status:
- next

---

## Phase 2. Thin FAQ Vertical Slice

Goal:
- prove the FAQ plane with the smallest possible real runtime path

Recommended slice:
- implement `capability.faq_answering` only
- read-only query path
- no billing
- no customer management model
- no full KB lifecycle yet

Required behavior:
- accept FAQ query input
- retrieve from a bounded KB source
- return structured answer with source references / confidence marker
- route out-of-scope and low-confidence cases to a bounded fallback output

Why this slice first:
- validates the plane with minimal risk
- prevents architecture drift before full KB workflows exist

---

## Phase 3. KB Upload / QC Support Path

Goal:
- make FAQ data ingestion manageable

Scope:
- implement `capability.kb_upload_qc`
- define file/doc ingest path
- add QC result model
- support approval / rejected / needs-review states

Not required yet:
- full customer admin suite
- advanced chunk optimization UI
- enterprise-scale tenancy design

---

## Phase 4. FAQ Fallback and QA Review

Goal:
- make the FAQ plane operationally safe

Scope:
- implement `capability.faq_fallback`
- implement `capability.faq_qa_review`
- define manual review queue / escalation payload shape
- close the loop for low-confidence and blocked answers

This phase should happen only after FAQ answering and KB ingest are real.

---

## Phase 5. Solution-Layer Formalization

Goal:
- represent customer solutions as first-class platform concepts

Scope:
- formalize `MAXshot` as a sample solution
- define how platform-level capabilities are configured per solution
- identify which assets are global vs tenant-specific

This is the correct place to decide whether repository/package renaming should proceed.

---

## 7. What Not To Do Next

Do not do these as the immediate next step:
1. full repository rename to `Nexa`
2. global code string replacement from `MAXshot` to `Nexa`
3. merge the old FAQ project as a second runtime
4. build full KB upload UI before FAQ read-only slice exists
5. overload `capability.product_doc_qna` or `capability.data_fact_query` with FAQ responsibilities
6. start multi-tenant abstraction before the FAQ plane proves a real vertical slice

---

## 8. Immediate Next-Step Recommendation

The next implementation-planning target should be:

### `Phase 1: FAQ / KB Plane Contract Definition`

Recommended concrete outputs:
1. FAQ capability registry proposal
2. FAQ request/response schemas
3. routing decision matrix
4. thin-slice acceptance criteria for `capability.faq_answering`

This keeps momentum while preserving the current stable MVP mainline.

---

## 9. Final Judgment

The platform should **not** jump directly into broad integrated product expansion.

Correct strategic order:
1. finish platform governance freeze
2. define FAQ / KB Plane contracts
3. implement one thin FAQ vertical slice
4. expand supporting workflows later
5. postpone full rename and tenant formalization until the new plane is proven

That is the lowest-risk path that preserves the current delivered MVP while allowing Nexa to evolve from a customer-shaped system into a true platform.

---

## 10. Current Addendum (2026-04-05)

Since this roadmap was first written, Nexa has already implemented:
- FAQ / KB plane runtime and product surfaces
- customer-aware runtime and workspace baselines
- verification stage baseline
- write-lane baseline
- session-kernel baseline
- learning-asset derivation baseline

The next roadmap gap is therefore no longer FAQ-plane existence.
It is now:
1. stronger customer-aware routing priority
2. repository-level development harness and release discipline
3. closure-quality and release-safety tooling

This is the correct place to absorb targeted lessons from external development harness projects.
