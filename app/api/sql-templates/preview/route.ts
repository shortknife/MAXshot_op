import { NextResponse } from 'next/server'
import { renderSqlTemplate } from '@/lib/sql-templates'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { template_id, template_slots } = body || {}
    if (!template_id) {
      return NextResponse.json({ error: 'missing_template_id' }, { status: 400 })
    }
    const rendered = renderSqlTemplate(template_id, template_slots || {})
    return NextResponse.json({
      sql: rendered.sql,
      params: rendered.params,
      meta: rendered.meta,
      hash: rendered.hash,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    )
  }
}
