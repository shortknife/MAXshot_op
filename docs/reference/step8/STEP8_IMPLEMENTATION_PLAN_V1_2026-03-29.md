# Step 8 Implementation Plan V1

- Date: 2026-03-29
- Status: Frozen baseline
- Contract source: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP8_TRACE_AUDIT_CONTRACT_V1_2026-03-29.md`
- Brainstorming source: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP8_BRAINSTORMING_V1_2026-03-29.md`

## 1. Objective

Turn the current mixed audit helpers into a true Step 8 trace layer with one canonical write path, one canonical read path, and replay-ready event semantics.

## 2. Implementation phases

### Phase A - Contract alignment

1. define one runtime `TraceAuditResult` shape
2. centralize audit event normalization
3. define the minimum canonical event vocabulary

### Phase B - Write-path normalization

1. centralize append-only audit writing helpers
2. make run/replay/retry/confirm routes use the same write helpers
3. preserve audit seed from Step 5 without creating a second authority

### Phase C - Read-path normalization

1. centralize audit log read helpers
2. normalize older event variants into one read model
3. stabilize event ordering and default fields

### Phase D - Validation

1. add focused Step 8 tests
2. add one Step 8 MVP acceptance command
3. run adjacency regression on Step 6 and Step 7 before closure

## 3. MVP scope now

### In MVP now

1. canonical audit append helper
2. canonical audit read helper
3. normalized event vocabulary for create/confirm/run/replay/retry/expire
4. explicit blocked and error event semantics
5. stable trace read model for `/audit`, `/lineage`, and adjacent admin routes

### Not in MVP now

1. deep lineage graph redesign
2. export jobs or archival pipelines
3. cross-execution causality engine redesign
4. actor/ACL segmentation inside audit APIs

## 4. Deliverables

1. focused Step 8 tests
2. Step 8 acceptance evidence
3. stable audit write/read runtime artifact
