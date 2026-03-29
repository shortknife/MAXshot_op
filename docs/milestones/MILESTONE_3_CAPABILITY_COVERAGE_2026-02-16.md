# Milestone 3 — Capability Coverage Expansion

**Date:** 2026-02-16

## Scope
- Extend intent coverage and capability chains
- Add default template/slots normalization in Router
- Keep DB unchanged, no auto execution

## New Intent Coverage
- ops_summary → data_fact_query + product_doc_qna
- audit_query → data_fact_query (default template: latest_audit_events)
- memory_query → data_fact_query (default template: memory_recent_insights)
- content_brief → content_generator
- product_qna → product_doc_qna

## Router Defaults
- audit_query → template_id=latest_audit_events, slots={limit:20}
- ops_summary → template_id=execution_status_breakdown, slots={days:7}
- memory_query → template_id=memory_recent_insights, slots={limit:10}

## Notes
- Validation to be done via full chain test (Entry → Confirm → Run → Outcome → Audit)
