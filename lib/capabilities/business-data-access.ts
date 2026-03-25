import { supabase } from '@/lib/supabase'

type RpcArgs = Record<string, unknown>

export async function businessRpc(name: string, args?: RpcArgs) {
  return supabase.rpc(name, args || {})
}

export async function businessSelect(table: string, limit: number) {
  return supabase.from(table).select('*').limit(limit)
}

export async function businessSelectLatestByCreatedAt(table: string, limit: number) {
  return supabase.from(table).select('*').order('created_at', { ascending: false }).limit(limit)
}

export async function businessSelectLatestByFreshness(table: string, limit: number) {
  return supabase
    .from(table)
    .select('*')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false, nullsFirst: false })
    .limit(limit)
}

export async function findExecutionByExecutionIdOrId(executionId: string) {
  const byId = await supabase.from('executions').select('*').eq('id', executionId).limit(1)
  if ((byId.data || []).length > 0 || byId.error) return byId
  return supabase.from('executions').select('*').eq('n8n_execution_id', executionId).limit(1)
}

export async function findAllocationExecutionIdsByVaultKeyword(keyword: string) {
  return supabase
    .from('allocation_snapshots')
    .select('execution_id')
    .ilike('vault_name', `%${keyword}%`)
    .limit(5000)
}

export async function queryMarketMetricsSince(sinceIso: string) {
  return supabase
    .from('market_metrics')
    .select('execution_id, chain, protocol, market_name, net_apy, base_apy, tvl, created_at')
    .gte('created_at', sinceIso)
    .limit(10000)
}

export async function queryMarketMetricsBetween(fromIso: string, toIso: string) {
  return supabase
    .from('market_metrics')
    .select('execution_id, chain, protocol, market_name, net_apy, base_apy, tvl, created_at')
    .gte('created_at', fromIso)
    .lte('created_at', toIso)
    .limit(10000)
}
