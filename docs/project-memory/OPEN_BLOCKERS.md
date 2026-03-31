# Open Blockers

## B-001
- Title: shared ingestion core is not yet wired into production data flow
- Severity: high
- Scope: data quality / future product correctness
- Current state: contract, quality gate, quarantine sink, source adapters, and shared runner exist; they are not yet wired into the live trigger path
- Next move: choose the first live path and replace the old direct RPC call with the shared runner

## B-002
- Title: production/staging/test facts are still mixed in the current database
- Severity: high
- Scope: analytics correctness
- Current state: quality issue is understood and documented, but no new canonical ingestion path is enforcing environment separation yet
- Next move: enforce environment classification and quarantine through the shared ingestion core

## Deferred / Post-MVP

- `Step2` in-memory `Map` state is not production-grade for multi-instance deployment
- full project development memory system is not implemented; current solution is this lightweight memory layer
- `Claude-mem` style external memory tooling is deferred for the current Codex environment
