# Prompt Library OP v1

## Purpose
This document is the local prompt redesign source of truth for `admin-os`.

It exists because the current runtime is mixed:
- entry intent matching uses an LLM
- clarification/follow-up/time parsing still contains rule-based logic
- some prompts are loaded from `prompt_library`, but the capability implementation does not actually call an LLM

The goal of this prompt set is to make the contracts explicit before migrating runtime usage.

## Current diagnosis

### What is wrong today
1. `intent_analyzer` is still partly built around broad intent labels instead of execution-ready capability matching.
2. Prompt contract and code contract are inconsistent.
3. Time extraction is under-specified.
4. Clarification logic is not fully represented in the prompt contract.
5. Some prompts exist in the registry but the capability implementation is still local-template or fallback-based.

### Practical result
A query like:

`3月2日到3月16日之间最高的APY是那个Vault呢？具体是多少值？其TVL总计多少呢？`

should be directly executable, but the current runtime may still ask for a time range because downstream regex logic does not fully recognize absolute ranges.

## Proposed prompt inventory

### 1. `intent_analyzer_op_v1`
Primary runtime entry prompt.

**Role**
- capability matcher
- slot extractor
- clarification decision maker

**Key changes**
- registry-first
- outputs `matched_capability_ids`
- supports absolute date range extraction
- keeps clarification inside the prompt contract

**Required output**
```json
{
  "matched_capability_ids": ["capability.data_fact_query"],
  "primary_capability_id": "capability.data_fact_query",
  "in_scope": true,
  "need_clarification": false,
  "clarification_question": "",
  "clarification_options": [],
  "slots": {
    "scope": "yield",
    "metric": "apy",
    "aggregation": "max",
    "entity": "vault",
    "date_from": "2026-03-02",
    "date_to": "2026-03-16",
    "timezone": "Asia/Shanghai",
    "return_fields": ["vault_name", "apy_value", "tvl_total"],
    "question_shape": "top_1_in_period"
  },
  "confidence": 0.95
}
```

### 2. `product_doc_qna_op_v1`
For product-definition and documentation questions.

**Important**
- This prompt only becomes useful after `product_doc_qna` is connected to a real MAXshot document source.

### 3. `content_generator_op_v1`
For actual LLM-driven content generation.

**Important**
- Current `content_generator` implementation is mostly local-template based.
- This prompt is future-ready and should be adopted when we switch the capability to real generation.

### 4. `llm_question_classifier_op_v1`
Deprecated fallback.

**Reason**
- Once `intent_analyzer_op_v1` is adopted, this classifier should no longer be part of the main path.

## Main design choices

### A. Capability-first, not intent-first
The prompt should answer:
1. what capability matches
2. what slots were extracted
3. whether clarification is still required

Not:
1. which abstract intent bucket this belongs to
2. followed by code trying to infer execution shape later

### B. Absolute date range is first-class
The prompt must support:
- `2026-03-02 到 2026-03-16`
- `3月2日到3月16日`
- `3/2-3/16`

If we only model `date_from`, the query is still incomplete.

### C. Clarification must stay inside the contract
If the prompt does not return:
- `need_clarification`
- `clarification_question`
- `clarification_options`

then code will keep re-implementing understanding logic with rules.

### D. Prompt and runtime must use the same schema
Prompt-side natural language schema and runtime-side strict schema can be different in representation, but must describe the same slots.

## Files created in this batch

### Machine-readable local prompt config
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/configs/prompt-library-op/prompt_library_op_v1.json`

### This explanatory document
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/prompts/PROMPT_LIBRARY_OP_V1_2026-03.md`

## What this does not do yet
1. It does not write into Supabase `prompt_library`.
2. It does not automatically switch runtime to these new prompts.
3. It does not solve `product_doc_qna` data-source absence.

## Recommended next step
Adopt `intent_analyzer_op_v1` first.

That requires synchronized changes in:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/intent-analyzer/deepseek-client.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/intent-analyzer/intent-parsing.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/chat-request-preprocess.ts`
- clarification/session logic that currently overrides prompt understanding
