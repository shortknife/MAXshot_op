import { NextResponse } from 'next/server'
import { getDepositionCandidates } from '../../../../../server-actions/capabilities/sql-deposition-engine'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const criteria = {
      minSuccessCount: searchParams.get('min_success_count')
        ? Number(searchParams.get('min_success_count'))
        : 5,
      minConfidence: searchParams.get('min_confidence')
        ? Number(searchParams.get('min_confidence'))
        : 0.85,
      minFrequency: searchParams.get('min_frequency')
        ? Number(searchParams.get('min_frequency'))
        : 3,
      days: searchParams.get('days')
        ? Number(searchParams.get('days'))
        : 30,
      schemaStability: searchParams.get('schema_stability')
        ? Number(searchParams.get('schema_stability'))
        : 0.9,
    }

    const candidates = await getDepositionCandidates(criteria)

    return NextResponse.json({
      success: true,
      data: candidates,
      meta: {
        count: candidates.length,
        criteria,
      },
    })
  } catch (error) {
    console.error('Failed to get deposition candidates:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'unknown',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body.query_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'query_id is required',
        },
        { status: 400 }
      )
    }

    // Get the query history first
    const { getQueryHistory } = await import('../../../../../server-actions/capabilities/sql-generation-engine')
    const queries = await getQueryHistory()
    const query = queries.find((q: any) => q.id === body.query_id)

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: 'Query not found',
        },
        { status: 404 }
      )
    }

    // Evaluate and deposit
    const { evaluateDepositionCandidate, depositTemplate } = await import('../../../../../server-actions/capabilities/sql-deposition-engine')
    const candidate = await evaluateDepositionCandidate(query)

    if (!candidate.meetsCriteria || !candidate.extractedTemplate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Query does not meet deposition criteria',
          data: {
            meets_criteria: candidate.meetsCriteria,
            criteria: candidate.depositionCriteria,
          },
        },
        { status: 400 }
      )
    }

    const result = await depositTemplate(candidate)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          data: candidate,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        template: result.template,
        candidate,
      },
    })
  } catch (error) {
    console.error('Failed to deposit template:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'unknown',
      },
      { status: 500 }
    )
  }
}
