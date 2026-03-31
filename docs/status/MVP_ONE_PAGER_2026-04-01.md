# MAXshot MVP One Page

Date: 2026-04-01
Workspace: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode`
Status: `MVP OK`

## 1. MVP Conclusion

MAXshot can now be treated as a usable MVP.

Current system status:
- online question entry is available
- TG / web-side asking is supported
- canonical business facts are live and queryable
- core follow-up context is available
- bounded memory exists
- audit-first delivery path is in place

This is a usable, bounded MVP.
It is not the final version of the product.

## 2. What The MVP Can Do

The MVP currently supports:
- business fact query
- yield / APY query
- vault list query
- execution detail query
- rebalance reason / no-rebalance reason query
- ranking / trend / extremes query
- basic compare query
- limited follow-up question handling
- canonical data read from fact tables
- memory writeback / weight adjustment / lightweight recall

Supported practical filters include:
- `chain`
- `protocol`
- `vault_keyword`
- relative time phrases such as `今天` `昨天` `本周` `上周` `本月` `上月` `最近N天`

## 3. What The MVP Explicitly Does Not Promise

The MVP should not be described as supporting:
- complex strategy execution
- strong open-ended reasoning across arbitrary topics
- unlimited multi-turn clarification
- mature long-term personalized memory
- fully autonomous strategy planning and execution

If users ask beyond the supported boundary, the system should clarify, constrain, or degrade.
It should not pretend unsupported capability exists.

## 4. Multi-Turn And Memory Boundary

### Multi-turn

The product supports multi-turn context, but in a bounded way.

Current behavior:
- normal follow-up context inheritance exists
- chain / protocol / vault / time-window context can carry forward
- clarification loops are intentionally capped
- default clarification cap is `3` turns

Important:
- this does **not** mean the entire session only has 3 turns
- it means clarification-style repair loops are bounded and will not run forever

### Memory

Current memory should be described as:
- `thin memory layer`
- `MVP memory`

What exists now:
- memory writeback
- weight recommendation
- weight apply
- router-side memory selection
- lightweight recall from recent context and active context

What does not exist yet as a mature capability:
- strong long-term user memory
- strong semantic retrieval memory
- full Working Mind synthesis
- durable user preference profile memory

## 5. Current Product Interpretation

The correct interpretation of the product today is:

`deterministic, auditable, bounded business query system`

It should **not** be positioned as:
- open-domain chat assistant
- autonomous DeFi strategy brain
- rich personalized agent with deep long-term memory

## 6. Operational Readiness

The MVP can be used now, assuming deployment and runtime config remain healthy.

Operationally, the system is ready for:
- internal use
- release-oriented iteration
- live question answering on supported business scopes
- UAT and feedback collection

## 7. Recommended External Description

A concise external description for the current stage:

> MAXshot MVP now supports TG and online business Q&A over live fact data, including yield, vault, execution, and rebalance explanations, with limited follow-up context and lightweight memory. The system is production-bounded: it answers within supported business scopes, but does not yet promise complex strategy execution or strong long-term personalized memory.

## 8. Post-MVP Priorities

Recommended next-stage priorities:
1. structured interaction log for learning corpus
2. system learning assets for intent / capability / template improvement
3. stronger user-memory model after user identity exists
4. performance optimization
5. edge-phrasing hardening
6. richer execution and strategy explanation quality
