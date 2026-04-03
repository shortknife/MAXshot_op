import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  insert: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  deleteEq: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mocks.from,
  },
}))

import { acquireWriteLane, releaseWriteLane } from '@/lib/router/write-lane'

beforeEach(() => {
  mocks.from.mockReset()
  mocks.insert.mockReset()
  mocks.delete.mockReset()
  mocks.eq.mockReset()
  mocks.deleteEq.mockReset()
})

describe('write lane runtime', () => {
  it('acquires serialized lane for kb upload qc', async () => {
    mocks.from.mockReturnValue({
      insert: mocks.insert.mockResolvedValue({ error: null }),
    })

    const lease = await acquireWriteLane({
      capabilityId: 'capability.kb_upload_qc',
      customerId: 'maxshot',
      operatorId: 'maxshot-ops',
    })

    expect(lease?.lane_key).toBe('kb_source_inventory:maxshot')
    expect(lease?.mutation_scope).toBe('kb_source_inventory')
  })

  it('throws busy when duplicate lane exists', async () => {
    mocks.from.mockReturnValue({
      insert: mocks.insert.mockResolvedValue({ error: { code: '23505', message: 'duplicate key value violates unique constraint' } }),
    })

    await expect(acquireWriteLane({
      capabilityId: 'capability.kb_upload_qc',
      customerId: 'maxshot',
      operatorId: 'maxshot-ops',
    })).rejects.toThrow('write_lane_busy')
  })

  it('releases lane lease', async () => {
    mocks.from.mockReturnValue({
      delete: mocks.delete.mockReturnValue({
        eq: mocks.eq.mockReturnValue({
          eq: mocks.deleteEq.mockResolvedValue({ error: null }),
        }),
      }),
    })

    await releaseWriteLane({
      lane_key: 'kb_source_inventory:maxshot',
      lease_id: 'lane-1',
      capability_id: 'capability.kb_upload_qc',
      mutation_scope: 'kb_source_inventory',
      customer_id: 'maxshot',
      operator_id: 'maxshot-ops',
    })

    expect(mocks.delete).toHaveBeenCalled()
  })
})
