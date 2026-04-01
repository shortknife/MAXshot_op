# Nexa FAQ / KB Routing Boundary V1 (2026-04-01)

- Status: Drafted / Accepted as planning boundary
- Purpose: prevent routing ambiguity between the current MVP capabilities and the future FAQ / KB Plane

## 1. Routing Problem

The platform now contains two different read-only knowledge surfaces:

1. platform/product documentation queries
2. customer FAQ / KB queries

It already contains a separate facts surface:
3. ops/data fact queries

Without explicit routing boundaries, new FAQ work would be absorbed incorrectly into existing capabilities.

---

## 2. Existing Read-Only Capability Surfaces

### A. `capability.data_fact_query`
Use for:
- execution facts
- yield / vault / allocation / rebalance facts
- ranking / trend / compare over canonical fact tables

Do not use for:
- customer FAQ
- KB retrieval over uploaded customer docs
- generic product explanation without fact lookup

### B. `capability.product_doc_qna`
Use for:
- platform/product design docs
- internal architecture/spec questions
- terminology / principle / document explanation

Do not use for:
- customer support FAQ
- customer-owned KB retrieval
- answer generation based on uploaded customer documents

### C. `capability.faq_answering`
Use for:
- customer-facing FAQ
- bounded KB retrieval
- answer generation grounded in customer KB material

Do not use for:
- ops/data fact queries
- internal architecture explanation
- open-ended content generation

---

## 3. Primary Routing Heuristic

## Route to `capability.data_fact_query` when the request is about:
- current or historical business facts
- APY / vault / execution / rebalance / allocation
- rankings, comparisons, trend windows, execution ids

Examples:
- `最近7天按链 APY 排名`
- `给我最近一笔 execution 详情`
- `为什么今天没调仓？`

## Route to `capability.product_doc_qna` when the request is about:
- platform documentation
- architecture definitions
- capability meanings
- internal product/process explanation

Examples:
- `Router 的职责是什么？`
- `Capability Contract v1 的边界是什么？`
- `FSD 里对 Working Mind 怎么定义？`

## Route to `capability.faq_answering` when the request is about:
- customer support or customer-facing product usage
- FAQ-like usage questions
- answers expected from a customer KB corpus
- support answers that need citations from KB material rather than from platform design docs

Examples:
- `How do I reset my subscription password?`
- `What does the Pro plan include?`
- `How can customers upload invoices?`

---

## 4. Boundary Signals

### Strong signals for FAQ / KB Plane
- mentions of customer help / support / FAQ
- user-facing usage instructions
- plan/pricing/support/feature usage wording
- references to uploaded help articles or KB pages
- expectation of customer-help style answer rather than internal architecture explanation

### Strong signals for Ops / Data Plane
- asks for actual metrics, live facts, trend windows, rankings, execution states
- asks for chain / protocol / vault / APY / rebalance semantics tied to real system data

### Strong signals for Product Doc QnA
- asks what the architecture says
- asks how the platform defines a concept
- asks about FSD / contract / step / design docs

---

## 5. Conflict Resolution Rule

If a request could plausibly match more than one read-only capability:

### Priority rule
1. live facts first if the request requires real business data
2. customer FAQ second if the request is a support/usage question grounded in KB material
3. product docs third if the request is asking about platform definition/specification

### Clarification rule
Ask for clarification only if the system cannot distinguish between:
- customer support knowledge
- internal platform documentation

Do not ask clarification if the request clearly needs live facts.

---

## 6. Thin-Slice Routing Rule

For the first FAQ vertical slice:
- only route into `capability.faq_answering` if a bounded KB source exists
- otherwise route to bounded fallback, not to `capability.product_doc_qna` as a silent substitute

Reason:
- silent fallback would blur the product boundary and hide whether the FAQ plane actually works

---

## 7. Non-Goals

This routing boundary does **not** define:
- detailed KB retrieval scoring
- billing/customer tenancy model
- UI/API ownership
- post-answer review workflow mechanics

It only defines which capability family should own which request class.

---

## 8. Final Judgment

The FAQ / KB Plane is now separated from:
- ops/data fact queries
- platform/product documentation queries

This boundary is required before any FAQ capability is added to the runtime registry.
