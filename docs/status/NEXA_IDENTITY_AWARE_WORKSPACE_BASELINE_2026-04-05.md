# Nexa Identity-Aware Workspace Baseline

## Decision
Tighten the product surface so active identity, customer scope, and verification posture are visible inside the workspace rather than hidden in runtime only.

## Scope
- Add a reusable identity context strip to workspace navigation
- Show current identity, customer, operator, auth method, verification method, linked methods, and latest auth event
- Add current customer workspace highlight in `/customers`
- Add lightweight auth events API for client-side workspace surfaces

## Runtime shape
- `GET /api/auth/events?identity_id=...`
- `AppNav` now carries identity-aware workspace context across runtime pages

## Consequence
Nexa product surfaces now present an explicit active workspace identity instead of treating auth and customer context as hidden implementation detail.
