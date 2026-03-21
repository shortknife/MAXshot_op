import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export type CapabilityLifecycle = 'active' | 'inactive'
export type CapabilityRiskClass = 'read_only' | 'side_effect'

export type CapabilitySchemaField = {
  name: string
  type: string
  required: boolean
  description?: string
  examples?: string[]
  values?: string[]
  minimum?: number
  maximum?: number
}

export type CapabilitySlotSchema = {
  description?: string
  fields: CapabilitySchemaField[]
  type?: string
  required?: string[]
  properties?: Record<string, unknown>
  additionalProperties?: boolean
}

export type CapabilityClarificationPolicy = {
  max_turns: number
  ui_mode: string
  allow_multi_match: boolean
  max_multi_match: number
  ask_for: string[]
  prefer_examples_over_buttons: boolean
  default_time_window_interpretation?: string
  default_aggregation?: string
}

export type CapabilityRegistryEntry = {
  capability_id: string
  name: string
  description: string
  lifecycle: CapabilityLifecycle
  risk_class: CapabilityRiskClass
  examples: string[]
  prompt_slot_schema: CapabilitySlotSchema
  runtime_slot_schema: CapabilitySlotSchema
  clarification_policy: CapabilityClarificationPolicy
  tags: string[]
}

export type CapabilityRegistryDocument = {
  registry_id: string
  version: string
  updated_at: string
  basis: {
    capability_catalog: string
    semantic_index: string
  }
  capabilities: CapabilityRegistryEntry[]
}

let cachedRegistry: CapabilityRegistryDocument | null = null

function getRegistryPath() {
  const here = path.dirname(fileURLToPath(import.meta.url))
  return path.resolve(here, '../../app/configs/capability-registry/capability_registry_v1.json')
}

export async function loadCapabilityRegistry(): Promise<CapabilityRegistryDocument> {
  if (cachedRegistry) return cachedRegistry
  const raw = await fs.readFile(getRegistryPath(), 'utf8')
  cachedRegistry = JSON.parse(raw) as CapabilityRegistryDocument
  return cachedRegistry
}

export async function getActiveCapabilities(): Promise<CapabilityRegistryEntry[]> {
  const registry = await loadCapabilityRegistry()
  return registry.capabilities.filter((item) => item.lifecycle === 'active')
}

export async function getCapabilityById(capabilityId: string): Promise<CapabilityRegistryEntry | null> {
  const registry = await loadCapabilityRegistry()
  const normalized = String(capabilityId || '').trim()
  if (!normalized) return null
  return registry.capabilities.find((item) => item.capability_id === normalized) || null
}

export async function buildCapabilityPromptList(): Promise<
  Array<{
    capability_id: string
    name: string
    description: string
    examples: string[]
    prompt_slot_schema: CapabilitySlotSchema
    clarification_policy: CapabilityClarificationPolicy
    tags: string[]
  }>
> {
  const capabilities = await getActiveCapabilities()
  return capabilities.map((item) => ({
    capability_id: item.capability_id,
    name: item.name,
    description: item.description,
    examples: [...item.examples],
    prompt_slot_schema: item.prompt_slot_schema,
    clarification_policy: item.clarification_policy,
    tags: [...item.tags],
  }))
}

export async function buildCapabilityRegistryPromptContext(): Promise<string> {
  const capabilities = await buildCapabilityPromptList()
  return JSON.stringify(
    {
      registry_id: 'capability_registry_v1',
      capabilities,
    },
    null,
    2
  )
}
