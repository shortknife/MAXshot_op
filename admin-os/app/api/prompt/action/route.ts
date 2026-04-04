import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    {
      error: 'prompt_filesystem_managed',
      detail: 'Prompt release and rollback are Git-managed. Update markdown prompt files and commit the change.',
    },
    { status: 410 },
  )
}
