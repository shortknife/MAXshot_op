import { describe, expect, it, vi } from 'vitest';

import { runIngestion } from '../runner';

function buildNativeInput() {
  return {
    isSuccess: true,
    status: 'success',
    data: {
      id: 'src-001',
      workflowId: 'wf-native-001',
      status: 'success',
      createdAt: '2026-03-31T00:00:00.000Z',
      startedAt: '2026-03-31T00:00:01.000Z',
      stoppedAt: '2026-03-31T00:00:20.000Z',
      subExecutionLogs: [{
        data: { resultData: { runData: {
          Summary: [{ data: { main: [[{ json: { name: 'Maxshot USDC Vault' } }]] } }],
          'Rebalance Check': [{ data: { main: [[{ json: { rebalanceNeeded: false, reason: 'No rebalancing needed', conditions: { waitingPeriodBlocked: false } } }]] } }],
          'Current Info': [{ data: { main: [[{ json: { chainName: 'base', allocationAndMarket: [{ marketData: [{ chain: 'base', protocolName: 'Morpho', market: 'USDC', totalSupplied: 1, supplyApy: 1 }], allocationData: [{ chain: 'base', protocolName: 'Morpho', market: 'USDC', asset: 'USDC', totalAllocated: 1, idleLiquidity: 0 }] }], strategies: [{ workflowParams: { gasCost: 0.01 } }] } }]] } }],
        } } },
      }],
    },
  };
}

describe('runIngestion', () => {
  it('writes accepted payloads through the fact writer path', async () => {
    const db = {
      from: vi.fn(() => ({ insert: vi.fn(async () => ({ error: null })) })),
      rpc: vi.fn(async () => ({ data: { success: true, execution_id: 'exec-001', message: 'ok' }, error: null })),
    };

    const result = await runIngestion('native', buildNativeInput(), db as never);

    expect(result.status).toBe('written');
    expect(result.factWrite?.execution_id).toBe('exec-001');
    expect(db.rpc).toHaveBeenCalled();
  });

  it('returns quarantined without fact writes', async () => {
    const db = {
      from: vi.fn(() => ({ insert: vi.fn(async () => ({ error: null })) })),
      rpc: vi.fn(async () => ({ data: { success: true, execution_id: 'exec-001', message: 'ok' }, error: null })),
    };
    const input = buildNativeInput();
    input.data.subExecutionLogs[0].data.resultData.runData['Current Info'][0].data.main[0][0].json.allocationAndMarket[0].marketData[0].market = '';

    const result = await runIngestion('native', input, db as never);

    expect(result.status).toBe('quarantined');
    expect(result.quarantineRecord).toBeDefined();
    expect(db.rpc).not.toHaveBeenCalled();
    expect(db.from).toHaveBeenCalled();
  });
});
