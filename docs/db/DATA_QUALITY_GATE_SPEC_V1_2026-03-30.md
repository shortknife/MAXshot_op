# DATA QUALITY GATE SPEC V1

Date: 2026-03-30  
Workspace: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode`
Status: Draft / Proposed
Depends on:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/db/INGESTION_CONTRACT_V1_2026-03-30.md`

## 1. Purpose

This spec defines the validation and acceptance rules applied after a source log has been normalized into the canonical ingestion payload.

The gate has one job:
- decide whether a payload is safe for canonical fact writes

The gate must never silently downgrade bad payloads into canonical facts.

## 2. Gate Outputs

Every payload must end in exactly one of these outcomes:

- `accepted`
- `accepted_with_warnings`
- `quarantined`

Canonical fact writes are allowed only for:
- `accepted`
- `accepted_with_warnings`

`quarantined` payloads must not write to canonical fact tables.

## 3. Severity Levels

Validation findings are classified as:

- `error`
  - blocks canonical fact writes
- `warning`
  - canonical fact writes may continue, but finding must be recorded
- `info`
  - provenance or debugging note only

## 4. Payload-Level Hard Failures

A payload is `quarantined` if any of the following is true:

- `source_system` missing or invalid
- `source_execution_ref` missing
- `environment` missing or `unknown`
- `workflowId` missing or empty
- `status` missing or empty
- `createdAt` missing or invalid

## 5. Execution-Level Hard Failures

Canonical `executions` write is blocked if:

- `workflowId` empty
- `vaultName` empty
- `environment != prod` for prod fact pipeline

If payload-level validation passed but execution-level validation failed:
- outcome remains `quarantined`
- child fact writes must also be blocked

## 6. Child Row Hard Failures

### 6.1 `market_metrics`
A row is invalid if any of these is missing or empty:
- `chain`
- `protocolName`
- `market`

### 6.2 `allocation_snapshots`
A row is invalid if any of these is missing or empty:
- `chain`
- `protocolName`
- `market`
- `asset`

### 6.3 `rebalance_decisions`
A row is invalid if:
- `rebalanceNeeded` is not boolean
- `rebalanceReason` is empty
- parent execution did not pass execution-level validation

## 7. Warning-Level Findings

Warnings do not block canonical writes, but must be recorded.

Examples:
- `startedAt` missing
- `stoppedAt` missing
- `cap` null
- `tvl` null
- `rewardApy` null
- `estDepositGas` null
- `critical_reason` missing while `is_critical_event = true`

## 8. Environment Rules

Environment is determined before fact writes.

Detection hints:
- `test`
  - `test`, `testnet`, `devnet`, `sepolia`
- `staging`
  - `staging`, `sandbox`, `uat`
- `prod`
  - no explicit non-prod markers

Detection sources:
- `vaultName`
- `workflowId`
- market names
- chain names
- source workflow name

Rule:
- any explicit non-prod marker takes precedence over implicit prod classification

## 9. Empty String Normalization

Before validation:
- trim all string fields
- convert whitespace-only strings to empty

Validation rule:
- fields that are required must treat `""` as missing

This specifically targets currently observed pollution such as:
- `market_metrics.market_name = ''`

## 10. Quarantine Record Schema

A quarantined payload must emit a record with:

```json
{
  "source_system": "native|morpho",
  "source_execution_ref": "string",
  "workflowId": "string|null",
  "environment": "prod|staging|test|unknown",
  "reasons": [
    {
      "code": "missing_workflow_id",
      "severity": "error",
      "path": "workflowId",
      "message": "workflowId is required"
    }
  ],
  "raw_archive_ref": "string|null",
  "created_at": "ISO8601 string"
}
```

## 11. Canonical Accept Rules

A payload may be `accepted` only if:
- no `error` findings exist
- environment is explicitly classified
- execution-level requirements pass
- all child rows that will be written pass their own row-level checks

A payload may be `accepted_with_warnings` only if:
- no `error` findings exist
- one or more `warning` findings exist

## 12. Row Handling Policy

Row handling must be explicit.

Recommended policy for V1:
- if execution-level validation fails: quarantine entire payload
- if any child row required for the business fact set is invalid: quarantine entire payload

Reason:
- easier correctness model
- avoids silent partial writes
- easier audit and replay

Partial-row acceptance can be considered later, but should not be the V1 default.

## 13. RAG Gate Rules

RAG write is evaluated only after canonical payload validation succeeds.

Rules:
- if payload is quarantined, do not write RAG
- if `is_critical_event = false`, skip RAG
- if `is_critical_event = true` and `critical_reason` missing, allow write with warning
- RAG write must use canonical DB execution UUID, not source execution ref

## 14. Metrics To Track

The gate should expose counters for:
- accepted payload count
- accepted_with_warnings count
- quarantined count
- top quarantine reason codes
- non-prod payload count
- empty-market row count
- missing-vault payload count

## 15. Immediate Implementation Shape

Suggested code split:
- `contract.ts`
- `environment.ts`
- `quality-gate.ts`
- `quarantine.ts`
- `fact-writer.ts`
- `rag-writer.ts`

V1 priority is only:
- `contract.ts`
- `environment.ts`
- `quality-gate.ts`

## 16. MVP Acceptance

This spec is implemented correctly when:
- payloads with missing `workflowId` are quarantined
- payloads with missing `vaultName` are quarantined
- payloads with non-prod markers are not mixed into prod fact path
- payloads with empty-string `market` are quarantined
- warnings are preserved without blocking valid payloads
