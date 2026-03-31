import { describe, expect, it, vi } from 'vitest';

import type { CanonicalIngestionPayload } from '../contract';
import { buildRpcJsonData, PROCESS_LOG_DATA_RPC, writeCanonicalFacts } from '../fact-writer';

function buildPayload(): CanonicalIngestionPayload {
  return {
    source_system: 'native',
    source_execution_ref: 'src-123',
    source_workflow_name: 'native-clean-log',
    environment: 'prod',
    workflowId: 'wf-123',
    status: 'success',
    createdAt: '2026-03-31T04:00:00.000Z',
    startedAt: '2026-03-31T04:00:01.000Z',
    stoppedAt: '2026-03-31T04:00:20.000Z',
    vaultName: 'Maxshot USDC Vault',
    markets: [{ chain: 'base', protocolName: 'Morpho', market: 'USDC', tvl: 1000, baseApy: 3.5, netApy: 3.5, rewardApy: null, estDepositGas: 0.02 }],
    allocationData: [{ chain: 'base', protocolName: 'Morpho', market: 'USDC', asset: 'USDC', totalAllocated: 100, idleLiquidity: 0 }],
    rebalanceDecision: { rebalanceNeeded: false, rebalanceReason: 'No rebalance', is_blocked: false, threshold_details: null },
    is_critical_event: false,
  };
}

describe('buildRpcJsonData', () => {
  it('maps canonical payload into RPC shape', () => {
    const rpc = buildRpcJsonData(buildPayload());
    expect(rpc.workflowId).toBe('wf-123');
    expect(rpc.vaultName).toBe('Maxshot USDC Vault');
    expect(Array.isArray(rpc.markets)).toBe(true);
  });
});

describe('writeCanonicalFacts', () => {
  it('calls the canonical RPC', async () => {
    const rpc = vi.fn(async () => ({ data: { success: true, execution_id: 'exec-123', message: 'ok' }, error: null }));
    const db = { rpc };

    const result = await writeCanonicalFacts(buildPayload(), db as never);

    expect(rpc).toHaveBeenCalledWith(PROCESS_LOG_DATA_RPC, { json_data: buildRpcJsonData(buildPayload()) });
    expect(result.execution_id).toBe('exec-123');
  });

  it('throws on rpc failure', async () => {
    const db = { rpc: vi.fn(async () => ({ data: null, error: { message: 'rpc down' } })) };
    await expect(writeCanonicalFacts(buildPayload(), db as never)).rejects.toThrow('fact_write_rpc_failed:rpc down');
  });
});
