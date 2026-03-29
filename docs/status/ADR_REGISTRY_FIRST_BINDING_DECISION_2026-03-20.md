# ADR: Registry-First Capability Binding Decision

- Date: 2026-03-20
- Scope: `admin-os`
- Status: Accepted for current MVP

## Decision

Current MVP keeps the following runtime contract:

1. Intent Analyzer receives the active capability registry context.
2. Intent Analyzer may output:
   - `matched_capability_ids`
   - `matched_capability_id`
   - `slots`
   - `in_scope / need_clarification`
3. Router remains deterministic and validates:
   - capability ids
   - slot completeness
   - execution / gate / audit rules
4. Canonical intent remains a compatibility and audit field only.

In short:

- **Analyzer is allowed to propose capability binding**
- **Router is still the deterministic execution authority**

## Why This Decision Was Taken

For the current product stage, this is the most pragmatic balance between:

- product iteration speed
- test stability
- registry-first behavior
- backward compatibility with existing audit and response contracts

The stricter alternative would be:

- analyzer outputs semantic result only
- router computes capability binding entirely by itself

That is architecturally cleaner, but it is a larger refactor and not required to keep the current MVP stable.

## What Is Already True

- Runtime capability truth source is now the local capability registry.
- Chat entry path is capability-first.
- Business / content / qna dispatch no longer rely primarily on canonical intent.
- Router and task decomposition prefer matched capability ids before legacy canonical fallback.
- `intent_type_canonical` is no longer the main routing truth.

## Known Tradeoff

This means current implementation is:

- **registry-first**
- **capability-first**
- but **not yet "router-only capability binding"**

So the remaining architecture gap is explicit, not accidental.

## Deferred Alternative

If later we want strict FSD-style authority separation, the next architecture step is:

1. Analyzer outputs semantic extraction only
2. Router reads registry and computes final capability binding
3. Analyzer-produced capability ids become optional hints or are removed

This is deferred, not rejected.

## Current Rule For Future Work

Until a new ADR replaces this one:

- New features should continue using `matched_capability_ids` as first-class runtime input.
- Router must remain deterministic and validate all analyzer output.
- Canonical intent must not be reintroduced as the primary routing source.
- Any new fallback based on canonical intent must be marked as compatibility-only.

## Known Gaps That Stay Documented

- Full FSD-grade memory runtime is not complete.
- Some capabilities still access business data through existing internal adapters instead of a stricter Router-only handoff model.
- UI is still MVP-form, not final product interaction form.
