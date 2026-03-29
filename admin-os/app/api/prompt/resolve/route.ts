import { NextRequest, NextResponse } from 'next/server'
import { getPromptBySlug } from '@/lib/prompts/prompt-registry'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const slug = String(searchParams.get('slug') || '').trim()
    if (!slug) {
      return NextResponse.json({ error: 'missing_slug' }, { status: 400 })
    }

    const result = await getPromptBySlug(slug)
    if (!result) {
      return NextResponse.json({ success: false, error: 'prompt_not_found', slug }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        slug: result.prompt.slug,
        version: result.prompt.version,
        source: result.source,
        hash: result.hash,
        updated_at: result.prompt.updated_at || null,
        updated_by: result.prompt.updated_by || null,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'prompt_resolve_failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
