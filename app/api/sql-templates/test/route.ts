import { NextResponse } from 'next/server'
import { getTemplate, renderTemplate } from '../../../../../server-actions/capabilities/sql-template-engine'
import { supabase } from '../../../../lib/supabase'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body.template_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'template_id is required',
        },
        { status: 400 }
      )
    }

    const template = await getTemplate(body.template_id)
    if (!template) {
      return NextResponse.json(
        {
          success: false,
          error: 'Template not found',
        },
        { status: 404 }
      )
    }

    const parameters = body.parameters || {}

    // Render the template
    const rendered = renderTemplate(template, parameters)

    // Execute the query with EXPLAIN to validate
    const { data, error } = await supabase.rpc('sql_template_explain_op', {
      sql: rendered.sql,
      params: rendered.params.map((p) => String(p)),
    })

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'SQL validation failed',
          rendered,
        },
        { status: 400 }
      )
    }

    // Optionally execute to show actual results
    let results: unknown[] | null = null
    if (body.execute !== false) {
      const { data: execData, error: execError } = await supabase.rpc('sql_template_query', {
        sql: rendered.sql,
        params: rendered.params.map((p) => String(p)),
      })

      if (execError) {
        return NextResponse.json(
          {
            success: false,
            error: execError.message || 'SQL execution failed',
            rendered,
          },
          { status: 500 }
        )
      }

      results = execData || []
    }

    return NextResponse.json({
      success: true,
      data: {
        rendered,
        results,
        explain_plan: data,
      },
    })
  } catch (error) {
    console.error('Failed to test template:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'unknown',
      },
      { status: 500 }
    )
  }
}
