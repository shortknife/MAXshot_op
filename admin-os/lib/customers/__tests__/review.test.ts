import { describe, expect, it } from 'vitest'
import { loadCustomerReviewPosture } from '@/lib/customers/review'

describe('customer review posture loader', () => {
  it('loads filesystem-managed review posture', async () => {
    const posture = await loadCustomerReviewPosture('nexa-demo')

    expect(posture).toMatchObject({
      customer_id: 'nexa-demo',
      escalation_style: 'guided',
      default_priority: 'normal',
      review_queue_label: 'Guided Demo Review',
    })
    expect(posture?.suggested_actions.length).toBeGreaterThan(0)
  })
})
