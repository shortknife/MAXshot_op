# Nexa Prompt Legacy Cleanup

Date: 2026-04-04
Status: accepted

## Removed
- `admin-os/app/configs/prompt-library-op/`
- `admin-os/lib/prompts/release.ts`
- `admin-os/lib/prompts/__tests__/release.test.ts`
- `admin-os/docs/status/PROMPT_RELEASE_EVENTS_DDL.sql`
- `docs/status/NEXA_PROMPT_RELEASE_ROLLBACK_BASELINE_2026-04-03.md`
- `capability.prompt_governance_mutation` from capability registry

## Reason
These assets belonged to the old mixed prompt architecture: Supabase prompt table, local JSON fallback, and table-driven release/rollback. They are obsolete after the filesystem-first prompt migration.

## Result
- Prompt runtime has one source of truth: `admin-os/prompts/`
- Prompt governance is read-only in product UI and Git-managed for changes
- Current status documents no longer describe Supabase-first prompt retrieval as the active model
