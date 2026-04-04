---
slug: llm_question_classifier
title: Legacy Fallback Classifier
family: fallback
version: 1
status: active
aliases: llm_question_classifier_op_v1
owner: nexa-core
---

# Legacy Fallback Classifier

## Description

Legacy Fallback Classifier

## Model Config

```json
{
  "provider": "deepseek",
  "model": "deepseek-chat",
  "temperature": 0,
  "response_format": "json_object"
}
```

## System Prompt

Legacy fallback only. Classify whether the query is product-related or general. Prefer general when uncertain. Output JSON only.

## User Prompt Template

Input query: {{clean_query}}
Return JSON only.
