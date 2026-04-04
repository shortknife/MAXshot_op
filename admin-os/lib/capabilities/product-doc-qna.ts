import fs from 'fs'
import path from 'path'
import { CapabilityInputEnvelope, CapabilityOutput } from '../router/types/capability'
import { ensureObjectParam, readStringParam } from '../utils/params'
import { getPromptBySlug } from '@/lib/prompts/prompt-registry'
import { listActiveCapabilityDefinitions } from '@/lib/router/capability-catalog'

function buildCapabilityOverviewAnswer() {
  const active = listActiveCapabilityDefinitions()
  const lines = active.map((cap) => {
    const examples = Array.isArray(cap.examples) ? cap.examples.slice(0, 2) : []
    const exampleText = examples.length ? `例如：${examples.join('；')}` : ''
    return `- ${cap.name}：${cap.description}${exampleText ? ` ${exampleText}` : ''}`
  })
  const answer = [
    '我当前支持的业务能力主要有：',
    ...lines,
    '你可以直接问 Vault、APY、TVL、execution、rebalance，或询问产品定义与能力边界。',
  ].join('\n')
  return {
    answer,
    highlights: active.map((cap) => ({
      label: cap.name,
      value: cap.capability_id,
    })),
  }
}

function buildMaxshotDefinitionAnswer() {
  return {
    answer:
      'MAXshot 是一个面向多链资产运营与治理的产品，用于管理金库、执行策略动作、追踪执行过程，并为运营决策提供可审计的上下文与事实依据。',
    highlights: [
      { label: '定位', value: '多链资产运营与治理' },
      { label: '核心对象', value: '金库、执行、调仓、审计' },
    ],
  }
}

export async function productDocQnA(input: CapabilityInputEnvelope): Promise<CapabilityOutput> {
  let slots: Record<string, unknown>
  try {
    slots = ensureObjectParam(input.slots, 'slots')
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'invalid_slots'
    return {
      capability_id: 'product_doc_qna',
      capability_version: '1.1',
      status: 'failed',
      result: null,
      error: reason,
      evidence: { sources: [], doc_quotes: null, fallback_reason: reason },
      audit: {
        capability_id: 'product_doc_qna',
        capability_version: '1.1',
        status: 'failed',
        used_skills: [],
      },
      used_skills: [],
      metadata: { rejected_reason: reason },
    }
  }

  const docPath = readStringParam(slots, 'doc_path') || ''
  const questionShape = readStringParam(slots, 'question_shape') || ''
  const question = readStringParam(slots, 'question') || ''
  const prompt = await getPromptBySlug('product_doc_qna')
  let result: unknown = null
  let evidenceSources: unknown[] = []
  let fallbackReason: string | undefined

  if (/maxshot/i.test(question) && /(什么是|描述|介绍|说明|是什么)/.test(question)) {
    result = buildMaxshotDefinitionAnswer()
    evidenceSources = [
      {
        source: 'local_stub',
        topic: 'maxshot_definition',
      },
    ]
  } else if (questionShape === 'capability_overview') {
    result = buildCapabilityOverviewAnswer()
    evidenceSources = [
      {
        source: 'capability_registry',
        registry_items: listActiveCapabilityDefinitions().map((cap) => cap.capability_id),
      },
    ]
  } else if (docPath) {
    try {
      const absPath = path.isAbsolute(docPath) ? docPath : path.join(process.cwd(), docPath)
      const content = fs.readFileSync(absPath, 'utf8')
      result = { snippet: content.slice(0, 300) }
      evidenceSources = [{ source: 'file', path: docPath }]
    } catch {
      result = { answer: 'Document not found. Returning safe fallback.' }
      evidenceSources = []
      fallbackReason = 'doc_not_found'
    }
  } else {
    result = { answer: 'No document specified. Returning safe fallback.' }
    evidenceSources = []
    fallbackReason = 'missing_doc_path'
  }

  const used_skills = ['document-retrieval', 'prompt-registry']

  if (prompt) {
    evidenceSources.push({
      source: 'prompt_filesystem',
      prompt_slug: prompt.prompt.slug,
      prompt_version: prompt.prompt.version,
      prompt_source: prompt.source,
      prompt_hash: prompt.hash,
    })
  }

  return {
    capability_id: 'product_doc_qna',
    capability_version: '1.1',
    status: 'success',
    result,
    evidence: { sources: evidenceSources ?? [], doc_quotes: null, fallback_reason: fallbackReason },
    audit: {
      capability_id: 'product_doc_qna',
      capability_version: '1.1',
      status: 'success',
      used_skills,
    },
    used_skills,
    metadata: {
      ...(fallbackReason ? { fallback_reason: fallbackReason } : {}),
      ...(prompt
        ? {
            prompt_slug: prompt.prompt.slug,
            prompt_version: prompt.prompt.version,
            prompt_source: prompt.source,
            prompt_hash: prompt.hash,
          }
        : {}),
    },
  }
}
