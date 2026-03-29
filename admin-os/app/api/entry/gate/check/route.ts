import { NextRequest, NextResponse } from 'next/server'
import { evaluateGateDecision } from '@/lib/router/gate-decision'

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
    const decision = evaluateGateDecision(body)

    return NextResponse.json({
      ...decision,
      reason: decision.gate_reason,
    }, { status: 200 })

  } catch (error: any) {
    console.error('[Gate Check Error]:', error);
    // 降级：出错时默认 continue_chat，不阻塞流程
    return NextResponse.json({
      gate_result: 'continue_chat',
      gate_reason: 'gate_check_error',
      reason: 'gate_check_error',
      blocking_fields: [],
      safe_to_seal: false,
      require_confirmation: false,
      capability_binding: null,
      message: 'Gate check encountered an error, defaulting to Continue Chat.',
      error: error.message,
      audit: {
        gate_decision: 'continue_chat',
        gate_reason: 'gate_check_error',
        reason: 'gate_check_error',
        timestamp: new Date().toISOString(),
      },
    }, { status: 200 })
  }
}
