# Nexa Prompt Governance Surface Baseline (2026-04-03)

## Scope

This step upgrades `/prompts` from a narrow edit form into a governance surface.

The goal is to make prompt management visible through four product surfaces at once:

- inventory
- policy
- runtime evidence
- edit boundary

## Implemented

### Prompt governance snapshot

`/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/prompts/governance.ts`

The snapshot now combines:

- active prompt inventory from Supabase when available
- local config prompt fallback inventory
- prompt-policy customer summary
- recent runtime prompt/policy rollups from interaction logs

### Prompt governance product surface

`/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/components/prompts/prompt-governance-surface.tsx`

The `/prompts` page now provides:

- prompt inventory list
- source badge and edit boundary
- prompt editor for Supabase-backed prompts
- customer prompt-policy summary
- runtime prompt usage rollups
- prompt-policy reason rollups

### Navigation

`/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/components/app-nav.tsx`

`Prompts` is now part of the main admin navigation instead of remaining a hidden utility page.

## Validation

Focused validation:

- `lib/prompts/__tests__/governance.test.ts`
- `lib/chat/__tests__/prompt-policy.test.ts`
- `lib/chat/__tests__/prompt-runtime.test.ts`

Build:

- `npm run build`

## Acceptance judgment

Accepted as `baseline`.

This is enough for the current stage because prompt governance is now visible as a product surface rather than only as runtime metadata and a raw edit form.

## Out of scope

Not included in this step:

- prompt approval workflow
- prompt diff review
- customer-specific prompt editing rights
- prompt rollback and release channels
