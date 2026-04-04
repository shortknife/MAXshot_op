# Nexa Customer Memory and Wallet Baseline

Date: 2026-04-04
Status: accepted
Owner: Codex

## Decision

Add a lightweight customer system baseline centered on:
- filesystem-managed customer long-term memory
- filesystem-managed wallet/payment contract profiles
- runtime customer-memory injection into working mind
- simple customer workspace presentation instead of a traditional dashboard

## Why

The platform already has:
- customer registry
- operator boundary
- customer capability exposure
- interaction learning assets

What it still lacked was a customer-specific layer that can express:
- long-term preference memory
- response style and guardrails
- future wallet/payment posture for agent commerce

A heavy SaaS tenant dashboard is unnecessary here. The correct model is a bounded customer-aware platform, not a general-purpose admin SaaS.

## Accepted Scope

### Filesystem customer assets
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/customer-assets/README.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/customer-assets/maxshot/memory.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/customer-assets/maxshot/wallet.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/customer-assets/nexa-demo/memory.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/customer-assets/nexa-demo/wallet.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/customer-assets/ops-observer/memory.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/customer-assets/ops-observer/wallet.md`

### Runtime loaders
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/customers/asset-runtime.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/customers/memory.ts`

### Working mind integration
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/router/memory-selection.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/router/router-main.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/capabilities/memory-refs.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/session-kernel.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/interaction-learning/extract.ts`

### Product surface
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/customers/page.tsx`
- Customer page now emphasizes:
  - long-term memory
  - runtime preference signals
  - capability boundary
  - wallet contract
- It intentionally avoids a heavy dashboard layout

## Validation

### Focused tests
- `lib/customers/__tests__/asset-runtime.test.ts`
- `lib/router/__tests__/memory-selection.test.ts`
- `lib/chat/__tests__/session-kernel.test.ts`
- Result: passed

### Build
- `npm run build`
- Result: passed

### Runtime check
- local env wrapper used: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/scripts/run-with-local-env.sh`
- Result for `maxshot`:
  - `memoryOrigin = customer_profile`
  - `customerId = maxshot`
  - `preferredPlanes = [ops_data, faq_kb]`
  - `topIssues = [review_required]`
  - `walletMode = manual_review`
  - `walletStatus = active`
  - `settlementAsset = USDC`
  - `actions = [invoice_settlement, agent_payment_preview]`

## Consequence

The platform now has a bounded customer-aware model that is compatible with future agent payment flows without turning Nexa into a heavy SaaS back office.

This baseline does not yet include:
- real wallet connectors
- onchain signing or settlement execution
- autonomous payment agents
- customer self-service onboarding
- full tenant IAM

## Freeze Judgment

Freeze now.

This baseline is sufficient for the current platform stage and establishes the right direction for long-term memory plus wallet-aware commercialization.
