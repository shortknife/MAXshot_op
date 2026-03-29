# LLM Usage Audit (2026-03-21)

## Conclusion
The current system is **not LLM-only**. It is a mixed pipeline:
- LLM is used primarily for **intent/capability matching**.
- Prompt registry is also referenced by `content_generator` and `product_doc_qna`.
- Several important downstream behaviors are still **rule-based**:
  - clarification state stitching
  - session follow-up context injection
  - yield clarification policy
  - fallback classification heuristics
  - time-window detection

This is why an explicit natural-language date range can still fail even though the entry analyzer uses an LLM.

## Where LLM is actually used

### 1. Intent / capability matching
- File: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/intent-analyzer/deepseek-client.ts`
- Entry: `callDeepSeek(rawQuery, sessionContext)`
- Real HTTP model call: `callDeepSeekApi(...)`
- Env vars:
  - `DEEPSEEK_API_KEY`
  - `DEEPSEEK_API_BASE_URL`
  - `DEEPSEEK_INTENT_MODEL`
- Prompt source:
  - primary: `intent_analyzer`
  - fallback: `llm_question_classifier`
- Injected dynamic data:
  - `{{capability_list}}`
  - `{{capability_registry_version}}`
  - `{{capability_registry_active_count}}`
  - `{{clean_query}}`
  - `{{context_payload}}`
- Required output shape (schema hint appended in code):
  - `matched_capability_ids`
  - `matched_capability_id`
  - `intent_type`
  - `in_scope`
  - `need_clarification`
  - `clarification_question`
  - `clarification_options`
  - `slots`
  - `confidence`

### 2. Content generation capability
- File: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/capabilities/content-generator.ts`
- Prompt lookup: `getPromptBySlug('content_generator')`
- Important note: current implementation **does not call an external LLM**. It uses local template logic and only records prompt metadata in evidence/metadata.

### 3. Product doc QnA capability
- File: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/capabilities/product-doc-qna.ts`
- Prompt lookup: `getPromptBySlug('product_doc_qna')`
- Important note: current implementation **does not call an external LLM**. It reads `doc_path` if present; otherwise returns a safe fallback (`missing_doc_path`). Prompt metadata is recorded only.

### 4. Prompt registry loader
- File: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/prompts/prompt-registry.ts`
- Reads prompts from:
  - Supabase `prompt_library`
  - fallback CSV: `docs/reference/maxshot/prompts/prompt_library_rows0221.csv`
- This is prompt infrastructure, not an LLM call by itself.

## Prompt texts currently in use

### `intent_analyzer` (v2)
Source: `docs/reference/maxshot/prompts/prompt_library_rows0221.csv`

System prompt starts with:
- `You are the MAXshot Intent Analyzer...`
- classify into `ops_query`, `marketing_gen`, `documentation`, `mixed`, `unknown`
- normalize slots
- merge `session_context` with `user_query`

User template starts with:
- `{"user_query": "{{clean_query}}", "session_context": {{context_payload}}, "vault_list": [...]}`

### `llm_question_classifier` (v1)
Source: `docs/reference/maxshot/prompts/prompt_library_rows0221.csv`

System prompt starts with:
- `You are MAXshot's intelligent question classifier...`
- classify `product|general`
- examples focus on tweet-style product classification

This is currently a fallback prompt and is not ideal for the main app flow.

### `content_generator` (v1)
Source: `docs/reference/maxshot/prompts/prompt_library_rows0221.csv`

System prompt starts with:
- `You are the MAXshot Content Generator...`
- use only provided data/context
- output valid JSON only

Current code does **not** actually send this to an LLM.

### `product_doc_qna` (v1)
Source: `docs/reference/maxshot/prompts/prompt_library_rows0221.csv`

System prompt starts with:
- `You are the MAXshot Product Documentation Q&A assistant...`
- answer only from provided doc excerpts
- output JSON with `answer` and `source_refs`

Current code does **not** actually send this to an LLM.

## Why time-range recognition still looks "hardcoded"
Because the relevant control points are still rule-based:

### Clarification state stitching
- File: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/query-clarification.ts`
- Behavior:
  - if there is pending clarification in the same session, new input becomes:
  - `baseQuery；补充条件：newQuery`
- This can contaminate later intent analysis.

### Time-window detection
- File: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/query-clarification.ts`
- Current function:
  - `hasTimeWindow(text)`
- Current regex is limited to patterns like:
  - `最近|last|过去|上周|本周|今天|昨日|7天|30天|本月|近|week|day|month`
- Explicit date ranges like `3月2日到3月16日` are not reliably parsed here.

### Follow-up context injection
- File: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/session-context.ts`
- This can append hints like:
  - `最近7天`
  - `按平均 APY 口径`
  - `沿用链 ...`
- This is also rule-based.

### Fallback classification heuristics
- File: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/intent-analyzer/deepseek-client.ts`
- `buildFallbackResult(...)` still contains hardcoded signals.
- Example bug: `normalized.includes('maxshot')` contributes to business intent, which can misroute doc questions.

## Practical takeaway
Current behavior is:
- **LLM at the front door**
- **rules in the middle**
- **capability execution at the back**

So the answer to "难道我们的识别不是通过 LLM 识别的么？" is:
- **Partly yes, but not end-to-end.**
- The initial capability match uses an LLM.
- Several critical downstream decisions still rely on deterministic rules, which is exactly why date-range behavior still looks specific and brittle.

## Immediate engineering implications
If we want `3月2日到3月16日之间...` to work correctly, the fix is not "just change the prompt". We need at least:
1. absolute date-range parsing in the clarification/session layer
2. better separation between "new question" and "clarification supplement"
3. weaker fallback dependence on business hardcoded keywords
