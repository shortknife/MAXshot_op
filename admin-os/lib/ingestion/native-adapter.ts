import type {
  CanonicalAllocationRow,
  CanonicalIngestionPayload,
  CanonicalMarketRow,
  CanonicalRebalanceDecision,
  GateDecision,
} from './contract';
import { classifyEnvironment } from './environment';
import { quarantinePayload, type QuarantineRecord } from './quarantine';
import { evaluateQualityGate } from './quality-gate';

interface NativeCurrentInfo {
  chainName?: string;
  allocationAndMarket?: Array<{
    marketData?: Array<Record<string, unknown>>;
    allocationData?: Array<Record<string, unknown>>;
  }>;
  strategies?: Array<{
    workflowParams?: {
      gasCost?: number | null;
    };
  }>;
}

interface NativeSubExecution {
  data?: {
    resultData?: {
      runData?: Record<string, Array<{
        data?: {
          main?: Array<Array<{ json?: Record<string, unknown> }>>;
        };
      }>>;
    };
  };
}

interface NativeCleanedPayload {
  isSuccess?: boolean;
  status?: string;
  data?: {
    id?: string | number;
    workflowId?: string;
    status?: string;
    createdAt?: string;
    startedAt?: string | null;
    stoppedAt?: string | null;
    subExecutionLogs?: NativeSubExecution[];
  };
  _cleaned_meta?: Record<string, unknown>;
}

interface NativeStep11Shape {
  json_data?: Record<string, unknown>;
  cleaned_data?: NativeCleanedPayload;
}

export interface NativeAdaptResult {
  payload: CanonicalIngestionPayload;
  decision: GateDecision;
  quarantineRecord?: QuarantineRecord;
}

interface QuarantineWriter {
  from(table: string): {
    insert(payload: unknown): Promise<{ error: { message?: string } | null }>;
  };
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';
}

function asNullableString(value: unknown): string | null {
  const normalized = asString(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function firstNodeJson(subExec: NativeSubExecution | undefined, nodeName: string): Record<string, unknown> | undefined {
  return subExec?.data?.resultData?.runData?.[nodeName]?.[0]?.data?.main?.[0]?.[0]?.json;
}

function extractMarkets(currentInfo?: NativeCurrentInfo): CanonicalMarketRow[] {
  const chainName = asString(currentInfo?.chainName);
  const block = currentInfo?.allocationAndMarket?.[0];
  const marketData = Array.isArray(block?.marketData) ? block?.marketData : [];
  const gasCost = asNumber(currentInfo?.strategies?.[0]?.workflowParams?.gasCost);

  return marketData.map((market) => ({
    chain: asString(market.chain) || chainName,
    protocolName: asString(market.protocolName),
    market: asString(market.market),
    cap: asNumber(market.cap),
    tvl: asNumber(market.totalSupplied),
    baseApy: asNumber(market.supplyApy),
    netApy: asNumber(market.supplyApy),
    rewardApy: asNumber(market.rewardApy),
    estDepositGas: gasCost,
  }));
}

function extractAllocations(currentInfo?: NativeCurrentInfo): CanonicalAllocationRow[] {
  const chainName = asString(currentInfo?.chainName);
  const block = currentInfo?.allocationAndMarket?.[0];
  const allocationData = Array.isArray(block?.allocationData) ? block?.allocationData : [];

  return allocationData.map((alloc) => ({
    chain: asString(alloc.chain) || chainName,
    protocolName: asString(alloc.protocolName),
    market: asString(alloc.market),
    asset: asString(alloc.asset),
    totalAllocated: asNumber(alloc.totalAllocated),
    idleLiquidity: asNumber(alloc.idleLiquidity),
  }));
}

function extractRebalanceDecision(rebalanceCheck?: Record<string, unknown>): CanonicalRebalanceDecision | null {
  if (!rebalanceCheck) return null;

  const reason = asString(rebalanceCheck.reason) || 'No rebalancing needed';
  const waitingBlocked = asBoolean((rebalanceCheck.conditions as { waitingPeriodBlocked?: boolean } | undefined)?.waitingPeriodBlocked);
  const thresholdDetails = (rebalanceCheck.conditions as Record<string, unknown> | undefined) || null;

  return {
    rebalanceNeeded: asBoolean(rebalanceCheck.rebalanceNeeded),
    rebalanceReason: reason,
    is_blocked: waitingBlocked || reason.toLowerCase().includes('waiting period'),
    threshold_details: thresholdDetails,
  };
}

function normalizeSource(input: NativeCleanedPayload | NativeStep11Shape): {
  cleaned: NativeCleanedPayload;
  jsonData: Record<string, unknown> | null;
} {
  if ('cleaned_data' in input || 'json_data' in input) {
    return {
      cleaned: (input as NativeStep11Shape).cleaned_data || {},
      jsonData: (input as NativeStep11Shape).json_data || null,
    };
  }

  return {
    cleaned: input as NativeCleanedPayload,
    jsonData: null,
  };
}

export function adaptNativePayload(input: NativeCleanedPayload | NativeStep11Shape): CanonicalIngestionPayload {
  const { cleaned, jsonData } = normalizeSource(input);
  const data = cleaned.data || {};
  const subExecutions = Array.isArray(data.subExecutionLogs) ? data.subExecutionLogs : [];

  let vaultName = asNullableString(jsonData?.vaultName);
  let rebalanceDecision: CanonicalRebalanceDecision | null = null;
  const markets: CanonicalMarketRow[] = [];
  const allocationData: CanonicalAllocationRow[] = [];

  for (const subExec of subExecutions) {
    const summary = firstNodeJson(subExec, 'Summary');
    const rebalanceCheck = firstNodeJson(subExec, 'Rebalance Check');
    const currentInfo = firstNodeJson(subExec, 'Current Info') as NativeCurrentInfo | undefined;

    if (!vaultName && summary?.name) {
      vaultName = asNullableString(summary.name);
    }

    if (!rebalanceDecision && rebalanceCheck) {
      rebalanceDecision = extractRebalanceDecision(rebalanceCheck);
    }

    if (currentInfo) {
      markets.push(...extractMarkets(currentInfo));
      allocationData.push(...extractAllocations(currentInfo));
    }
  }

  const workflowId = asString(jsonData?.workflowId) || asString(data.workflowId);
  const environment = classifyEnvironment([
    vaultName,
    workflowId,
    ...markets.flatMap((row) => [row.chain, row.market, row.protocolName]),
  ]);

  return {
    source_system: 'native',
    source_workflow_name: 'native-clean-log',
    source_execution_ref: asString(data.id) || workflowId,
    environment,
    workflowId,
    status: asString(jsonData?.status) || asString(data.status) || asString(cleaned.status) || 'unknown',
    createdAt: asString(jsonData?.createdAt) || asString(data.createdAt) || new Date().toISOString(),
    startedAt: asNullableString(jsonData?.startedAt) || asNullableString(data.startedAt),
    stoppedAt: asNullableString(jsonData?.stoppedAt) || asNullableString(data.stoppedAt),
    vaultName,
    markets,
    allocationData,
    rebalanceDecision,
    is_critical_event: asBoolean(jsonData?.is_critical_event),
    critical_reason: asNullableString(jsonData?.debug_reason) || asNullableString(jsonData?.critical_reason),
    raw_archive_ref: null,
    adapter_meta: {
      source_shape: jsonData ? 'step11' : 'cleaned',
      sub_execution_count: subExecutions.length,
      cleaned_status: cleaned.status || null,
      cleaned_success: cleaned.isSuccess ?? null,
      cleaned_meta: cleaned._cleaned_meta || null,
    },
  };
}

export async function adaptAndValidateNativePayload(
  input: NativeCleanedPayload | NativeStep11Shape,
  db?: QuarantineWriter,
): Promise<NativeAdaptResult> {
  const payload = adaptNativePayload(input);
  const decision = evaluateQualityGate(payload);

  if (decision.outcome === 'quarantined') {
    const quarantineRecord = await quarantinePayload(payload, decision, db as never);
    return { payload, decision, quarantineRecord };
  }

  return { payload, decision };
}
