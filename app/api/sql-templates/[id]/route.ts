import { NextResponse } from 'next/server'
import { getTemplate, updateTemplate, deleteTemplate } from '@/server-actions/capabilities/sql-template-engine'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const template = await getTemplate(params.id)

    if (!template) {
      return NextResponse.json(
        {
          success: false,
          error: 'Template not found',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: template,
    })
  } catch (error) {
    console.error('Failed to get template:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'unknown',
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()

    const template = await updateTemplate(params.id, body)

    return NextResponse.json({
      success: true,
      data: template,
    })
  } catch (error) {
    console.error('Failed to update template:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'unknown',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    await deleteTemplate(params.id)

    return NextResponse.json({
      success: true,
      data: { message: 'Template deleted' },
    })
  } catch (error) {
    console.error('Failed to delete template:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'unknown',
      },
      { status: 500 }
    )
  }
}
