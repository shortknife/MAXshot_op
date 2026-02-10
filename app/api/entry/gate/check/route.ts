import { NextRequest, NextResponse } from 'next/server';

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

// 临时 Capability Registry（Phase 1 简化版，后续从 DB 读取）
const CAPABILITY_REGISTRY: Record<string, { lifecycle: string; risk_class: string }> = {
  'capability.data_fact_query': { lifecycle: 'active', risk_class: 'read_only' },
  'capability.product_doc_qna': { lifecycle: 'active', risk_class: 'read_only' },
  'capability.content_generator': { lifecycle: 'active', risk_class: 'read_only' },
  'capability.publisher': { lifecycle: 'active', risk_class: 'side_effect' },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { intent_name, capability_binding, execution_mode, requester_id, entry_channel } = body;

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
      }, { status: 200 });
    }

    if (!capability_binding || !capability_binding.capability_id) {
      return NextResponse.json({
        gate_result: 'continue_chat',
        reason: 'missing_capability_binding',
        message: 'Capability binding is required for Execution creation.',
        audit: {
          gate_decision: 'continue_chat',
          reason: 'missing_capability_binding',
          timestamp: new Date().toISOString(),
        },
      }, { status: 200 });
    }

    if (!execution_mode || !['deterministic', 'llm_heavy', 'hybrid'].includes(execution_mode)) {
      return NextResponse.json({
        gate_result: 'continue_chat',
        reason: 'missing_or_invalid_execution_mode',
        message: 'Valid execution mode is required for Execution creation.',
        audit: {
          gate_decision: 'continue_chat',
          reason: 'missing_or_invalid_execution_mode',
          timestamp: new Date().toISOString(),
        },
      }, { status: 200 });
    }

    // 2. Capability 可绑定性校验
    const capability = CAPABILITY_REGISTRY[capability_binding.capability_id];
    if (!capability) {
      return NextResponse.json({
        gate_result: 'continue_chat',
        reason: 'capability_not_found',
        message: `Capability ${capability_binding.capability_id} not found in registry.`,
        audit: {
          gate_decision: 'continue_chat',
          reason: 'capability_not_found',
          capability_id: capability_binding.capability_id,
          timestamp: new Date().toISOString(),
        },
      }, { status: 200 });
    }

    if (capability.lifecycle !== 'active') {
      return NextResponse.json({
        gate_result: 'continue_chat',
        reason: 'capability_not_active',
        message: `Capability ${capability_binding.capability_id} lifecycle is ${capability.lifecycle}, not active.`,
        audit: {
          gate_decision: 'continue_chat',
          reason: 'capability_not_active',
          capability_id: capability_binding.capability_id,
          lifecycle: capability.lifecycle,
          timestamp: new Date().toISOString(),
        },
      }, { status: 200 });
    }

    // 3. side_effect 必须进入 pending_confirmation（不直接执行）
    if (capability.risk_class === 'side_effect') {
      return NextResponse.json({
        gate_result: 'pass',
        require_confirmation: true,
        confirmation_request: {
          preview: {
            intent_name,
            capability_id: capability_binding.capability_id,
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
          capability_id: capability_binding.capability_id,
          execution_mode,
          timestamp: new Date().toISOString(),
        },
      }, { status: 200 });
    }

    // 4. Gate 通过
    return NextResponse.json({
      gate_result: 'pass',
      require_confirmation: false,
      message: 'Gate check passed. Proceed to create Execution.',
      audit: {
        gate_decision: 'pass',
        require_confirmation: false,
        intent_name,
        capability_id: capability_binding.capability_id,
        execution_mode,
        timestamp: new Date().toISOString(),
      },
    }, { status: 200 });

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
    }, { status: 200 });
  }
}
