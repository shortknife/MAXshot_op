import { NextResponse } from 'next/server'
import { listSqlTemplates } from '@/lib/sql-templates'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const source = searchParams.get('source') || 'all' // 'file', 'database', or 'all'

    let fileTemplates: unknown[] = []
    const dbTemplates: unknown[] = []

    // Load file-based templates if requested
    if (source === 'all' || source === 'file') {
      fileTemplates = listSqlTemplates()
    }

    return NextResponse.json({
      success: true,
      data: {
        file: fileTemplates,
        database: dbTemplates,
        total: fileTemplates.length + dbTemplates.length,
      },
      meta: {
        count: fileTemplates.length + dbTemplates.length,
        file_count: fileTemplates.length,
        database_count: dbTemplates.length,
      },
    })
  } catch (error) {
    console.error('Failed to list templates:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'unknown',
      },
      { status: 500 }
    )
  }
}
