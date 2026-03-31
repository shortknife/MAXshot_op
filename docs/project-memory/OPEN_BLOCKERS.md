# Open Blockers

## B-001
- Title: historical non-prod / polluted facts can still leak into some business-query paths
- Severity: high
- Scope: product answer correctness
- Current state: live ingestion is wired and canonical `executions_canonical_v1` is in use for execution reads, but some business query paths still keep legacy fallback behavior for mixed-environment facts
- Next move: harden business query read path so product answers are prod-first and avoid legacy mixed-environment fallback in user-visible flows

## B-002
- Title: production/staging/test facts are still mixed in the historical database
- Severity: high
- Scope: analytics correctness
- Current state: new canonical ingestion path now enforces environment classification and quarantine, but historical polluted rows still exist in legacy tables
- Next move: continue isolating reads with canonical views / filters instead of physical cleanup on the critical path

## Deferred / Post-MVP

- `Step2` in-memory `Map` state is not production-grade for multi-instance deployment
- full project development memory system is not implemented; current solution is this lightweight memory layer
- `Claude-mem` style external memory tooling is deferred for the current Codex environment
