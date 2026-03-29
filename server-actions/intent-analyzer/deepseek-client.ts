const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''

export interface DeepSeekRequest {
  model: string
  messages: DeepSeekMessage[]
  temperature?: number
  max_tokens?: number
}

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface DeepSeekResponse {
  id: string
  object: string
  created: number
  model: string
  choices: DeepSeekChoice[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface DeepSeekChoice {
  index: number
  message: DeepSeekMessage
  finish_reason: string
  logprobs: Record<string, unknown>
}

export interface IntentAnalysisResult {
  intent: {
    type: string
    extracted_slots: Record<string, unknown>
    confidence: number
  }
  raw_query: string
  tokens_used?: number
}

export async function callDeepSeek(rawQuery: string, sessionContext?: string): Promise<IntentAnalysisResult> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY is not configured')
  }

  const systemPrompt = buildSystemPrompt()
  const messages: DeepSeekMessage[] = [
    { role: 'system', content: systemPrompt },
    ...buildUserMessages(rawQuery, sessionContext),
  ]

  const requestBody: DeepSeekRequest = {
    model: 'deepseek-chat',
    messages,
    temperature: 0.3,
    max_tokens: 2000,
  }

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.statusText}`)
  }

  const data: DeepSeekResponse = await response.json()

  if (!data.choices || data.choices.length === 0) {
    throw new Error('No choices returned from DeepSeek')
  }

  const assistantMessage = data.choices[0].message
  const intentContent = parseIntentContent(assistantMessage.content)

  return {
    intent: {
      type: intentContent.type,
      extracted_slots: intentContent.slots,
      confidence: intentContent.confidence || 0.8,
    },
    raw_query: rawQuery,
    tokens_used: data.usage.total_tokens,
  }
}

function buildSystemPrompt(): string {
  return `You are an Intent Analyzer for MAXshot v5.0.

Your role is to analyze natural language queries and extract structured parameters.

**CRITICAL CONSTRAINTS**:
1. Output ONLY "intent" and "extracted_slots" - NEVER output "capability_chain" or any routing instructions
2. The "capability_chain" decision is 100% the responsibility of the Router, not the Intent Analyzer
3. You are a semantic parser, not an orchestrator
4. Your output must be a deterministic mapping from input to intent type and slots

**Intent Types**:
- ops_query: Query vault operations, metrics, APY
- content_generation: Generate marketing content, posts
- general_qna: General questions about product features
- task_management: Create, update, delete tasks
- metric_query: Query specific metrics or statistics

**Output Format (STRICT JSON)**:
{
  "intent": {
    "type": "intent_type",
    "extracted_slots": {
      "key1": "value1",
      "key2": "value2"
    },
    "confidence": 0.0-1.0
  }
}

Remember: You are parsing intent, NOT deciding what to do. Return clean JSON.`
}

function buildUserMessages(rawQuery: string, sessionContext?: string): DeepSeekMessage[] {
  const messages: DeepSeekMessage[] = []

  if (sessionContext) {
    messages.push({
      role: 'user',
      content: `[Previous Context]: ${sessionContext}\n\n[Current Query]: ${rawQuery}`,
    })
  } else {
    messages.push({
      role: 'user',
      content: rawQuery,
    })
  }

  return messages
}

function parseIntentContent(content: string): {
  type: string
  slots: Record<string, unknown>
  confidence?: number
} {
  const jsonMatch = content.match(/\{[\s\S]*\}/s)

  if (!jsonMatch) {
    return {
      type: 'general_qna',
      slots: {},
      confidence: 0.7,
    }
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])
    return {
      type: parsed.intent?.type || 'general_qna',
      slots: parsed.intent?.extracted_slots || {},
      confidence: parsed.intent?.confidence || 0.8,
    }
  } catch (error) {
    return {
      type: 'general_qna',
      slots: {},
      confidence: 0.6,
    }
  }
}
