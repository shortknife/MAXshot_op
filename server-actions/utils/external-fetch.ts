type FetchJsonResult = {
  ok: boolean
  status?: number
  json?: unknown
  error?: string
}

const DEFAULT_TIMEOUT_MS = 5000

const ALLOWED_HOSTS = new Set<string>(['api.coingecko.com'])

export function isAllowedExternalHost(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && ALLOWED_HOSTS.has(parsed.hostname)
  } catch {
    return false
  }
}

export async function fetchExternalJson(
  url: string,
  { timeoutMs = DEFAULT_TIMEOUT_MS }: { timeoutMs?: number } = {},
): Promise<FetchJsonResult> {
  if (!isAllowedExternalHost(url)) {
    return { ok: false, error: 'external_host_not_allowed' }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { method: 'GET', signal: controller.signal })
    if (!res.ok) {
      return { ok: false, status: res.status, error: 'external_api_error' }
    }
    const json = await res.json()
    return { ok: true, status: res.status, json }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'fetch_error'
    if (message.toLowerCase().includes('aborted')) {
      return { ok: false, error: 'fetch_timeout' }
    }
    return { ok: false, error: 'fetch_failed' }
  } finally {
    clearTimeout(timeout)
  }
}
