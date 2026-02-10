import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { computeWeightRecommendation } from '../../../../../server-actions/memory/weight-recommendation'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const memoryId = body?.memory_id as string | undefined
    const sourceExecutionId = body?.source_execution_id as string | undefined
    const attribution = body?.attribution

    if (!memoryId || !sourceExecutionId || !attribution) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
    }

    const { data: memoryRow, error: memoryError } = await supabase
      .from('agent_memories_op')
      .select('id, type, weight, confidence, source_execution_id')
      .eq('id', memoryId)
      .maybeSingle()

    if (memoryError || !memoryRow) {
      return NextResponse.json({ error: 'memory_not_found' }, { status: 404 })
    }

    const { data: latestRow } = await supabase
      .from('agent_memories_op')
      .select('id, weight, created_at')
      .eq('type', memoryRow.type)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: execRow, error: execError } = await supabase
      .from('task_executions_op')
      .select('audit_log')
      .eq('execution_id', sourceExecutionId)
      .maybeSingle()

    if (execError) {
      return NextResponse.json({ error: 'audit_log_load_failed' }, { status: 500 })
    }

    const events = (execRow?.audit_log?.events || []) as Array<{ event_type?: string }>
    const verificationCount = events.filter((e) => e.event_type === 'memory_writeback_approved' || e.event_type === 'memory_weight_adjustment_applied').length

    const currentWeight = Number(latestRow?.weight ?? memoryRow.weight ?? 0.5)
    const recommendation = computeWeightRecommendation({
      current_weight: currentWeight,
      confidence: memoryRow.confidence ?? null,
      verification_count: verificationCount,
      attribution,
    })

    return NextResponse.json({
      memory: { id: memoryRow.id, type: memoryRow.type, weight: memoryRow.weight, confidence: memoryRow.confidence },
      latest_weight: currentWeight,
      latest_memory_id: latestRow?.id || memoryRow.id,
      verification_count: verificationCount,
      recommendation,
    })
  } catch {
    return NextResponse.json({ error: 'recommendation_failed' }, { status: 500 })
  }
}
