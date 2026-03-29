import { Intent } from '../types/capability'

export interface TaskDecompositionResult {
  capability_chain: string[]
  memory_query: {
    types: ('foundation' | 'experience' | 'insight')[]
    context_tags: string[]
  }
}

export async function decomposeTask(intent: Intent): Promise<TaskDecompositionResult> {
  const capability_chain = determineCapabilityChain(intent.type, intent.extracted_slots)
  const memory_query = determineMemoryQuery(intent.type)

  return {
    capability_chain,
    memory_query,
  }
}

function determineCapabilityChain(intentType: string, slots: Record<string, unknown>): string[] {
  switch (intentType) {
    case 'ops_query':
      return ['data_fact_query', 'product_doc_qna']
    case 'ops_summary':
      return ['data_fact_query', 'product_doc_qna']
    case 'audit_query':
      return ['data_fact_query']
    case 'memory_query':
      return ['data_fact_query']
    case 'content_generation':
      return slots?.include_data ? ['data_fact_query', 'content_generator'] : ['content_generator']
    case 'content_brief':
      return ['content_generator']
    case 'general_qna':
      return ['product_doc_qna', 'data_fact_query']
    case 'product_qna':
      return ['product_doc_qna']
    case 'marketing_gen':
      return slots?.include_data ? ['data_fact_query', 'content_generator'] : ['content_generator']
    default:
      return ['product_doc_qna']
  }
}

function determineMemoryQuery(intentType: string) {
  return {
    types: ['foundation', 'experience'] as ('foundation' | 'experience' | 'insight')[],
    context_tags: [intentType],
  }
}
