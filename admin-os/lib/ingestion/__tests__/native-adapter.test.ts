import { describe, expect, it, vi } from 'vitest';

import { adaptAndValidateNativePayload, adaptNativePayload } from '../native-adapter';

function buildCleanedNativePayload() {
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
      subExecutionLogs: [
        {
          data: {
            resultData: {
              runData: {
                Summary: [{ data: { main: [[{ json: { name: 'Maxshot USDC Vault' } }]] } }],
                'Rebalance Check': [{ data: { main: [[{ json: { rebalanceNeeded: true, reason: 'Threshold crossed', conditions: { waitingPeriodBlocked: false, thresholdsMet: ['apy'] } } }]] } }],
                'Current Info': [{ data: { main: [[{ json: {
                  chainName: 'base',
                  strategies: [{ workflowParams: { gasCost: 0.02 } }],
                  allocationAndMarket: [{
                    marketData: [{ chain: 'base', protocolName: 'Morpho', market: 'USDC', totalSupplied: 12345, supplyApy: 3.5 }],
                    allocationData: [{ chain: 'base', protocolName: 'Morpho', market: 'USDC', asset: 'USDC', totalAllocated: 1000, idleLiquidity: 10 }],
                  }],
                } }]] } }],
              },
            },
          },
        },
      ],
    },
  };
}

describe('adaptNativePayload', () => {
  it('adapts a cleaned native payload into the canonical shape', () => {
    const payload = adaptNativePayload(buildCleanedNativePayload());

    expect(payload.source_system).toBe('native');
    expect(payload.source_execution_ref).toBe('src-001');
    expect(payload.workflowId).toBe('wf-native-001');
    expect(payload.vaultName).toBe('Maxshot USDC Vault');
    expect(payload.environment).toBe('prod');
    expect(payload.markets).toHaveLength(1);
    expect(payload.markets[0].market).toBe('USDC');
    expect(payload.allocationData).toHaveLength(1);
    expect(payload.rebalanceDecision?.rebalanceNeeded).toBe(true);
    expect(payload.adapter_meta?.source_shape).toBe('cleaned');
  });

  it('prefers step11 json_data values when present', () => {
    const payload = adaptNativePayload({
      cleaned_data: buildCleanedNativePayload(),
      json_data: {
        workflowId: 'wf-step11-override',
        status: 'warning',
        createdAt: '2026-03-31T01:00:00.000Z',
        vaultName: 'Step11 Vault',
        is_critical_event: true,
        debug_reason: 'APY Volatility: 0.40%',
      },
    });

    expect(payload.workflowId).toBe('wf-step11-override');
    expect(payload.vaultName).toBe('Step11 Vault');
    expect(payload.is_critical_event).toBe(true);
    expect(payload.critical_reason).toBe('APY Volatility: 0.40%');
    expect(payload.adapter_meta?.source_shape).toBe('step11');
  });
});

describe('adaptAndValidateNativePayload', () => {
  it('routes quarantined payloads into quarantine', async () => {
    const db = {
      from: vi.fn(() => ({ insert: vi.fn(async () => ({ error: null })) })),
    };
    const input = buildCleanedNativePayload();
    input.data.subExecutionLogs[0].data.resultData.runData['Current Info'][0].data.main[0][0].json.allocationAndMarket[0].marketData[0].market = '';

    const result = await adaptAndValidateNativePayload(input, db as never);

    expect(result.decision.outcome).toBe('quarantined');
    expect(result.quarantineRecord).toBeDefined();
    expect(db.from).toHaveBeenCalled();
  });

  it('returns accepted payloads without quarantine writes', async () => {
    const db = {
      from: vi.fn(() => ({ insert: vi.fn(async () => ({ error: null })) })),
    };

    const result = await adaptAndValidateNativePayload(buildCleanedNativePayload(), db as never);

    expect(result.decision.outcome).toBe('accepted');
    expect(result.quarantineRecord).toBeUndefined();
    expect(db.from).not.toHaveBeenCalled();
  });
});
