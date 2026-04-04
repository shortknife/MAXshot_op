# Nexa Prompt Filesystem

Prompt source of truth is the repository filesystem, not Supabase.

## Rules
- One prompt document per file.
- Markdown with frontmatter is the canonical storage format.
- Runtime resolves prompts from `admin-os/prompts/` only.
- Supabase is allowed for runtime evidence, audit, and operational events, not for prompt content storage.
- Prompt changes are released through Git history and file review, not table mutations.

## Layout
- `intent/` intent understanding and session interpretation prompts
- `execution/` capability execution prompts
- `verification/` runtime verification prompts
- `fallback/` bounded fallback prompts

## Required Sections
- frontmatter: `slug`, `family`, `version`, `status`, `aliases`
- `## Description`
- `## Model Config`
- `## System Prompt`
- `## User Prompt Template`
