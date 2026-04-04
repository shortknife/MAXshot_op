# Nexa Prompt Filesystem Baseline

Date: 2026-04-04
Status: accepted

## Decision
- Prompt source of truth is now the repository filesystem under `admin-os/prompts/`.
- Prompt content is stored as Markdown documents with frontmatter, not in Supabase tables.
- Supabase remains allowed for runtime evidence, audit, interaction logs, and cost events, but not for prompt content storage.

## Accepted Scope
- Filesystem-first prompt registry in `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/prompts/prompt-registry.ts`
- Canonical markdown prompt inventory under `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/prompts/`
- Prompt runtime switched to filesystem-managed sources
- `/prompts` governance surface switched to filesystem-first read model
- Prompt action API disabled for Supabase mutation paths
- Prompt policy registry switched to `filesystem_md`

## Canonical Prompt Families
- `intent/`
- `execution/`
- `verification/`
- `fallback/`

## Current Canonical Prompt Set
- `intent_analyzer`
- `intent_normalizer`
- `intent_critic`
- `turn_relation_classifier`
- `product_doc_qna`
- `content_generator`
- `llm_question_classifier`

## Explicitly Superseded
- Supabase prompt table as runtime source of truth
- `fallback_csv` prompt resolution path
- UI-based prompt content editing against `prompt_library`
- Supabase-based prompt release / rollback as the primary prompt governance path

## Runtime Consequences
- Prompt resolution now returns `source = filesystem_md`
- Prompt policy checks now validate against filesystem-managed prompt sources
- Prompt governance surface is Git-managed and read-only from the product UI
- Prompt release / rollback is now a repository change process, not a table mutation process

## Deferred
- Git-native release ledger
- file-based staged prompt rollout manifest
- prompt diff view inside `/prompts`
- formal prompt approval workflow on top of Git
