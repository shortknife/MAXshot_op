import { describe, expect, it } from 'vitest'

import { loadCustomerWorkspacePreset } from '@/lib/customers/workspace'

describe('customer workspace preset', () => {
  it('loads filesystem-managed workspace preset for maxshot', async () => {
    const preset = await loadCustomerWorkspacePreset('maxshot')
    expect(preset?.customer_id).toBe('maxshot')
    expect(preset?.primary_plane).toBe('ops_data')
    expect(preset?.focused_surfaces).toContain('kb-management')
    expect(preset?.quick_queries.length).toBeGreaterThan(0)
  })

  it('returns null for unknown customer', async () => {
    await expect(loadCustomerWorkspacePreset('unknown-customer')).resolves.toBeNull()
  })
})
