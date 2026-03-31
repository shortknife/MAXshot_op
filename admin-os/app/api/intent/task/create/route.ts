import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { assertWriteEnabled } from '@/lib/utils';
import { randomUUID } from 'crypto';
import { buildAuditEvent } from '@/lib/router/audit-event';
import { assertSealable, buildSealedExecutionEnvelope, normalizeSealerGate } from '@/lib/router/sealed-execution';
import {
  getCapabilityDefinition,
  getPrimaryCapabilityId,
  inferPrimaryCapabilityIdFromIntentName,
  inferLegacyIntentTypeFromCapabilityIds,
  MAX_MATCHED_CAPABILITIES,
  normalizeCapabilityCandidates,
  resolveCapabilityIds,
} from '@/lib/router/capability-catalog';

/**
 * EM-T1 扩展：Sealer 统一写入 tasks_op + task_executions_op
 * 原 Ticket #3: /api/intent/task/create
 * 职责：严格校验 LLM 产出的 JSON，并"封印"至 tasks_op + task_executions_op 表（与 Integration Spec 1.4 对齐）。
 * 
 * EntryRequest 扩展入参（与 §6 对齐）：
 * - entry_type: raw_query | structured | timeline
 * - requester_id: 请求者标识
 * - intent_name: 意图名称
 * - entry_channel: telegram | admin_os | notion | system
 * - idempotency_key: 可选，用于幂等
 */
export async function POST(req: NextRequest) {
  try {
    let body = await req.json();
    let {
      task_id,
      payload,
      metadata,
      entry_type,
      requester_id,
      intent_name,
      matched_capability_ids,
      capability_binding,
      entry_channel,
      idempotency_key,
      require_confirmation,
      gate,
      confirmation_request,
      reason_for_pending,
      operator_id,
      confirm_token,
    } = body;

    
    try {
      assertWriteEnabled({ operatorId: operator_id, confirmToken: confirm_token })
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'write_blocked' }, { status: 403 });
    }
    // --- 强力包容性解析 (Resilient Parsing) ---
    // 如果 payload 整体是一个字符串，说明 external-orchestrator (disabled) 传过来的是未解析的 LLM 输出
    if (typeof payload === 'string' || (payload && typeof payload.intent === 'string' && payload.intent.includes('```'))) {
      try {
        const rawString = typeof payload === 'string' ? payload : JSON.stringify(payload);
        // 提取 Markdown 代码块或寻找第一个 {
        const jsonMatch = rawString.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          // 如果解析出来包含 intent/slots，则重写 payload
          if (parsed.intent || parsed.slots) {
            payload = parsed;
          }
        }
      } catch (e) {
        console.error('[Resilient Parsing Failed]:', e);
      }
    }

    // 1. EntryRequest 扩展字段校验（与 §6 对齐）
    const finalEntryType = entry_type || 'raw_query'; // 默认 raw_query（兼容现有 M2）
    const finalRequesterId = requester_id || metadata?.user_id || 'system_external-orchestrator (disabled)';
    const finalEntryChannel = entry_channel || metadata?.source || 'external-orchestrator (disabled)_v2';
    const finalTaskId = task_id || randomUUID();
    const finalGate = normalizeSealerGate(gate, require_confirmation === true);

    // 2. 严格校验 (The Seal)
    // 此时 payload 应该是已经被"掰正"的对象了
    const requestedCapabilityCandidates = normalizeCapabilityCandidates([
      ...(Array.isArray(matched_capability_ids) ? matched_capability_ids : []),
      ...(Array.isArray(payload?.matched_capability_ids) ? payload.matched_capability_ids : []),
      ...(Array.isArray(payload?.extracted_slots?.matched_capability_ids) ? payload.extracted_slots.matched_capability_ids : []),
      capability_binding?.capability_id,
      payload?.matched_capability_id,
      payload?.extracted_slots?.matched_capability_id,
    ])
    if (requestedCapabilityCandidates.length > MAX_MATCHED_CAPABILITIES) {
      return NextResponse.json(
        {
          error: 'too_many_capability_matches',
          details: `At most ${MAX_MATCHED_CAPABILITIES} capability matches are allowed before task sealing.`,
          requested_capability_candidates: requestedCapabilityCandidates,
        },
        { status: 400 }
      );
    }
    const finalIntent =
      intent_name ||
      payload?.intent ||
      payload?.extracted_slots?.intent ||
      inferLegacyIntentTypeFromCapabilityIds(requestedCapabilityCandidates);
    const inferredPrimaryCapabilityId =
      inferPrimaryCapabilityIdFromIntentName(finalIntent) ||
      (capability_binding?.capability_id ? String(capability_binding.capability_id) : null)
    const finalMatchedCapabilityIds = resolveCapabilityIds(
      [...requestedCapabilityCandidates, inferredPrimaryCapabilityId],
      MAX_MATCHED_CAPABILITIES
    )
    const primaryCapabilityId =
      getPrimaryCapabilityId([inferredPrimaryCapabilityId, ...finalMatchedCapabilityIds]) ||
      inferredPrimaryCapabilityId
    const primaryCapability = primaryCapabilityId ? getCapabilityDefinition(primaryCapabilityId) : null
    const finalSlots = payload?.slots || payload?.extracted_slots || {};

    const sealability = assertSealable({
      gate: finalGate,
      intentName: String(finalIntent || ''),
      inScope: finalSlots?.in_scope !== false,
    });
    if (!sealability.ok) {
      return NextResponse.json({
        error: sealability.error,
        details: sealability.details,
        gate_result: finalGate.gate_result,
        blocking_fields: sealability.blocking_fields || [],
      }, { status: sealability.status });
    }

    if (!finalIntent) {
      return NextResponse.json({ 
        error: 'Invalid Payload. Could not extract intent from LLM output.',
        received: payload
      }, { status: 400 });
    }

    // 3. idempotency 检查（方案 A：task_executions_op.idempotency_key 列 + 唯一索引）
    if (idempotency_key) {
      const { data: existing, error: idempotencyError } = await supabase
        .from('task_executions_op')
        .select('execution_id, task_id')
        .eq('idempotency_key', idempotency_key)
        .maybeSingle();

      if (idempotencyError) {
        console.warn('[Idempotency Check Warning]:', idempotencyError.message);
        // 若查询失败（如表不存在），继续创建（降级模式）
      } else if (existing) {
        // 幂等：返回已有 execution_id 和 task_id
        return NextResponse.json({
          success: true,
          task_id: existing.task_id,
          execution_id: existing.execution_id,
          message: 'Idempotent request: returned existing Execution.',
        });
      }
    }

    // 4. Build sealed execution envelope pre-write
    const sealed = buildSealedExecutionEnvelope({
      taskId: finalTaskId,
      intentName: finalIntent,
      entryType: finalEntryType,
      entryChannel: finalEntryChannel,
      requesterId: finalRequesterId,
      rawQuery: metadata?.raw_query || '',
      primaryCapabilityId,
      matchedCapabilityIds: finalMatchedCapabilityIds,
      slots: finalSlots,
      gate: finalGate,
      capabilityRiskClass: primaryCapability?.risk_class || null,
    });

    // 5. 封印至 tasks_op 表（仅写入已存在字段；其他信息落入 schedule_config）
    const { data: taskData, error: taskError } = await supabase
      .from('tasks_op')
      .insert({
        task_id: finalTaskId,
        task_type: 'ad_hoc',
        schedule_config: {
          entry_type: finalEntryType,
          entry_channel: finalEntryChannel,
          requester_id: finalRequesterId,
          intent_name: finalIntent,
          idempotency_key: idempotency_key || null,
          payload: {
            intent: finalIntent,
            slots: finalSlots,
            matched_capability_ids: finalMatchedCapabilityIds,
            primary_capability_id: primaryCapabilityId,
            gate: sealed.sealed_execution.gate,
          },
          raw_query: metadata?.raw_query || '',
          context: metadata?.context || {},
          timestamp: new Date().toISOString(),
        },
        status: 'active',
      })
      .select();

    if (taskError) {
      console.error('[Supabase Insert Error - tasks]:', taskError);
      throw taskError;
    }

    const createdTaskId = taskData?.[0]?.task_id || finalTaskId;
    const executionId = sealed.execution_id;
    const initialStatus = sealed.status;
    const finalConfirmationRequest =
      initialStatus === 'pending_confirmation'
        ? (confirmation_request || finalGate.confirmation_request || {
            reason: reason_for_pending || finalGate.reason_for_pending || 'side_effect',
            message: 'Requires confirmation',
          })
        : null
    const finalReasonForPending = initialStatus === 'pending_confirmation'
      ? (reason_for_pending || finalGate.reason_for_pending || 'side_effect')
      : null
    const auditLog = {
      execution_id: executionId,
      events: [
        buildAuditEvent(executionId, {
          event_type: 'execution_created',
          data: {
            status: initialStatus,
            entry_type: finalEntryType,
            entry_channel: finalEntryChannel,
            requester_id: finalRequesterId,
            intent_name: finalIntent,
            reason: finalReasonForPending,
          },
        }),
      ],
      created_at: new Date().toISOString(),
    };

    // 6. 封印至 task_executions_op 表（Mike EM-T3 已建表，启用写入）
    const { error: execError } = await supabase
      .from('task_executions_op')
      .insert({
        execution_id: executionId,
        task_id: createdTaskId,
        entry_type: finalEntryType,
        requester_id: finalRequesterId,
        intent_name: finalIntent,
        payload: {
          raw_query: metadata?.raw_query || '',
          intent: {
            type: finalIntent,
            extracted_slots: {
              ...finalSlots,
              matched_capability_ids: finalMatchedCapabilityIds,
              matched_capability_id: primaryCapabilityId,
            },
            confidence: 0.8,
          },
          slots: finalSlots,
          matched_capability_ids: finalMatchedCapabilityIds,
          primary_capability_id: primaryCapabilityId,
          capability_binding: primaryCapabilityId ? { capability_id: primaryCapabilityId } : null,
          user_id: finalRequesterId,
          context: metadata?.context || {},
          gate: sealed.sealed_execution.gate,
          sealed_execution: sealed.sealed_execution,
        },
        reason_for_pending: finalReasonForPending,
        confirmation_request: finalConfirmationRequest,
        status: initialStatus,
        audit_log: auditLog,
        idempotency_key: idempotency_key || null, // 方案 A：idempotency_key 列
        // created_at / updated_at 由数据库默认值和触发器自动维护，无需显式传入
      })
      .select();

    if (execError) {
      console.error('[Supabase Insert Error - task_executions_op]:', execError);
      // 若写 task_executions 失败，回滚策略：返回错误，不返回 execution_id
      // Phase 1: 先抛错，后续可优化为回滚 tasks 或降级模式
      throw execError;
    }

    // 7. 返回（包含 execution_id，供 Alex Router 使用）
    return NextResponse.json({
      success: true,
      task_id: createdTaskId,
      execution_id: executionId,
      status: initialStatus,
      sealed_execution: sealed.sealed_execution,
      audit_seed: auditLog.events[0],
      message: 'Task and Execution sealed successfully.',
    });

  } catch (error: any) {
    console.error('[Task Create Error]:', error);
    return NextResponse.json({ 
      error: 'Failed to seal task', 
      details: error.message 
    }, { status: 500 });
  }
}
