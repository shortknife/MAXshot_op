import { describe, expect, it } from 'vitest';

import { classifyEnvironment } from '../environment';
import { evaluateQualityGate } from '../quality-gate';
import type { CanonicalIngestionPayload } from '../contract';

function buildPayload(overrides: Partial<CanonicalIngestionPayload> = {}): CanonicalIngestionPayload {
  return {
    source_system: 'native',
    source_execution_ref: 'src-123',
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
    ...overrides,
  };
}

describe('classifyEnvironment', () => {
  it('classifies test markers before prod', () => {
    expect(classifyEnvironment(['USDC Staging Testnet - Best Yield', 'base-sepolia'])).toBe('test');
  });

  it('classifies staging markers', () => {
    expect(classifyEnvironment(['USDC staging vault'])).toBe('staging');
  });
});

describe('evaluateQualityGate', () => {
  it('accepts a valid canonical payload', () => {
    const decision = evaluateQualityGate(buildPayload());
    expect(decision.outcome).toBe('accepted');
  });

  it('quarantines payloads with empty market name', () => {
    const decision = evaluateQualityGate(buildPayload({ markets: [{ chain: 'base', protocolName: 'Morpho', market: '' }] } as Partial<CanonicalIngestionPayload>));
    expect(decision.outcome).toBe('quarantined');
    expect(decision.findings.some((f) => f.code === 'missing_market_name')).toBe(true);
  });

  it('quarantines payloads with missing vault name', () => {
    const decision = evaluateQualityGate(buildPayload({ vaultName: '' }));
    expect(decision.outcome).toBe('quarantined');
    expect(decision.findings.some((f) => f.code === 'missing_vault_name')).toBe(true);
  });

  it('accepts idle liquidity allocation rows without protocolName', () => {
    const decision = evaluateQualityGate(
      buildPayload({
        allocationData: [
          { chain: 'ethereum', protocolName: 'Morpho', market: 'Maxshot USDC V2', asset: 'USDC', totalAllocated: 100 },
          { chain: 'ethereum', protocolName: '', market: 'Idle Liquidity', asset: 'USDC', idleLiquidity: 3.14, totalAllocated: 0 },
        ],
      }),
    );
    expect(decision.outcome).toBe('accepted');
    expect(decision.findings.some((f) => f.code === 'missing_allocation_protocol')).toBe(false);
  });
});
