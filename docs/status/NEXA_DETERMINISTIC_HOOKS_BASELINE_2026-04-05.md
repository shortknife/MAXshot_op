# Nexa Deterministic Hooks Baseline

Date: 2026-04-05
Status: accepted
Scope: repository workflow only

## Goal
Add the first deterministic repository hooks baseline so basic release discipline is enforced mechanically instead of relying on operator memory.

## What Was Added

### Hook runtime
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/scripts/dev-harness-hook.mjs`

### Hook installation
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/scripts/install-git-hooks.sh`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/.githooks/pre-commit`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/.githooks/pre-push`

### Package entrypoints
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/package.json`
  - `hooks:install`
  - `hooks:pre-commit`
  - `hooks:pre-push`

## Baseline Behavior

### pre-commit
1. reads staged files
2. blocks forbidden files:
   - `.env`
   - `.env.local`
   - nested `.env.*`
   - `.DS_Store`
3. runs `git diff --cached --check`
4. if staged admin code exists, runs:
   - `npm run lint -- --quiet`
5. skips admin checks for docs-only staged changes

### pre-push
1. checks recent commit scope
2. skips admin checks for docs-only head commits
3. clears `.next`
4. runs:
   - `npm run build`
5. optional stronger path:
   - `FORCE_HOOK_FULL_CHECK=true npm run hooks:pre-push`
   - this additionally runs `test:all:with-dev`

## Why Build-Only Is The Default Push Gate
The repository currently has existing `phase-all` smoke failures unrelated to the hook implementation itself.

So the stable baseline is:
- default push gate = deterministic build gate
- full smoke = explicit stronger release/closure command

This prevents the hook system from becoming a permanent false blocker while still preserving a stricter path for release-quality checks.

## Validation
- `./scripts/install-git-hooks.sh`: passed
- `npm run hooks:pre-commit`: passed
- `npm run build`: passed through hook path
- `FORCE_HOOK_FULL_CHECK=true npm run hooks:pre-push`: build passed, then surfaced existing `phase-all` regressions

## Current Limitation
The following are intentionally deferred to the next development-harness steps:
- filesystem task contracts
- evaluator feedback ledger
- stronger release-harness closure checklist
- making full smoke green enough to become a default push gate

## Freeze Judgment
Freeze now.

This is the correct first repository-harness baseline: low-risk, deterministic, installable, and aligned with the current maturity of the codebase.
