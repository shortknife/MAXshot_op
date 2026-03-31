# INGESTION CONTRACT V1

Date: 2026-03-30  
Workspace: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode`
Status: Draft / Proposed  
Scope: Native + Morpho execution-log ingestion into canonical business facts

## 1. Purpose

This contract defines the canonical ingestion boundary for execution-log data.

Goal:
- unify Native and Morpho source logs into one cleaned payload shape
- make validation explicit
- separate source adaptation from fact writing
- prevent bad, mixed-environment, or structurally incomplete payloads from entering canonical fact tables

This contract does **not** define scheduling or trigger mechanism.
It only defines the canonical payload and the minimum rules required before fact writes.

## 2. Pipeline Boundary

Canonical ingestion flow:

1. `source adapter`
2. `cleaned canonical payload`
3. `quality gate`
4. `fact writes`
5. `rag write if significant`
6. `audit / quarantine`

Responsibility split:
- source adapter: understand source-specific raw structure
- cleaned canonical payload: normalized shared shape
- quality gate: required fields, environment, reject/quarantine decisions
- fact writes: insert into canonical business tables only
- rag write: only for significant events

## 3. Canonical Payload

The canonical cleaned payload must look like this:

```json
{
  "source_system": "native|morpho",
  "source_workflow_name": "string",
  "source_execution_ref": "string",
  "environment": "prod|staging|test|unknown",
  "workflowId": "string",
  "status": "success|failed|error|unknown|string",
  "createdAt": "ISO8601 string",
  "startedAt": "ISO8601 string|null",
  "stoppedAt": "ISO8601 string|null",
  "vaultName": "string|null",
  "markets": [
    {
      "chain": "string",
      "protocolName": "string",
      "market": "string",
      "cap": 0,
      "tvl": 0,
      "baseApy": 0,
      "netApy": 0,
      "rewardApy": 0,
      "estDepositGas": 0
    }
  ],
  "allocationData": [
    {
      "chain": "string",
      "protocolName": "string",
      "market": "string",
      "asset": "string",
      "totalAllocated": 0,
      "idleLiquidity": 0
    }
  ],
  "rebalanceDecision": {
    "rebalanceNeeded": false,
    "rebalanceReason": "string",
    "is_blocked": false,
    "threshold_details": {}
  },
  "is_critical_event": false,
  "critical_reason": "string|null",
  "raw_archive_ref": "string|null",
  "adapter_meta": {}
}
```

## 4. Field Semantics

### 4.1 Top-level identity fields

- `source_system`
  - required
  - enum: `native | morpho`
- `source_workflow_name`
  - optional but recommended
  - used for provenance/debugging
- `source_execution_ref`
  - required
  - source-side execution identifier before DB execution UUID exists
- `environment`
  - required
  - enum: `prod | staging | test | unknown`
  - canonical fact tables must not silently accept `unknown`

### 4.2 Execution fact fields

- `workflowId`
  - required
  - canonical business execution key from upstream workflow system
- `status`
  - required
  - upstream status value; must not be null
- `createdAt`
  - required
  - execution creation timestamp
- `startedAt`
  - optional
- `stoppedAt`
  - optional
- `vaultName`
  - required for canonical execution facts
  - may be null only before quality gate; not allowed into canonical fact write

### 4.3 Market facts

Each `markets[]` entry represents one market snapshot under the same execution.

Required per row:
- `chain`
- `protocolName`
- `market`

Allowed nullable:
- `cap`
- `tvl`
- `baseApy`
- `netApy`
- `rewardApy`
- `estDepositGas`

Rule:
- `market` must not be empty string in canonical fact writes

### 4.4 Allocation facts

Each `allocationData[]` entry represents one allocation snapshot.

Required per row:
- `chain`
- `protocolName`
- `market`
- `asset`

Allowed nullable:
- `totalAllocated`
- `idleLiquidity`

Rule:
- `market` must not be empty string in canonical fact writes

### 4.5 Rebalance fact

`rebalanceDecision` is optional at payload level, but if present it must conform to:
- `rebalanceNeeded`: required boolean
- `rebalanceReason`: required string
- `is_blocked`: required boolean
- `threshold_details`: object or null

### 4.6 RAG decision fields

- `is_critical_event`
  - required boolean
- `critical_reason`
  - optional explanation for why RAG write is triggered

### 4.7 Provenance fields

- `raw_archive_ref`
  - optional pointer to raw archived source payload
- `adapter_meta`
  - optional object for source-specific debug info
  - must not be used as canonical business fact authority

## 5. Canonical Write Targets

A valid payload may write to these targets:

- `executions`
- `market_metrics`
- `allocation_snapshots`
- `rebalance_decisions`
- `execution_logs_rag` only when `is_critical_event = true`

This contract treats `execution_logs` or equivalent raw archive as a separate layer, not as the canonical fact authority.

## 6. Required Field Rules

### 6.1 Payload-level hard requirements

A payload must be rejected or quarantined if any of these are missing:
- `source_system`
- `source_execution_ref`
- `environment`
- `workflowId`
- `status`
- `createdAt`

### 6.2 Execution-level hard requirements

Canonical `executions` write must not happen unless:
- `workflowId` is non-empty
- `vaultName` is non-empty
- `environment = prod` for prod fact tables

### 6.3 Child-row hard requirements

Canonical `market_metrics` row must not be written unless:
- `chain` non-empty
- `protocolName` non-empty
- `market` non-empty

Canonical `allocation_snapshots` row must not be written unless:
- `chain` non-empty
- `protocolName` non-empty
- `market` non-empty
- `asset` non-empty

Canonical `rebalance_decisions` row must not be written unless:
- parent execution passed execution-level validation
- `rebalanceNeeded` is boolean
- `rebalanceReason` is non-empty string

## 7. Environment Classification

Environment classification must happen before fact writes.

Recommended rules:
- `prod`
  - no staging/test markers in chain, vault, workflow, market names
- `staging`
  - explicit markers like `staging`, `sandbox`, `uat`
- `test`
  - explicit markers like `test`, `testnet`, `sepolia`, `devnet`
- `unknown`
  - cannot confidently classify

Rules:
- `prod` facts go to canonical business tables
- `staging/test/unknown` facts must not silently mix into prod analytics scope
- they should either go to separate tables, or be written with explicit environment column and excluded by contract

## 8. Quality Gate Outcomes

Every canonical payload must end in one of 3 outcomes:

1. `accepted`
- safe for canonical fact writes

2. `accepted_with_noncanonical_side_output`
- canonical facts written, but raw archive and/or debug notes also stored

3. `quarantined`
- payload stored for diagnosis, but not written into canonical fact tables

There should be no silent partial success where broken rows leak into prod fact tables without explicit marking.

## 9. Quarantine Rules

Payload must be quarantined when any of the following occurs:
- missing required payload-level field
- `workflowId` empty
- `vaultName` empty for execution fact
- `environment = unknown`
- child rows contain empty-string market names at canonical write stage
- source parse succeeded but canonical mapping is structurally incomplete
- write target returns integrity error or constraint failure

Quarantine record should contain:
- `source_system`
- `source_execution_ref`
- `workflowId` if present
- failure reason list
- raw payload pointer or embedded sample
- timestamp

## 10. RAG Contract

RAG write is selective.

Rules:
- do not write all executions to RAG
- only write when `is_critical_event = true`
- RAG document must reference canonical execution authority
- `execution_id` must be the DB execution UUID, not the source-side numeric or temporary id

RAG document minimum fields:
- `execution_id`
- `content`
- `metadata.source_system`
- `metadata.environment`
- `metadata.vault_name`
- `metadata.chain`
- `metadata.event_type` or equivalent significance label

## 11. Native / Morpho Adapter Contract

Both adapters must produce the exact canonical payload shape.

Adapter-specific logic may differ only in:
- source parsing
- field extraction path
- environment detection hints
- critical-event heuristics if justified

Adapters must not differ in:
- canonical field names
- validation rules
- write target semantics
- quarantine semantics

## 12. Current Gaps This Contract Is Meant To Fix

This contract directly addresses currently observed issues:
- `executions.workflow_id IS NULL`
- `executions.vault_name IS NULL`
- `market_metrics.market_name = ''`
- staging/testnet data mixed into canonical fact scope
- missing or unstable raw layer
- selective RAG already exists but lacks explicit contract linkage to canonical authority

## 13. Recommended Implementation Order

1. implement canonical payload builder for Native
2. implement canonical payload builder for Morpho
3. implement shared validator / gate
4. implement quarantine sink
5. implement canonical fact writer
6. implement selective RAG writer
7. keep trigger layer outside this contract

## 14. MVP Acceptance

This contract is acceptable when:
- Native and Morpho both emit the same canonical payload shape
- invalid payloads are quarantined, not silently written
- empty `market` rows no longer appear in canonical facts
- non-prod environments are isolated from prod analytics scope
- RAG writes reference canonical execution IDs

## 15. Immediate Next Spec

The next document should be:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/db/DATA_QUALITY_GATE_SPEC_V1_2026-03-30.md`

That spec should define:
- exact validation rules
- environment detection rules
- quarantine schema
- canonical accept / reject behavior
