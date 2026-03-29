export type SqlTemplateSlot = {
  type: 'string' | 'number' | 'boolean' | 'json'
  required: boolean
  enum?: string[]
}

export type SqlTemplateMeta = {
  id: string
  name: string
  description: string
  category: 'ops' | 'audit' | 'memory' | 'other'
  version: string
  allowed_tables: string[]
  output_schema: Record<string, string>
  slots: Record<string, SqlTemplateSlot>
  examples: Record<string, unknown>[]
}

export type SqlTemplateRecord = {
  meta: SqlTemplateMeta
  sql: string
  path: string
  hash: string
}
