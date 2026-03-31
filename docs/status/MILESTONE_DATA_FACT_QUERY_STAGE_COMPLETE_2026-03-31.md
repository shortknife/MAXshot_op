# DATA FACT QUERY MILESTONE

Date: 2026-03-31
Workspace: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode`
Scope: `capability.data_fact_query` + ingestion mainline + production-facing business query path
Status: `stage complete`

## 1. Milestone Definition

This milestone closes the minimum production path required for MAXshot business data access:

- live ingestion can write canonical business facts
- chat business queries can read those facts reliably
- follow-up queries preserve usable context
- historical execution pollution no longer contaminates product-facing reads
- the system can reject or clarify outside its executable boundary instead of pretending to know

## 2. What Is Complete

### 2.1 Ingestion Mainline

The business ingestion path is now live and verified.

Completed:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/ingestion/route.ts`
- native source write path validated
- morpho source write path validated
- downstream fact tables validated

Verified tables:
- `executions`
- `market_metrics`
- `allocation_snapshots`
- `rebalance_decisions`

Result:
- ingestion is no longer a blocking development risk
- business facts are available in canonical tables

### 2.2 Product-Facing Execution Read Isolation

Historical polluted rows in `executions` were not physically deleted.
Instead, product reads were isolated behind canonical filtering.

Completed:
- database view `executions_canonical_v1`
- product read path switched away from raw polluted execution listing

Result:
- old malformed execution rows are no longer part of normal product output
- audit preservation is kept intact

### 2.3 Business Query Mainline

The primary business query lane is now functional end to end.

Completed:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/capabilities/business-query-provider.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/capabilities/business-query-planner.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/handlers/business-intent-handler.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/session-context.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/chat-request-preprocess.ts`

Supported query classes now verified:
- yield summary
- vault list
- ranking
- trend
- top/bottom extremes
- compare
- latest execution detail
- rebalance reason / no-rebalance reason
- constrained follow-up turns

Supported filters now verified:
- `chain`
- `protocol`
- `vault_keyword`
- inherited `time_window`
- inherited `compare_targets`

### 2.4 Template and Contract Alignment

Business query templates now accept the same practical constraints the chat layer extracts.

Completed:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/sql-templates/business_yield_dimension_ranking.sql`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/sql-templates/business_yield_daily_trend.sql`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/sql-templates/business_yield_extremes_with_reason.sql`

Result:
- ranking, trend, and extremes now apply `chain / protocol / vault_keyword`
- compare and follow-up requests no longer lose essential constraints at template boundary

### 2.5 Boundary Simplification

Narrative/RAG is no longer part of the active evidence dependency for this stage.

Result:
- the system now stands on fact tables + audit trace
- disabled or degraded embedding/RAG infrastructure no longer blocks product progress

## 3. Acceptance Evidence

Build verification:

```bash
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os
npm run build
```

Result:
- pass

Smoke verification:

```bash
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os
npm run test:phase0
```

Result:
- `Total: 95, Passed: 95, Failed: 0`

Recent milestone commit:
- `89b0405` — `feat: close data fact query follow-up gaps`

## 4. Current Capability Status

Capability registry snapshot:
- total capabilities: `5`
- active capabilities: `4`

Current critical active path:
- `capability.data_fact_query`

Interpretation:
- the system is not aiming for open-domain conversation quality
- the system is now operating as a bounded, auditable business query product

## 5. What Is Explicitly Not Part Of This Milestone

The following items are intentionally deferred and do not block this milestone:

- broad natural-language coverage outside business-query patterns
- perfect conversational follow-up across arbitrary topic switching
- performance optimization of slow intent/LLM branches
- physical cleanup of historical polluted execution rows
- RAG/embedding reinstatement

## 6. Remaining Risks

Known non-blocking risks:
- some edge phrasing will still route imperfectly
- intent latency remains higher than desired on certain paths
- historical database pollution still exists at storage layer, though isolated from main reads
- future schema drift between data producers and business-query templates will require continued regression checks

## 7. Next Stage Recommendation

Recommended next-stage focus:

1. performance tightening for `chat/ask` and `intent/analyze`
2. user-facing release hardening and UAT packaging
3. backlog triage for edge phrasing and low-priority follow-up cases
4. optional historical database cleanup after release pressure is removed

## 8. Final Classification

As of 2026-03-31, this project should be classified as:

- `ingestion mainline complete`
- `data_fact_query mainline complete`
- `phase0 green`
- `ready for release-oriented iteration`

