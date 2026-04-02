import { loadFaqReviewQueueRuntime } from '@/lib/faq-kb/review-queue'
import { FaqReviewSurface } from '@/components/faq-review/review-surface'

export const dynamic = 'force-dynamic'

export default async function FaqReviewPage() {
  const reviewQueue = await loadFaqReviewQueueRuntime()

  return (
    <FaqReviewSurface
      queueId={reviewQueue.queue_id}
      queueSource={reviewQueue.source}
      items={reviewQueue.items}
    />
  )
}
