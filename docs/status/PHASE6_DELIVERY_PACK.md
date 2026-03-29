# Phase 6 Delivery Pack

## Status
- Phase 6 pack prepared (updated)
- Validation baseline: unified smoke + UAT gates

## Deliverables
0. MVP release note (entry page)
- `/docs/status/RELEASE_NOTE_MVP.md`

1. Demo one-pager script
- `/docs/runbooks/DEMO_ONE_PAGER.md`

2. Regression report (latest run)
- `/docs/status/PHASE_ALL_SMOKE_REPORT.md`
- `/docs/status/UAT_FINAL_REPORT.md`

3. MVP scope and limits
- `/docs/status/MVP_SCOPE_AND_LIMITS.md`

4. Existing deep-dive demo docs
- `/docs/runbooks/DEMO_WALKTHROUGH.md`
- `/docs/runbooks/DEMO_TALK_TRACK.md`
- `/docs/runbooks/DEMO_CHECKLIST.md`

## Handoff Notes
- Use port `3003` as default to avoid local port conflict.
- Treat replay as `in_place` unless API explicitly returns `child_execution`.
- Use `/docs/runbooks/REGRESSION_TESTS.md` for repeatable verification.
- Preferred one-shot command:
  - `BASE_URL=http://127.0.0.1:3003 npm run test:all:with-dev`
