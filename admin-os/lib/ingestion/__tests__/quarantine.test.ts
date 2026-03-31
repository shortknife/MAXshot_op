import { describe, expect, it, vi } from 'vitest';

import type { CanonicalIngestionPayload, GateDecision } from '../contract';
import {
  buildQuarantineRecord,
  INGESTION_QUARANTINE_TABLE,
  quarantinePayload,
  writeQuarantineRecord,
} from '../quarantine';

function buildPayload(overrides: Partial<CanonicalIngestionPayload> = {}): CanonicalIngestionPayload {
  return {
    source_system: 'native',
    source_execution_ref: 'src-123',
    source_workflow_name: 'native-clean-log',
    environment: 'prod',
    workflowId: 'wf-123',
    status: 'success',
    createdAt: '2026-03-30T10:00:00.000Z',
    startedAt: '2026-03-30T10:00:01.000Z',
    stoppedAt: '2026-03-30T10:00:20.000Z',
    vaultName: 'Maxshot USDC V2',
    markets: [{ chain: 'base', protocolName: 'Morpho', market: 'USDC', netApy: 3.2 }],
    allocationData: [{ chain: 'base', protocolName: 'Morpho', market: 'USDC', asset: 'USDC', totalAllocated: 100 }],
    rebalanceDecision: { rebalanceNeeded: false, rebalanceReason: 'No rebalance', is_blocked: false },
    is_critical_event: false,
    raw_archive_ref: 'archive://abc',
    ...overrides,
  };
}

function buildDecision(outcome: GateDecision['outcome'] = 'quarantined'): GateDecision {
  return {
    outcome,
    findings: [
      {
        code: 'missing_market_name',
        severity: 'error',
        path: 'markets[0].market',
        message: 'markets[0].market is required',
      },
    ],
  };
}

describe('buildQuarantineRecord', () => {
  it('builds a stable quarantine record with payload snapshot', () => {
    const payload = buildPayload({ workflowId: '  wf-123  ' });
    const record = buildQuarantineRecord(payload, buildDecision(), '2026-03-31T00:00:00.000Z');

    expect(record.workflow_id).toBe('wf-123');
    expect(record.source_system).toBe('native');
    expect(record.reasons).toHaveLength(1);
    expect(record.payload_snapshot.workflowId).toBe('  wf-123  ');
    expect(record.created_at).toBe('2026-03-31T00:00:00.000Z');
  });
});

describe('writeQuarantineRecord', () => {
  it('writes to the canonical quarantine table', async () => {
    const insert = vi.fn(async () => ({ error: null }));
    const db = { from: vi.fn(() => ({ insert })) };
    const record = buildQuarantineRecord(buildPayload(), buildDecision());

    await writeQuarantineRecord(record, db as never);

    expect(db.from).toHaveBeenCalledWith(INGESTION_QUARANTINE_TABLE);
    expect(insert).toHaveBeenCalledWith(record);
  });

  it('throws when the quarantine write fails', async () => {
    const db = {
      from: vi.fn(() => ({ insert: vi.fn(async () => ({ error: { message: 'permission denied' } })) })),
    };

    await expect(writeQuarantineRecord(buildQuarantineRecord(buildPayload(), buildDecision()), db as never)).rejects.toThrow(
      'failed_to_write_ingestion_quarantine:permission denied',
    );
  });
});

describe('quarantinePayload', () => {
  it('rejects non-quarantined outcomes', async () => {
    const db = { from: vi.fn(() => ({ insert: vi.fn(async () => ({ error: null })) })) };
    await expect(quarantinePayload(buildPayload(), buildDecision('accepted'), db as never)).rejects.toThrow(
      'quarantine_requires_quarantined_outcome:accepted',
    );
  });
});
