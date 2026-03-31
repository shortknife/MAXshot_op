import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const maybeSingle = vi.fn()
  const updateEq = vi.fn()
  const update = vi.fn(() => ({ eq: updateEq }))
  const eq = vi.fn(() => ({ maybeSingle, update }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select, update }))
  return { maybeSingle, updateEq, update, eq, select, from }
})

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mocks.from },
}))

import { AuditLogger } from '@/lib/router/audit-logging'

describe('AuditLogger', () => {
  beforeEach(() => {
    mocks.maybeSingle.mockReset()
    mocks.updateEq.mockReset()
    mocks.update.mockClear()
    mocks.eq.mockClear()
    mocks.select.mockClear()
    mocks.from.mockClear()
    AuditLogger.getInstance().clear()
  })

  it('keeps pending buffers isolated per execution', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({
      data: { audit_log: { execution_id: 'exec-1', events: [], created_at: '2026-03-29T00:00:00.000Z' } },
      error: null,
    })
    mocks.updateEq.mockResolvedValue({ error: null })

    const logger = AuditLogger.getInstance()
    logger.log('router_start', { execution_id: 'exec-1', status: 'confirmed' })
    logger.log('router_start', { execution_id: 'exec-2', status: 'confirmed' })

    await logger.flush('exec-1')

    expect(mocks.update).toHaveBeenCalledTimes(1)
    const payload = mocks.update.mock.calls[0]?.[0] as { audit_log: { events: Array<{ data?: { execution_id?: string } }> } }
    expect(payload.audit_log.events).toHaveLength(1)
    expect(payload.audit_log.events[0]?.data?.execution_id).toBe('exec-1')
  })

  it('keeps pending buffer when audit_log update fails', async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { audit_log: { execution_id: 'exec-1', events: [], created_at: '2026-03-29T00:00:00.000Z' } },
      error: null,
    })
    mocks.updateEq.mockResolvedValueOnce({ error: { message: 'db down' } })
    mocks.updateEq.mockResolvedValueOnce({ error: null })

    const logger = AuditLogger.getInstance()
    logger.log('router_start', { execution_id: 'exec-1', status: 'confirmed' })

    await expect(logger.flush('exec-1')).rejects.toThrow('Failed to update audit_log: db down')

    await logger.flush('exec-1')

    expect(mocks.update).toHaveBeenCalledTimes(2)
    const payload = mocks.update.mock.calls[1]?.[0] as { audit_log: { events: Array<{ data?: { execution_id?: string } }> } }
    expect(payload.audit_log.events).toHaveLength(1)
    expect(payload.audit_log.events[0]?.data?.execution_id).toBe('exec-1')
  })
})
