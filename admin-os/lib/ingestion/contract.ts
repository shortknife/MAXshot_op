export type SourceSystem = 'native' | 'morpho';
export type IngestionEnvironment = 'prod' | 'staging' | 'test' | 'unknown';
export type GateSeverity = 'error' | 'warning' | 'info';
export type GateOutcome = 'accepted' | 'accepted_with_warnings' | 'quarantined';

export interface CanonicalMarketRow {
  chain: string;
  protocolName: string;
  market: string;
  cap?: number | null;
  tvl?: number | null;
  baseApy?: number | null;
  netApy?: number | null;
  rewardApy?: number | null;
  estDepositGas?: number | null;
}

export interface CanonicalAllocationRow {
  chain: string;
  protocolName: string;
  market: string;
  asset: string;
  totalAllocated?: number | null;
  idleLiquidity?: number | null;
}

export interface CanonicalRebalanceDecision {
  rebalanceNeeded: boolean;
  rebalanceReason: string;
  is_blocked: boolean;
  threshold_details?: Record<string, unknown> | null;
}

export interface CanonicalIngestionPayload {
  source_system: SourceSystem;
  source_workflow_name?: string;
  source_execution_ref: string;
  environment: IngestionEnvironment;
  workflowId: string;
  status: string;
  createdAt: string;
  startedAt?: string | null;
  stoppedAt?: string | null;
  vaultName?: string | null;
  markets: CanonicalMarketRow[];
  allocationData: CanonicalAllocationRow[];
  rebalanceDecision?: CanonicalRebalanceDecision | null;
  is_critical_event: boolean;
  critical_reason?: string | null;
  raw_archive_ref?: string | null;
  adapter_meta?: Record<string, unknown>;
}

export interface GateFinding {
  code: string;
  severity: GateSeverity;
  path: string;
  message: string;
}

export interface GateDecision {
  outcome: GateOutcome;
  findings: GateFinding[];
}


export interface QuarantineReason {
  code: string;
  severity: GateSeverity;
  path: string;
  message: string;
}
