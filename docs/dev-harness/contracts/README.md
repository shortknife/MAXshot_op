# Task Contracts

This directory stores filesystem-managed task contracts for multi-step implementation work.

Rules:
- One contract per meaningful development step.
- Contracts are markdown files with frontmatter.
- Contracts are repository assets, not product runtime data.
- A contract should exist before or during implementation, not after the fact.
- When a step is frozen, update `status` and add evidence.

Required frontmatter fields:
- `slug`
- `title`
- `status`
- `owner`
- `created_at`
- `updated_at`
- `category`
- `scope_paths`
- `verification`
- `freeze_when`

Required body sections:
- `## Goal`
- `## In Scope`
- `## Out Of Scope`
- `## Acceptance`
- `## Evidence`

File naming:
- Prefer `YYYY-MM-DD-<slug>.md`
