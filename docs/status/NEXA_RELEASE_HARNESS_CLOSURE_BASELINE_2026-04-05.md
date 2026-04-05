# Nexa Release Harness Closure Baseline

Date: 2026-04-05
Status: accepted
Scope: development harness / repository workflow

## Goal
Add filesystem-managed release closure checks so repository-level freeze and preflight work are driven by explicit deterministic checklist artifacts.

## What Was Added

### Release checklist assets
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/dev-harness/release-checks/README.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/dev-harness/release-checks/_template.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/dev-harness/release-checks/2026-04-05-release-harness-closure-checks-baseline.md`

### Release checklist runtime and validation
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/dev-harness/release-checks.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/scripts/validate-release-checks.mjs`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/dev-harness/__tests__/release-checks.test.ts`

### Script integration
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/scripts/dev-harness-hook.mjs`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/scripts/release-preflight.mjs`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/package.json`

## Baseline Behavior
1. release closure checks live in `docs/dev-harness/release-checks/`
2. each checklist references task contracts and evaluator feedback slugs
3. the validator rejects:
   - missing required frontmatter
   - missing required sections
   - invalid status values
   - unknown `contract_slug`
   - unknown `feedback_slug`
   - duplicate checklist slugs
4. `pre-commit` validates release checks whenever staged changes touch that directory
5. `npm run release:preflight` now starts by validating the release checklist set

## Why This Shape Is Correct
Release closure is a repository discipline concern, not a product runtime concern.

So it should be:
- markdown-first
- tied to contracts and evaluator feedback
- deterministic to validate
- integrated into preflight, not left to operator memory

## Validation
- `npm run release:checklist:validate`: passed
- `vitest run lib/dev-harness/__tests__/release-checks.test.ts`: passed
- `npm run hooks:pre-commit`: passed with staged release checklist changes
- `npm run build`: passed

## Current Limitation
This baseline intentionally does not add:
- automatic release approval workflow
- multi-environment promotion logic
- CI-hosted release orchestration
- mandatory full-smoke on every push

## Freeze Judgment
Freeze now.

This is the correct fourth development-harness baseline after hooks, task contracts, and evaluator feedback.
