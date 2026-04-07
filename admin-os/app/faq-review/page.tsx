import { loadFaqReviewQueueRuntime } from '@/lib/faq-kb/review-queue'
import { decorateWithCustomerPolicyEvidence } from '@/lib/customers/runtime-policy'
import { FaqReviewSurface } from '@/components/faq-review/review-surface'

export const dynamic = 'force-dynamic'

export default async function FaqReviewPage() {
  const reviewQueue = await loadFaqReviewQueueRuntime()
  const items = await decorateWithCustomerPolicyEvidence(reviewQueue.items)

  return (
    <FaqReviewSurface
      queueId={reviewQueue.queue_id}
      queueSource={reviewQueue.source}
      items={items}
    />
  )
}
