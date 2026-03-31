# Next Actions

## Immediate

1. Harden business query correctness on mixed historical data
- keep user-visible reads prod-first
- remove or narrow legacy fallback that can surface non-prod rows

2. Verify the main user-facing chat/execution flows against current canonical facts
- prioritize `/api/chat/ask`
- prioritize execution detail / latest execution queries

## Working Rule

- Mainline is green: `phase0 93/93 PASS` and `phase2 34/34 PASS`.
- Do not reopen `Step1-9` unless a new regression appears.
- Use `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/project-memory/*` as the first stop when resuming work.
