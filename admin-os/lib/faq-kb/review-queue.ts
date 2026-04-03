import { supabase } from '@/lib/supabase'
import { loadFaqReviewQueue, type FaqReviewQueueItem } from '@/lib/faq-kb/loaders'
import { assertOperatorCustomerAccess } from '@/lib/customers/access'
import { assertCapabilityMutationPolicy } from '@/lib/router/capability-policy'

const FAQ_REVIEW_QUEUE_TABLE = 'faq_review_queue_op'
const FAQ_REVIEW_QUEUE_ID = 'faq_review_queue_runtime_v1'
const FAQ_REVIEW_QUEUE_LIMIT = 100

export type FaqReviewQueueRuntime = {
  queue_id: string
  source: 'supabase' | 'seed'
  items: FaqReviewQueueItem[]
}

export type FaqReviewQueueAction = 'approve' | 'reject' | 'resolve'

const FAQ_REVIEW_TRANSITIONS: Record<FaqReviewQueueAction, { from: string[]; to: string }> = {
  approve: { from: ['prepared'], to: 'approved' },
  reject: { from: ['prepared'], to: 'rejected' },
  resolve: { from: ['approved'], to: 'resolved' },
}

type ReviewQueueRow = {
  review_id: string
  question: string
  reason: string
  priority: 'high' | 'normal'
  queue_status: string
  customer_id: string | null
  kb_scope: string | null
  channel: string | null
  confidence: number | null
  created_at: string
  draft_answer: string | null
  citations: unknown
}

type EnqueueParams = {
  question: string
  reason: string
  priority: 'high' | 'normal'
  queue_status?: string
  kb_scope?: string | null
  channel?: string | null
  confidence?: number | null
  draft_answer?: string | null
  citations?: Array<{ source_id?: string; title?: string; snippet?: string }>
  customer_id?: string | null
  customer_context?: string | null
  source_capability?: string | null
}

function buildReviewId(): string {
  return `faq-review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function isRecoverableQueueError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '')
  return (
    message.includes('Missing Supabase environment variables') ||
    message.includes('faq_review_queue_op') ||
    message.includes('relation') ||
    message.includes('does not exist') ||
    message.includes('PGRST')
  )
}

function normalizeCitations(value: unknown): Array<{ source_id?: string; title?: string; snippet?: string }> {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') as Array<{ source_id?: string; title?: string; snippet?: string }> : []
}

function toQueueItem(row: ReviewQueueRow): FaqReviewQueueItem {
  return {
    review_id: row.review_id,
    question: row.question,
    reason: row.reason,
    priority: row.priority,
    queue_status: row.queue_status,
    customer_id: row.customer_id,
    kb_scope: row.kb_scope,
    channel: row.channel,
    confidence: typeof row.confidence === 'number' ? row.confidence : null,
    created_at: row.created_at,
    draft_answer: row.draft_answer,
    citations: normalizeCitations(row.citations),
  }
}

export function isValidFaqReviewAction(action: string): action is FaqReviewQueueAction {
  return action === 'approve' || action === 'reject' || action === 'resolve'
}

export async function loadFaqReviewQueueRuntime(): Promise<FaqReviewQueueRuntime> {
  try {
    const { data, error } = await supabase
      .from(FAQ_REVIEW_QUEUE_TABLE)
      .select('review_id,question,reason,priority,queue_status,customer_id,kb_scope,channel,confidence,created_at,draft_answer,citations')
      .order('created_at', { ascending: false })
      .limit(FAQ_REVIEW_QUEUE_LIMIT)

    if (error) throw error

    if (Array.isArray(data) && data.length > 0) {
      return {
        queue_id: FAQ_REVIEW_QUEUE_ID,
        source: 'supabase',
        items: data.map((row) => toQueueItem(row as ReviewQueueRow)),
      }
    }
  } catch (error) {
    if (!isRecoverableQueueError(error)) throw error
  }

  const seed = loadFaqReviewQueue()
  return {
    queue_id: seed.queue_id,
    source: 'seed',
    items: seed.items,
  }
}

export async function enqueueFaqReviewItem(params: EnqueueParams): Promise<{ review_id: string; queue_source: 'supabase' } | null> {
  const reviewId = buildReviewId()
  const payload = {
    review_id: reviewId,
    question: params.question,
    reason: params.reason,
    priority: params.priority,
    queue_status: params.queue_status || 'prepared',
    customer_id: params.customer_id || null,
    kb_scope: params.kb_scope || null,
    channel: params.channel || null,
    confidence: typeof params.confidence === 'number' ? params.confidence : null,
    created_at: new Date().toISOString(),
    draft_answer: params.draft_answer || null,
    citations: params.citations || [],
    customer_context: params.customer_context || null,
    source_capability: params.source_capability || 'capability.faq_qa_review',
  }

  try {
    const { error } = await supabase.from(FAQ_REVIEW_QUEUE_TABLE).insert(payload)
    if (error) throw error
    return { review_id: reviewId, queue_source: 'supabase' }
  } catch (error) {
    if (!isRecoverableQueueError(error)) throw error
    return null
  }
}

export async function transitionFaqReviewItem(params: {
  review_id: string
  action: FaqReviewQueueAction
  operator_id: string
}): Promise<{ review_id: string; previous_status: string; queue_status: string; queue_source: 'supabase' } | null> {
  const transition = FAQ_REVIEW_TRANSITIONS[params.action]

  try {
    const { data: existing, error: loadError } = await supabase
      .from(FAQ_REVIEW_QUEUE_TABLE)
.select('review_id,queue_status,customer_id')
      .eq('review_id', params.review_id)
      .maybeSingle()

    if (loadError) throw loadError
    if (!existing) return null

    const previousStatus = String((existing as { queue_status?: string }).queue_status || '')
    const customerId = typeof (existing as { customer_id?: string | null }).customer_id === 'string' ? (existing as { customer_id?: string | null }).customer_id : null
    assertCapabilityMutationPolicy({ capabilityId: 'capability.faq_qa_review', customerId })
    assertOperatorCustomerAccess({ operatorId: params.operator_id, customerId })
    if (!transition.from.includes(previousStatus)) {
      throw new Error(`invalid_transition:${previousStatus}->${transition.to}`)
    }

    const { data: updated, error: updateError } = await supabase
      .from(FAQ_REVIEW_QUEUE_TABLE)
      .update({ queue_status: transition.to })
      .eq('review_id', params.review_id)
.select('review_id,queue_status,customer_id')
      .single()

    if (updateError) throw updateError

    return {
      review_id: String((updated as { review_id?: string }).review_id || params.review_id),
      previous_status: previousStatus,
      queue_status: String((updated as { queue_status?: string }).queue_status || transition.to),
      queue_source: 'supabase',
    }
  } catch (error) {
    if (!isRecoverableQueueError(error)) throw error
    return null
  }
}
