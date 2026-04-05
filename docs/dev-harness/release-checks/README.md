# Release Harness Closure Checks

This directory stores filesystem-managed release closure checklists for repository-level freeze and release discipline.

Rules:
- One checklist file per meaningful release or freeze baseline.
- Checklist files are repository assets, not product runtime data.
- A checklist should reference the relevant task contracts and evaluator feedback when applicable.
- A checklist records what must be true before a step or release is considered closure-ready.

Required frontmatter fields:
- `slug`
- `title`
- `status`
- `owner`
- `created_at`
- `updated_at`
- `contract_slugs`
- `feedback_slugs`
- `required_commands`
- `required_artifacts`

Required body sections:
- `## Goal`
- `## Checklist`
- `## Evidence`
- `## Blockers`
- `## Freeze Recommendation`

File naming:
- Prefer `YYYY-MM-DD-<slug>.md`
