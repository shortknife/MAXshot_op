const ALLOWED_EXTERNAL_HOSTS = [
  'api.coingecko.com',
]

export function isAllowedExternalHost(url: string) {
  try {
    const parsed = new URL(url)
    return ALLOWED_EXTERNAL_HOSTS.includes(parsed.host)
  } catch {
    return false
  }
}

export async function fetchExternalJson(url: string) {
  try {
    const response = await fetch(url)
    const json = await response.json()
    return { ok: response.ok, status: response.status, json }
  } catch (error) {
    return { ok: false, status: 500, json: null, error: error instanceof Error ? error.message : String(error) }
  }
}
