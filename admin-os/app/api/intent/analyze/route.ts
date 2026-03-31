import { NextRequest, NextResponse } from 'next/server';
import { parseIntent, toIntentHarnessResult } from '@/lib/intent-analyzer/intent-parsing';
import { buildPerfQueryMeta, createPerfTrace } from '@/lib/observability/request-performance';

/**
 * POST /api/intent/analyze
 * 调用 Intent Analyzer（LLM），输出 intent + extracted_slots
 */
export async function POST(req: NextRequest) {
  const readJsonStartedAt = Date.now();
  let perf: ReturnType<typeof createPerfTrace> | null = null;
  try {
    const body = await req.json();
    const { raw_query, session_context } = body;
    perf = createPerfTrace('api.intent.analyze', buildPerfQueryMeta(String(raw_query || ''), { has_session_context: Boolean(session_context) }));
    perf.stage('read_json', { stage_duration_ms: Date.now() - readJsonStartedAt });

    if (!raw_query) {
      return NextResponse.json({ error: 'Missing raw_query' }, { status: 400 });
    }

    const result = await perf.measure('parse_intent', () => parseIntent(raw_query, session_context));
    const harness = await perf.measure('build_harness', () => toIntentHarnessResult(result, session_context));
    perf.finish({ intent_type: result.intent.type });

    return NextResponse.json({
      success: true,
      raw_query: result.raw_query,
      step3: harness,
      trace: harness.trace,
    });
  } catch (error: unknown) {
    perf?.fail(error);
    return NextResponse.json(
      { error: 'Intent analysis failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
