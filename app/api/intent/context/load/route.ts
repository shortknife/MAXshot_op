import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Ticket #2: /api/intent/context/load
 * MEM-T1: 新增 memory_layer_context，供 external-orchestrator (disabled) 注入 John Prompt 的 {{memory_layer_context}} 占位符。
 * 职责：从 DB 获取上下文，执行“脱水裁剪”，输出扁平化 JSON 供 external-orchestrator (disabled) 占位符使用。
 * memory_layer_context 语义：与 John-Cat_Memory_Layer_Context_Alignment_2026-02、LEO §五 一致；
 * 至少包含「合法 intent 简要描述」列表（名称 + 一句话说明）；暂无 Memory 数据时可返回空字符串。
 */
export async function POST(req: NextRequest) {
  const intent_schema = {
    ops_query: {
      description: "查询金库指标，如 APY, TVL, 收益等",
      slots: ["vault_name", "metric", "network"]
    },
    marketing_gen: {
      description: "生成社交媒体营销内容",
      slots: ["platform", "tone", "topic"]
    },
    unknown: {
      description: "无法识别意图时的回退方案",
      slots: []
    }
  };

  const vault_list = [
    "dForce USDC - Morpho - arbitrum",
    "dForce USDT - Morpho - arbitrum",
    "dForce DAI - Morpho - arbitrum",
    "dForce WETH - Morpho - arbitrum"
  ];

  try {
    const { chat_id, user_id, raw_query } = await req.json();

    if (!chat_id || !user_id) {
      return NextResponse.json({ error: 'Missing identifiers' }, { status: 400 });
    }

    // 1. 获取最近 3 条任务历史 (V2 架构：从 tasks 表统一获取)
    const { data: history, error: dbError } = await supabase
      .from('tasks')
      .select('payload, created_at, metadata')
      .eq('requester', user_id)
      .order('created_at', { ascending: false })
      .limit(3);

    if (dbError) {
      console.warn('[DB Warning - tasks history missing]:', dbError.message);
    }

    const session_context = (history && history.length > 0)
      ? history.map((h, i) => `[History ${i+1}] Query: ${h.metadata?.raw_query || 'N/A'} -> Intent: ${h.payload?.intent}, Slots: ${JSON.stringify(h.payload?.slots || {})}`).join(' | ')
      : "No recent history found.";

    // 4. Clean Query
    const clean_query = (raw_query || "").replace(/^=/, "").trim();

    // 5. memory_layer_context（MEM-T1）：合法 intent 简要描述，供 Intent Analyzer LLM 约束输出
    // 格式：intent_name + one_line_description（权威来源：当前 intent_schema；后续可接 Lucy 的 Skill/intent 清单或 DB）
    const memory_layer_context = Object.entries(intent_schema)
      .map(([name, def]) => `${name}: ${(def as { description?: string }).description || ''}`)
      .filter(Boolean)
      .join('\n') || '';

    // 6. 返回
    return NextResponse.json({
      success: true,
      clean_query: clean_query,
      session_context: session_context,
      intent_schema: intent_schema,
      vault_list: vault_list,
      user_profile_subset: `UserID: ${user_id}`,
      memory_layer_context: memory_layer_context, // MEM-T1：Alex 注入 {{memory_layer_context}}
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[Context Load Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      clean_query: '',
      session_context: 'Context unavailable',
      intent_schema: intent_schema,
      vault_list: vault_list,
      user_profile_subset: '',
      memory_layer_context: '', // 降级：无数据时返回空字符串，Alex 可照常注入
      timestamp: new Date().toISOString()
    });
  }
}
