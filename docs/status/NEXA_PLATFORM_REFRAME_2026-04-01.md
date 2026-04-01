# Nexa Platform Reframe (2026-04-01)

## 1. Decision

Current direction:
- **Nexa** = platform / architecture / product family name
- **MAXshot** = customer sample project / reference tenant / solution example

This reframing is adopted at the documentation and product-structure level first.

It is **not** a full physical rename of the repository yet.

---

## 2. Why

The current workspace has already evolved beyond a single customer project.

It now contains:
- bounded runtime / harness
- data and operations plane
- audit and execution model
- chat and capability runtime
- thin memory layer
- imported FAQ platform assets from the Nexa FAQ project

Keeping `MAXshot` as the platform-level name creates ambiguity:
- platform vs customer solution are mixed
- future multi-tenant or multi-solution structure becomes harder to explain
- imported FAQ assets already use `Nexa` as the product/platform identity

---

## 3. New conceptual model

### Nexa Platform
- runtime / harness
- router
- capability execution
- audit / trace
- memory thin layer
- product planes

### Nexa Ops / Data Plane
- execution facts
- market facts
- allocation facts
- rebalance decisions
- business query capabilities

### Nexa FAQ / KB Plane
- knowledge-base upload and qc
- faq answering
- faq fallback
- faq qa review
- customer-facing knowledge query surface

### Customer Solutions
- MAXshot
- future client projects

---

## 4. What changes now

### Immediate changes
- platform thinking switches from `MAXshot platform` to `Nexa platform`
- MAXshot is treated as a customer sample / tenant concept
- future module planning should use platform-level naming
- imported Nexa FAQ documents become part of active platform reference material

### Deferred changes
- repository rename
- full package/folder rename
- environment variable rename
- domain / deployment rename
- UI copy rewrite across the whole product

These are deferred to a dedicated rename phase.

---

## 5. Constraints

This reframe does **not** imply:
- immediate codebase-wide string replacement
- immediate schema rename
- immediate path migration

The goal is to separate platform identity from customer identity first, without destabilizing the current repository.

---

## 6. Practical use from now on

Recommended wording:
- `Nexa platform`
- `MAXshot sample solution`
- `MAXshot as a customer reference deployment`

Avoid using:
- `MAXshot platform`
when referring to platform-level runtime or product architecture.

---

## 7. Follow-up work

1. Define the FAQ / KB Plane as a first-class module family.
2. Map current capabilities into `Nexa Core`, `Nexa Ops/Data Plane`, `Nexa FAQ/KB Plane`.
3. When the product structure is stable, schedule a dedicated rename migration phase.

---

## 8. Current status

This decision is active as a documentation and architecture framing rule.

Code-level rename is not yet active.
