# MAXshot MVP Release Note

## Release Status
- Version: MVP
- Date: 2026-02-19
- Readiness: Demo-ready, audit-traceable, operator-gated

## What Is Delivered
1. Deterministic execution chain
- Entry -> Confirm -> Run -> Outcome -> Audit

2. SQL template engine (file-based)
- Read-only execution path
- Guard + explain precheck

3. Admin OS operational controls
- Confirm / Run / Replay / Retry / Expire
- Unified action feedback

4. Audit and observability
- Timeline events
- KPI panel with failure reasons
- JSON/CSV export

## Verification Artifacts
1. Regression report
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/REGRESSION_REPORT_2026-02-18.md`

2. Regression runbook
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/runbooks/REGRESSION_TESTS.md`

3. Stabilization checklist
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/runbooks/PHASE5_STABILIZATION_CHECKLIST.md`

## Demo Artifacts
1. One-pager script
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/runbooks/DEMO_ONE_PAGER.md`

2. Full walkthrough
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/runbooks/DEMO_WALKTHROUGH.md`

3. Talk track and checklist
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/runbooks/DEMO_TALK_TRACK.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/runbooks/DEMO_CHECKLIST.md`

## Scope Boundary
1. Delivered scope and limits
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/MVP_SCOPE_AND_LIMITS.md`

2. Out-of-scope
- Autonomous writeback without human confirmation
- External orchestration platforms
- Production bot rollout

## Deployment/Run Notes
1. Recommended local port
- `PORT=3003`

2. Required env flags
- `NEXT_PUBLIC_READ_ONLY_DEMO=false`
- `NEXT_PUBLIC_WRITE_ENABLE=true`
- `WRITE_CONFIRM_TOKEN=<token>`

3. Replay semantics
- Default replay mode is `in_place` unless endpoint returns `child_execution`

## Handoff Decision
- MVP is suitable for guided demo and internal review.
- Production rollout should wait for post-MVP hardening and SSO/IAM integration.
