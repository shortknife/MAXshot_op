import { loadSqlTemplate } from './loader'

const MAX_LIMIT = 500

import { SqlTemplateMeta } from './types'
import { assertAllowedTables, assertReadOnlySql } from './guard'

function coerceSlotValue(meta: SqlTemplateMeta, slotName: string, value: unknown) {
  const slot = meta.slots[slotName]
  if (!slot) {
    throw new Error(`unknown_slot:${slotName}`)
  }
  if (value === undefined || value === null || value === '') {
    if (slot.required) {
      throw new Error(`missing_slot:${slotName}`)
    }
    return null
  }
  let coerced: unknown = value
  switch (slot.type) {
    case 'number': {
      const num = typeof value === 'number' ? value : Number(value)
      if (!Number.isFinite(num)) throw new Error(`invalid_number:${slotName}`)
      coerced = num
      break
    }
    case 'boolean': {
      if (typeof value === 'boolean') {
        coerced = value
      } else if (value === 'true' || value === 'false') {
        coerced = value === 'true'
      } else {
        throw new Error(`invalid_boolean:${slotName}`)
      }
      break
    }
    case 'json': {
      if (typeof value === 'string') {
        try {
          coerced = JSON.parse(value)
        } catch {
          throw new Error(`invalid_json:${slotName}`)
        }
      } else {
        coerced = value
      }
      if (typeof coerced !== 'object' || coerced === null) {
        throw new Error(`invalid_json:${slotName}`)
      }
      break
    }
    default: {
      coerced = String(value)
      break
    }
  }

  if (slotName === 'limit' && typeof coerced === 'number') {
    if (coerced <= 0) {
      throw new Error('invalid_limit')
    }
    if (coerced > MAX_LIMIT) {
      throw new Error('limit_too_large')
    }
  }
  if (slot.enum && !slot.enum.includes(String(coerced))) {
    throw new Error(`invalid_enum:${slotName}`)
  }
  return coerced
}

export function renderSqlTemplate(templateId: string, slots: Record<string, unknown>) {
  const { meta, sql, path, hash } = loadSqlTemplate(templateId)
  const renderedParams: unknown[] = []
  const paramIndex = new Map<string, number>()

  const renderedSql = sql.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, rawName) => {
    const slotName = String(rawName)
    let index = paramIndex.get(slotName)
    if (!index) {
      const value = coerceSlotValue(meta, slotName, slots?.[slotName])
      renderedParams.push(value)
      index = renderedParams.length
      paramIndex.set(slotName, index)
    }
    return `$${index}`
  })

  for (const [name, slot] of Object.entries(meta.slots)) {
    if (slot.required && (slots?.[name] === undefined || slots?.[name] === null || slots?.[name] === '')) {
      throw new Error(`missing_slot:${name}`)
    }
  }

  if (renderedSql.includes('{{')) {
    throw new Error('unresolved_template_tokens')
  }

  assertReadOnlySql(renderedSql)
  assertAllowedTables(renderedSql, meta.allowed_tables)

  return { sql: renderedSql, params: renderedParams, meta, path, hash }
}
