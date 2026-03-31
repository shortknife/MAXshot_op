export type PerfLogMeta = Record<string, unknown>

function nowMs(): number {
  return Date.now()
}

function shouldLogPerf(): boolean {
  return process.env.NODE_ENV !== 'test'
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

function truncate(value: string, max = 120): string {
  const text = String(value || '')
  return text.length > max ? `${text.slice(0, max)}...` : text
}

export function createPerfTrace(label: string, meta: PerfLogMeta = {}) {
  const traceId = `${label}-${nowMs()}-${Math.random().toString(36).slice(2, 8)}`
  const startedAt = nowMs()
  const stages: Array<{ stage: string; elapsed_ms: number }> = []

  const emit = (event: string, payload: PerfLogMeta = {}) => {
    if (!shouldLogPerf()) return
    console.info(
      '[perf]',
      JSON.stringify({
        trace_id: traceId,
        label,
        event,
        elapsed_ms: nowMs() - startedAt,
        ...meta,
        ...payload,
      })
    )
  }

  emit('start')

  return {
    traceId,
    stage(stage: string, payload: PerfLogMeta = {}) {
      const elapsed = nowMs() - startedAt
      stages.push({ stage, elapsed_ms: elapsed })
      emit('stage', { stage, stage_elapsed_ms: elapsed, ...payload })
    },
    async measure<T>(stage: string, fn: () => Promise<T> | T, payload: PerfLogMeta = {}): Promise<T> {
      const stageStartedAt = nowMs()
      try {
        const result = await fn()
        const durationMs = nowMs() - stageStartedAt
        const totalElapsed = nowMs() - startedAt
        stages.push({ stage, elapsed_ms: totalElapsed })
        emit('stage', { stage, stage_duration_ms: durationMs, stage_elapsed_ms: totalElapsed, ...payload })
        return result
      } catch (error) {
        const durationMs = nowMs() - stageStartedAt
        emit('stage_error', {
          stage,
          stage_duration_ms: durationMs,
          error: safeErrorMessage(error),
          ...payload,
        })
        throw error
      }
    },
    finish(payload: PerfLogMeta = {}) {
      emit('finish', { stages, ...payload })
    },
    fail(error: unknown, payload: PerfLogMeta = {}) {
      emit('fail', { error: safeErrorMessage(error), stages, ...payload })
    },
  }
}

export function buildPerfQueryMeta(rawQuery: string, extras: PerfLogMeta = {}): PerfLogMeta {
  return {
    query_preview: truncate(String(rawQuery || '').trim()),
    ...extras,
  }
}
