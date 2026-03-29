import { describe, it, expect } from 'vitest'
import { isValidMemoryType, buildWritebackEvents, buildMemoryInsert } from '../writeback'

describe('memory writeback helpers', () => {
  it('validates memory types', () => {
    expect(isValidMemoryType('foundation')).toBe(true)
    expect(isValidMemoryType('experience')).toBe(true)
    expect(isValidMemoryType('insight')).toBe(true)
    expect(isValidMemoryType('invalid')).toBe(false)
  })

  it('builds audit events', () => {
    const events = buildWritebackEvents({ execution_id: 'exec-1', memory_type: 'insight', operator_id: 'op-1' })
    expect(events.length).toBe(3)
    expect(events[0].event_type).toBe('memory_writeback_requested')
    expect(events[2].event_type).toBe('memory_writeback_written')
  })

  it('builds memory insert payload', () => {
    const payload = buildMemoryInsert({ memory_type: 'experience', content: 'content', source_execution_id: 'exec-1' })
    expect(payload.type).toBe('experience')
    expect(payload.source_execution_id).toBe('exec-1')
  })
})
