export function isTransientErrorMessage(msg: string): boolean {
  const t = String(msg || '').toLowerCase()
  return (
    t.includes('fetch failed') ||
    t.includes('network') ||
    t.includes('timeout') ||
    t.includes('econnreset') ||
    t.includes('econnrefused') ||
    t.includes('temporarily unavailable')
  )
}

export function buildWithRetry(attempts: number) {
  return async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastErr: unknown = null
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn()
      } catch (err) {
        lastErr = err
        const msg = err instanceof Error ? err.message : String(err)
        if (!isTransientErrorMessage(msg) || i === attempts - 1) break
        await new Promise((r) => setTimeout(r, 120))
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr || 'retry_failed'))
  }
}
