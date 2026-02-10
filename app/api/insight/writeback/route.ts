import { NextResponse } from 'next/server'

/**
 * POST /api/insight/writeback
 * Stub-only: write-back is disabled by default.
 * Future contract (no writes performed here):
 * {
 *   "source_execution_id": "string",
 *   "candidate": {
 *     "candidate_type": "insight",
 *     "summary": "string",
 *     "evidence": [],
 *     "capability_path": [],
 *     "confidence_notes": "string",
 *     "human_review_status": "draft_only"
 *   },
 *   "operator": { "id": "string", "role": "string" },
 *   "reason": "string"
 * }
 *
 * Audit points (future):
 * - insight_writeback_requested
 * - insight_writeback_blocked (default)
 * - insight_writeback_committed (future)
 */
export async function POST() {
  return NextResponse.json(
    {
      disabled: true,
      message: 'Insight write-back is disabled by default (stub only).',
    },
    { status: 501 }
  )
}
