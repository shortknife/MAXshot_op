import { NextRequest, NextResponse } from 'next/server';
import { executeRouter } from '../../../../server-actions/router/router-main';
import { assertWriteEnabled, buildWriteBlockedEvent } from '@/lib/utils';

/**
 * POST /api/execution/run
 * 显式触发 Router 执行（仅 confirmed 执行；Router 内部会校验）。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { execution_id, operator_id, confirm_token } = body;

    
    try {
      assertWriteEnabled({ operatorId: operator_id, confirmToken: confirm_token })
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'write_blocked' }, { status: 403 });
    }
    if (!execution_id) {
      return NextResponse.json({ error: 'Missing execution_id' }, { status: 400 });
    }

    const result = await executeRouter(execution_id);
    return NextResponse.json({ success: true, execution_id, result });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Execution run failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
