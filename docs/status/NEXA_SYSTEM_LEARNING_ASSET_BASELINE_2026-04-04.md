# Nexa System Learning Asset Baseline

Date: 2026-04-04
Status: accepted
Owner: Codex

## Decision

Add a first-class system learning asset layer derived from runtime interaction logs, instead of treating `interaction_learning_log_op` as a raw audit table only.

## Why

The platform already has:
- interaction learning log
- stronger memory baseline
- prompt runtime and prompt policy baselines
- customer-bound runtime signals

What it still lacked was a reusable derivation layer that turns those logs into operational learning assets for:
- hard-case review
- capability/template improvement
- early customer preference profiling
- prompt policy issue tracking

## Accepted Scope

### Runtime derivation
- New derivation runtime in `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/interaction-learning/derivation.ts`
- `deriveLearningAssets()` produces:
  - `hard_cases`
  - `capability_candidates`
  - `customer_profiles`
  - `prompt_policy_issues`
  - `totals`
- Source is runtime-first through `interaction_learning_log_op`

### Product surface
- New page: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/learning-assets/page.tsx`
- New UI surface: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/components/learning-assets/learning-assets-surface.tsx`
- Main nav entry added via `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/components/app-nav.tsx`

### Export path
- New markdown export route:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/learning-assets/export/route.ts`
- Export format is markdown, consistent with current filesystem-first documentation direction

## Validation

### Focused tests
- `lib/interaction-learning/__tests__/derivation.test.ts`
- `lib/interaction-learning/__tests__/learning-page.test.ts`
- `lib/interaction-learning/__tests__/extract.test.ts`
- `lib/interaction-learning/__tests__/runtime.test.ts`
- Result: `7 / 7 passed`

### Build
- `npm run build`
- Result: passed

### Runtime check
- local env wrapper used: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/scripts/run-with-local-env.sh`
- Result:
  - `source = supabase`
  - `interactions = 8`
  - `hardCases = 2`
  - `capabilityCandidates = 3`
  - `customers = 2`
  - `promptPolicyIssues = 1`
  - `topCustomer = maxshot`
  - `topCapability = product_doc_qna`

## Consequence

The platform now has a concrete bridge from runtime history to reusable learning assets without introducing a separate ML pipeline or another database schema.

This is still a bounded baseline. It does not yet include:
- automatic prompt patch generation
- autonomous capability evolution
- customer-specific long-term preference memory
- scheduled learning jobs
- human approval workflow for derived assets

## Freeze Judgment

Freeze now.

This baseline is sufficient to support the next stage of platform work and is materially stronger than keeping interaction logs as raw records only.
