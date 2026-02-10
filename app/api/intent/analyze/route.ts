import { NextRequest, NextResponse } from 'next/server';
import { parseIntent } from '../../../../server-actions/intent-analyzer/intent-parsing';

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
    return NextResponse.json({ success: true, intent: result.intent, raw_query: result.raw_query });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Intent analysis failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
