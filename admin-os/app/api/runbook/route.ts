import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * GET /api/runbook
 * Returns the operator runbook markdown content.
 */
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'admin-os', 'RUNBOOK.md');
    const content = fs.readFileSync(filePath, 'utf8');
    return NextResponse.json({ content });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Failed to load runbook', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
