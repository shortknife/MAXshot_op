import { NextRequest, NextResponse } from 'next/server'
import {
  getCapabilityDefinition,
  getPrimaryCapabilityDefinition,
  MAX_MATCHED_CAPABILITIES,
  normalizeCapabilityCandidates,
  resolveCapabilityIds,
} from '@/lib/router/capability-catalog'

function isValidExecutionMode(value: unknown): value is 'deterministic' | 'llm_heavy' | 'hybrid' {
  return ['deterministic', 'llm_heavy', 'hybrid'].includes(String(value || ''))
}

function toRequiredRuntimeSlots(runtimeSchema: unknown): string[] {
  if (!runtimeSchema || typeof runtimeSchema !== 'object') return []
  const required = (runtimeSchema as { required?: unknown }).required
  return Array.isArray(required) ? required.map((item) => String(item || '').trim()).filter(Boolean) : []
}

function normalizeSlots(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? { ...(value as Record<string, unknown>) } : {}
}

/**
 * EM-T1: Entry Gate - 最小 Intent IR 校验
 * 职责：校验 Intent Analyzer 输出是否满足"最小 Intent IR"，决定是否创建 Execution。
 * 
 * 三项产品原则（Integration Spec 1.3.3）：
 * 1. 不判断对错
 * 2. 除明确风险外不 Reject
 * 3. Router 只接 Execution
 * 
 * 最小 Intent IR = intent_name + capability 可绑定 + 执行模式可判断
 * 缺任一项 → Continue Chat（不生成 Execution）
 * 明确风险（如违反安全策略）→ Reject
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      intent_name,
      capability_binding,
      matched_capability_ids,
      execution_mode,
      entry_channel,
      slots: rawSlots,
      extracted_slots,
      need_clarification,
    } = body
    const slots = normalizeSlots(rawSlots || extracted_slots)
    const requestedCapabilityCandidates = normalizeCapabilityCandidates([
      ...(Array.isArray(matched_capability_ids) ? matched_capability_ids : []),
      capability_binding?.capability_id,
    ])
    const resolvedCapabilityIds = resolveCapabilityIds(requestedCapabilityCandidates, MAX_MATCHED_CAPABILITIES)
    const primaryCapability =
      getPrimaryCapabilityDefinition(resolvedCapabilityIds) ||
      getCapabilityDefinition(String(capability_binding?.capability_id || ''))

    // 1. 校验最小 Intent IR 完整性
    if (!intent_name) {
      return NextResponse.json({
        gate_result: 'continue_chat',
        reason: 'missing_intent_name',
        message: 'Intent name is required for Execution creation.',
        audit: {
          gate_decision: 'continue_chat',
          reason: 'missing_intent_name',
          timestamp: new Date().toISOString(),
        },
      }, { status: 200 })
    }

    if (!primaryCapability) {
      return NextResponse.json({
        gate_result: 'continue_chat',
        reason: 'missing_capability_binding',
        message: 'Capability binding or matched capability ids are required for Execution creation.',
        audit: {
          gate_decision: 'continue_chat',
          reason: 'missing_capability_binding',
          matched_capability_ids: resolvedCapabilityIds,
          timestamp: new Date().toISOString(),
        },
      }, { status: 200 })
    }

    if (!execution_mode || !isValidExecutionMode(execution_mode)) {
      return NextResponse.json({
        gate_result: 'continue_chat',
        reason: 'missing_or_invalid_execution_mode',
        message: 'Valid execution mode is required for Execution creation.',
        audit: {
          gate_decision: 'continue_chat',
          reason: 'missing_or_invalid_execution_mode',
          timestamp: new Date().toISOString(),
        },
      }, { status: 200 })
    }

    if (requestedCapabilityCandidates.length > MAX_MATCHED_CAPABILITIES) {
      return NextResponse.json({
        gate_result: 'continue_chat',
        reason: 'too_many_capability_matches',
        message: 'Too many capability matches. Clarification required before Execution creation.',
        audit: {
          gate_decision: 'continue_chat',
          reason: 'too_many_capability_matches',
          requested_capability_candidates: requestedCapabilityCandidates,
          matched_capability_ids: resolvedCapabilityIds,
          timestamp: new Date().toISOString(),
        },
      }, { status: 200 })
    }

    if (need_clarification === true || slots.need_clarification === true) {
      return NextResponse.json({
        gate_result: 'continue_chat',
        reason: 'missing_required_clarification',
        message: 'Clarification required before Execution creation.',
        audit: {
          gate_decision: 'continue_chat',
          reason: 'missing_required_clarification',
          capability_id: primaryCapability.capability_id,
          matched_capability_ids: resolvedCapabilityIds,
          timestamp: new Date().toISOString(),
        },
      }, { status: 200 })
    }

    const requiredRuntimeSlots = toRequiredRuntimeSlots(primaryCapability.runtime_slot_schema)
    const missingRuntimeSlots = requiredRuntimeSlots.filter((slotName) => {
      const value = slots[slotName]
      return value === null || typeof value === 'undefined' || value === ''
    })
    if (missingRuntimeSlots.length > 0) {
      return NextResponse.json({
        gate_result: 'continue_chat',
        reason: 'missing_required_slots',
        message: `Missing required runtime slots: ${missingRuntimeSlots.join(', ')}`,
        audit: {
          gate_decision: 'continue_chat',
          reason: 'missing_required_slots',
          capability_id: primaryCapability.capability_id,
          matched_capability_ids: resolvedCapabilityIds,
          missing_slots: missingRuntimeSlots,
          timestamp: new Date().toISOString(),
        },
      }, { status: 200 })
    }

    // 2. Capability 可绑定性校验
    if (primaryCapability.lifecycle !== 'active') {
      return NextResponse.json({
        gate_result: 'continue_chat',
        reason: 'capability_not_active',
        message: `Capability ${primaryCapability.capability_id} lifecycle is ${primaryCapability.lifecycle}, not active.`,
        audit: {
          gate_decision: 'continue_chat',
          reason: 'capability_not_active',
          capability_id: primaryCapability.capability_id,
          lifecycle: primaryCapability.lifecycle,
          timestamp: new Date().toISOString(),
        },
      }, { status: 200 })
    }

    // 3. side_effect 必须进入 pending_confirmation（不直接执行）
    if (primaryCapability.risk_class === 'side_effect') {
      return NextResponse.json({
        gate_result: 'pass',
        require_confirmation: true,
        confirmation_request: {
          preview: {
            intent_name,
            capability_id: primaryCapability.capability_id,
            matched_capability_ids: resolvedCapabilityIds,
            entry_channel,
          },
          token: `confirm_${Date.now()}`,
          summary: 'Side-effect capability requires confirmation before execution.',
        },
        reason_for_pending: 'side_effect',
        message: 'Gate check passed. Confirmation required before Execution.',
        audit: {
          gate_decision: 'pass',
          require_confirmation: true,
          reason_for_pending: 'side_effect',
          intent_name,
          capability_id: primaryCapability.capability_id,
          matched_capability_ids: resolvedCapabilityIds,
          execution_mode,
          timestamp: new Date().toISOString(),
        },
      }, { status: 200 })
    }

    // 4. Gate 通过
    return NextResponse.json({
      gate_result: 'pass',
      require_confirmation: false,
      capability_binding: {
        capability_id: primaryCapability.capability_id,
        matched_capability_ids: resolvedCapabilityIds,
      },
      message: 'Gate check passed. Proceed to create Execution.',
      audit: {
        gate_decision: 'pass',
        require_confirmation: false,
        intent_name,
        capability_id: primaryCapability.capability_id,
        matched_capability_ids: resolvedCapabilityIds,
        execution_mode,
        timestamp: new Date().toISOString(),
      },
    }, { status: 200 })

  } catch (error: any) {
    console.error('[Gate Check Error]:', error);
    // 降级：出错时默认 continue_chat，不阻塞流程
    return NextResponse.json({
      gate_result: 'continue_chat',
      reason: 'gate_check_error',
      message: 'Gate check encountered an error, defaulting to Continue Chat.',
      error: error.message,
      audit: {
        gate_decision: 'continue_chat',
        reason: 'gate_check_error',
        timestamp: new Date().toISOString(),
      },
    }, { status: 200 })
  }
}
