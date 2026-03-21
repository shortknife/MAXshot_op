import { NextResponse } from 'next/server'
import { generateSQL, recordQuery } from '@/server-actions/capabilities/sql-generation-engine'
import { findMatchingTemplate, recordTemplateSuccess } from '@/server-actions/capabilities/sql-template-engine'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body.natural_query) {
      return NextResponse.json(
        {
          success: false,
          error: 'natural_query is required',
        },
        { status: 400 }
      )
    }

    if (!body.query_type || !['data_validation', 'analytics'].includes(body.query_type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'query_type must be data_validation or analytics',
        },
        { status: 400 }
      )
    }

    if (!body.schema_info) {
      return NextResponse.json(
        {
          success: false,
          error: 'schema_info is required',
        },
        { status: 400 }
      )
    }

    const sqlRequest = {
      naturalQuery: body.natural_query,
      queryType: body.query_type,
      schemaInfo: body.schema_info,
      maxRows: body.max_rows,
      taskId: body.task_id,
    }

    // Try Tier 1: Template matching
    const templateMatch = await findMatchingTemplate({
      queryType: sqlRequest.queryType,
      entities: body.entities || {},
      constraints: body.constraints || {},
    })

    let result: any
    let tierUsed: 'template' | 'llm_generated' = 'llm_generated'

    if (templateMatch && templateMatch.confidence > 0.9) {
      // Use template
      tierUsed = 'template'
      const { renderTemplate } = await import('@/server-actions/capabilities/sql-template-engine')
      const rendered = renderTemplate(templateMatch.template, templateMatch.matched_parameters)

      result = {
        sql: rendered.sql,
        confidence: rendered.confidence,
        explanation: `Matched template "${templateMatch.template.name}": ${templateMatch.reason}`,
        used_examples: [],
        tier: 'template',
        template_id: templateMatch.template.id,
      }

      // Record template success on successful execution
      if (body.execute !== false) {
        await recordTemplateSuccess(templateMatch.template.id)
      }
    } else {
      // Fall back to Tier 2: LLM generation
      tierUsed = 'llm_generated'
      result = await generateSQL(sqlRequest)
      result.tier = 'llm_generated'
    }

    // Record query if executed successfully
    if (body.execute !== false) {
      await recordQuery(sqlRequest, result, {
        executionTimeMs: body.execution_time_ms,
        resultRows: body.result_rows,
        success: true,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        tier_used: tierUsed,
      },
    })
  } catch (error) {
    console.error('Failed to generate SQL:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'unknown',
      },
      { status: 500 }
    )
  }
}
