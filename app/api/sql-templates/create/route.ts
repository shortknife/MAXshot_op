import { NextResponse } from 'next/server'
import { createTemplate } from '../../../../../server-actions/capabilities/sql-template-engine'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        {
          success: false,
          error: 'name is required',
        },
        { status: 400 }
      )
    }

    if (!body.category || !['data_validation', 'analytics'].includes(body.category)) {
      return NextResponse.json(
        {
          success: false,
          error: 'category must be data_validation or analytics',
        },
        { status: 400 }
      )
    }

    if (!body.template_sql || typeof body.template_sql !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'template_sql is required and must be a string',
        },
        { status: 400 }
      )
    }

    const template = await createTemplate({
      name: body.name,
      description: body.description || null,
      category: body.category,
      template_sql: body.template_sql,
      schema_signature: body.schema_signature || {},
      parameters: body.parameters || {},
    })

    return NextResponse.json(
      {
        success: true,
        data: template,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to create template:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'unknown',
      },
      { status: 500 }
    )
  }
}
