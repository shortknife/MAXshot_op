import { supabase } from '../supabase';
import type { CanonicalIngestionPayload } from './contract';

export const PROCESS_LOG_DATA_RPC = 'process_log_data_v4';

export interface FactWriteResult {
  success: boolean;
  execution_id: string;
  message?: string;
  raw_response: unknown;
}

interface RpcResult {
  data: { success?: boolean; execution_id?: string; message?: string } | null;
  error: { message?: string } | null;
}

interface RpcCapable {
  rpc(name: string, args: Record<string, unknown>): Promise<RpcResult>;
}

export function buildRpcJsonData(payload: CanonicalIngestionPayload): Record<string, unknown> {
  return {
    workflowId: payload.workflowId,
    status: payload.status,
    createdAt: payload.createdAt,
    startedAt: payload.startedAt,
    stoppedAt: payload.stoppedAt,
    vaultName: payload.vaultName,
    markets: payload.markets,
    allocationData: payload.allocationData,
    rebalanceDecision: payload.rebalanceDecision || {
      rebalanceNeeded: false,
      rebalanceReason: 'No rebalancing data available',
      is_blocked: false,
      threshold_details: null,
    },
  };
}

export async function writeCanonicalFacts(
  payload: CanonicalIngestionPayload,
  db: RpcCapable = supabase,
): Promise<FactWriteResult> {
  const json_data = buildRpcJsonData(payload);
  const { data, error } = await db.rpc(PROCESS_LOG_DATA_RPC, { json_data });

  if (error) {
    throw new Error(`fact_write_rpc_failed:${error.message || 'unknown_error'}`);
  }

  if (!data?.success || !data.execution_id) {
    throw new Error(`fact_write_invalid_rpc_response:${JSON.stringify(data || null)}`);
  }

  return {
    success: true,
    execution_id: data.execution_id,
    message: data.message,
    raw_response: data,
  };
}
