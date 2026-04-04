import { NextResponse } from 'next/server'

import { loadLearningAssetSnapshot, renderLearningAssetMarkdown } from '@/lib/interaction-learning/derivation'

export async function GET() {
  const snapshot = await loadLearningAssetSnapshot()
  const markdown = renderLearningAssetMarkdown(snapshot)
  return new NextResponse(markdown, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  })
}
