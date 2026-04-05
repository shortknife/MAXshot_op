# Evaluator Feedback Ledger

This directory stores filesystem-managed evaluator feedback entries for development-step closure decisions.

Rules:
- One feedback file per meaningful evaluation pass.
- Feedback files are repository assets, not product runtime data.
- Each feedback file should point to a task contract slug.
- Feedback files record closure evidence and remaining findings, not implementation prose.

Required frontmatter fields:
- `slug`
- `contract_slug`
- `title`
- `status`
- `evaluator`
- `created_at`
- `updated_at`
- `verdict`
- `evidence`
- `next_action`

Required body sections:
- `## Summary`
- `## Findings`
- `## Evidence`
- `## Closure Recommendation`

File naming:
- Prefer `YYYY-MM-DD-<slug>.md`
