# Nexa Filesystem Task Contracts Baseline

Date: 2026-04-05
Status: accepted
Scope: development harness / repository workflow

## Goal
Add filesystem-managed task contracts so multi-step implementation work has explicit written scope, acceptance, and freeze evidence.

## What Was Added

### Contract assets
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/dev-harness/contracts/README.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/dev-harness/contracts/_template.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/dev-harness/contracts/2026-04-05-filesystem-task-contracts-baseline.md`

### Contract runtime and validation
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/dev-harness/task-contracts.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/scripts/validate-task-contracts.mjs`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/dev-harness/__tests__/task-contracts.test.ts`

### Hook integration
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/scripts/dev-harness-hook.mjs`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/package.json`

## Baseline Behavior
1. task contracts live in `docs/dev-harness/contracts/`
2. contracts are markdown with deterministic frontmatter
3. the validator loads all contract files and rejects:
   - missing required frontmatter
   - missing required sections
   - invalid status values
   - duplicate slugs
4. `pre-commit` validates task contracts whenever staged changes touch that directory

## Why This Shape Is Correct
Task contracts are repository assets, not customer-facing runtime data.

So they should be:
- markdown-first
- git-reviewable
- diffable
- deterministic to validate

This keeps implementation state externalized without polluting Nexa product runtime.

## Validation
- `npm run contracts:validate`: passed
- `vitest run lib/dev-harness/__tests__/task-contracts.test.ts`: passed
- `npm run hooks:pre-commit`: passed with staged task-contract changes
- `npm run build`: passed

## Current Limitation
This baseline intentionally does not add:
- evaluator feedback ledger
- release closure checklist
- automatic contract generation
- customer-facing UI for development harness assets

## Freeze Judgment
Freeze now.

This is the correct second development-harness baseline after deterministic hooks.
