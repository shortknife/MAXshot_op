import { supabase } from '@/lib/supabase'

export async function fetchVaultOptions(limit = 5): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('dim_vaults')
      .select('vault_name')
      .limit(200)
    if (error || !Array.isArray(data)) return []
    const names = Array.from(
      new Set(
        data
          .map((row) => String((row as { vault_name?: string }).vault_name || '').trim())
          .filter(Boolean)
          .filter((name) => !/(testnet|devnet|staging|sandbox|\btest\b)/i.test(name))
      )
    )
    return names.slice(0, limit)
  } catch {
    return []
  }
}

export function extractMentionedVault(rawQuery: string, vaultOptions: string[]): string | null {
  const text = rawQuery.toLowerCase()
  const matched = vaultOptions.find((name) => name && text.includes(name.toLowerCase()))
  return matched || null
}

export function buildYieldDrilldownActions(
  rows: Array<Record<string, unknown>>,
  filters: { chain?: string; protocol?: string } | undefined,
  vaultOptions: string[]
): string[] {
  const chains = Array.from(
    new Set(rows.map((row) => String(row.chain || row.chain_name || '').trim()).filter(Boolean))
  ).slice(0, 3)
  const protocols = Array.from(
    new Set(rows.map((row) => String(row.protocol || row.protocol_name || '').trim()).filter(Boolean))
  ).slice(0, 3)
  const vaults = vaultOptions.slice(0, 3)

  if (!filters?.chain && chains.length) return chains.map((value) => `例如：看 ${value} 的 APY`)
  if (!filters?.protocol && protocols.length) return protocols.map((value) => `例如：看 ${value} 的 APY`)
  if (vaults.length) return vaults.map((value) => `例如：看 ${value} 的 APY`)
  return ['例如：看最近7天的 APY', '例如：看最近30天的 APY', '例如：看今天的实时 APY']
}

