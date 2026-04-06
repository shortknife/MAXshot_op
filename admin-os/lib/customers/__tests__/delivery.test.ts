import { describe, expect, it } from 'vitest'
import { loadCustomerDeliveryPosture } from '@/lib/customers/delivery'

describe('customer delivery posture loader', () => {
  it('loads filesystem-managed delivery posture', async () => {
    const posture = await loadCustomerDeliveryPosture('nexa-demo')

    expect(posture).toMatchObject({
      customer_id: 'nexa-demo',
      summary_style: 'explainer',
      next_action_style: 'guided',
      review_copy_style: 'customer',
      citation_density: 'balanced',
    })
    expect(posture?.default_next_actions.length).toBeGreaterThan(0)
    expect(posture?.review_next_actions.length).toBeGreaterThan(0)
  })
})
