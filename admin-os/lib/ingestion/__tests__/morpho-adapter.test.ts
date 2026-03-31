import { describe, expect, it, vi } from 'vitest';

import { adaptAndValidateMorphoPayload, adaptMorphoPayload } from '../morpho-adapter';

function buildCleanedMorphoPayload() {
  return {
    isSuccess: true,
    status: 'success',
    data: {
      id: 'src-morpho-001',
      workflowId: 'wf-morpho-001',
      status: 'success',
      createdAt: '2026-03-31T02:00:00.000Z',
      startedAt: '2026-03-31T02:00:01.000Z',
      stoppedAt: '2026-03-31T02:00:20.000Z',
      subExecutionLogs: [
        {
          data: {
            resultData: {
              runData: {
                Summary: [{ data: { main: [[{ json: { name: 'dForce USDC' } }]] } }],
                'Rebalance Check': [{ data: { main: [[{ json: { rebalanceNeeded: false, reason: 'No rebalancing needed', conditions: { waitingPeriodBlocked: false } } }]] } }],
                'Current Info': [{ data: { main: [[{ json: {
                  chainName: 'ethereum',
                  strategies: [{ workflowParams: { gasCost: 0.05 } }],
                  allocationAndMarket: [{
                    marketData: [{ chain: 'ethereum', protocolName: 'Morpho', market: 'cbBTC/USDC', totalSupplied: 478360206.74, supplyApy: 4.65 }],
                    allocationData: [{ chain: 'ethereum', protocolName: 'Morpho', market: 'cbBTC/USDC', asset: 'USDC', totalAllocated: 5000, idleLiquidity: 0 }],
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

describe('adaptMorphoPayload', () => {
  it('adapts a cleaned morpho payload into the canonical shape', () => {
    const payload = adaptMorphoPayload(buildCleanedMorphoPayload());

    expect(payload.source_system).toBe('morpho');
    expect(payload.source_execution_ref).toBe('src-morpho-001');
    expect(payload.workflowId).toBe('wf-morpho-001');
    expect(payload.vaultName).toBe('dForce USDC');
    expect(payload.environment).toBe('prod');
    expect(payload.markets).toHaveLength(1);
    expect(payload.markets[0].market).toBe('cbBTC/USDC');
    expect(payload.allocationData).toHaveLength(1);
    expect(payload.rebalanceDecision?.rebalanceNeeded).toBe(false);
    expect(payload.adapter_meta?.source_shape).toBe('cleaned');
  });

  it('prefers step11 json_data values when present', () => {
    const payload = adaptMorphoPayload({
      cleaned_data: buildCleanedMorphoPayload(),
      json_data: {
        workflowId: 'wf-morpho-step11',
        status: 'warning',
        createdAt: '2026-03-31T03:00:00.000Z',
        vaultName: 'Morpho Step11 Vault',
        is_critical_event: true,
        debug_reason: 'Rebalance triggered',
      },
    });

    expect(payload.workflowId).toBe('wf-morpho-step11');
    expect(payload.vaultName).toBe('Morpho Step11 Vault');
    expect(payload.is_critical_event).toBe(true);
    expect(payload.critical_reason).toBe('Rebalance triggered');
    expect(payload.adapter_meta?.source_shape).toBe('step11');
  });
});

describe('adaptAndValidateMorphoPayload', () => {
  it('routes quarantined payloads into quarantine', async () => {
    const db = {
      from: vi.fn(() => ({ insert: vi.fn(async () => ({ error: null })) })),
    };
    const input = buildCleanedMorphoPayload();
    input.data.subExecutionLogs[0].data.resultData.runData['Current Info'][0].data.main[0][0].json.allocationAndMarket[0].allocationData[0].asset = '';

    const result = await adaptAndValidateMorphoPayload(input, db as never);

    expect(result.decision.outcome).toBe('quarantined');
    expect(result.quarantineRecord).toBeDefined();
    expect(db.from).toHaveBeenCalled();
  });

  it('returns accepted payloads without quarantine writes', async () => {
    const db = {
      from: vi.fn(() => ({ insert: vi.fn(async () => ({ error: null })) })),
    };

    const result = await adaptAndValidateMorphoPayload(buildCleanedMorphoPayload(), db as never);

    expect(result.decision.outcome).toBe('accepted');
    expect(result.quarantineRecord).toBeUndefined();
    expect(db.from).not.toHaveBeenCalled();
  });
});
