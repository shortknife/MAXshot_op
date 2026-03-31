import { NextRequest, NextResponse } from 'next/server';
import { parseIntent } from '@/lib/intent-analyzer/intent-parsing';

/**
 * POST /api/intent/analyze
 * 调用 Intent Analyzer（LLM），输出 intent + extracted_slots
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { raw_query, session_context } = body;

    if (!raw_query) {
      return NextResponse.json({ error: 'Missing raw_query' }, { status: 400 });
    }

    const result = await parseIntent(raw_query, session_context);
    return NextResponse.json({
      success: true,
      intent: result.intent,
      raw_query: result.raw_query,
      trace: {
        analyzer: 'intent-analyzer',
        source: result.prompt_meta?.source || 'local_stub',
        prompt_slug: result.prompt_meta?.slug || null,
        prompt_version: result.prompt_meta?.version || null,
        prompt_hash: result.prompt_meta?.hash || null,
        session_context_present: Boolean(session_context),
        tokens_used: result.tokens_used ?? 0,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Intent analysis failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
