# CC-05 ProductDocQnA — 产品级契约

> **Owner**: LEO  
> **版本**: v1.0 | **阶段**: P1  
> **依据**: MAXshot_产品架构设计_v5.1 §2.4 Capability Layer

---

## 1. 产品定义

ProductDocQnA 让内部团队和用户通过自然语言查询 MAXshot 的产品文档、FAQ、协议说明，获得有引用来源的答案。

**一句话**：有引用的 RAG 问答，不编造、有出处。

---

## 2. 覆盖范围（P1 阶段）

| 支持 | 不支持 |
|------|--------|
| FAQ 库中已有的产品问题 | 运营数据查询（→ DataFactQuery） |
| 协议/Vault 设计说明 | 内容生成请求（→ ContentGenerator） |
| MAXshot 功能使用说明 | 需要实时数据的问题（→ DataFactQuery） |

---

## 3. 与 DataFactQuery 的边界

| 问题类型 | 路由到 |
|---------|--------|
| "最近 7 天 TVL 是多少？" | DataFactQuery |
| "这个 Vault 的设计目的是什么？" | ProductDocQnA |
| "APY 是如何计算的？" | ProductDocQnA |
| "当前有多少活跃 Vault？" | DataFactQuery |

**P0 阶段（ProductDocQnA 未上线前）**：Router 对产品概念类问题返回 `rejection`，话术为"此类问题暂不支持，请参阅产品文档或联系团队"。不得尝试 Tier 2 SQL 猜答。

---

## 4. 输入

```
user_query: string
session_id: string
entry_type: string              // 透传自 Router
```

---

## 5. 输出

```
answer: string                  // 人话回答
citations: [                    // 引用来源（必须存在）
  {
    source_id: string,
    source_title: string,
    excerpt: string,
    relevance_score: number
  }
]
confidence: 'high' | 'medium' | 'low'
fallback_used: boolean          // 是否降级到通用回答
```

---

## 6. 引用规则（核心）

- 每个回答**必须**包含至少 1 条 `citations`
- `confidence = 'low'` 且无法找到匹配来源时：返回"暂无相关文档，建议联系团队"，禁止生成无来源的回答
- 引用来源必须来自 `faq_sources` 表（`content` + `metadata` 字段）

---

## 7. Side Effect 规则

- ProductDocQnA 是**纯只读**操作
- 允许写入：`audit_logs`（问答审计）
- 禁止写入任何业务数据

---

## 8. 验收标准

- [ ] RAG 查询召回准确率 ≥ 85%（基于预设测试集）
- [ ] 每条回答包含 `citations`，不允许空引用回答
- [ ] `confidence = 'low'` 时有明确降级话术，不编造答案
- [ ] 运营数据类问题不在此 Capability 内处理（正确拒绝）
- [ ] `faq_sources` 表作为唯一知识库来源

---

## 9. 场景对话示例（验收基线 & 跨角色共识）

**场景 A：FAQ 回答**
```
用户: APY 是怎么计算的？
系统: APY 基于 24 小时链上收益进行年化计算，公式为 (1 + daily_rate)^365 - 1。
      来源: FAQ #12「APY 计算说明」
      confidence: high
```

**场景 B：产品概念**
```
用户: MAXshot 的产品逻辑是什么？
系统: MAXshot 是小微团队增长操作系统，核心是 Ops 数据可信化 + Marketing 策略闭环化，
      通过确定性调度（Router）+ 受控 LLM + 能力网络实现。
      来源: 产品架构文档 §1.1
      confidence: high
```

**场景 C：低置信度降级**
```
用户: Morpho 协议的底层清算机制是什么？
系统: 暂无相关文档覆盖此问题，建议联系团队获取详细信息。
      confidence: low / fallback_used: true
```

**场景 D：应路由到 DataFactQuery**
```
用户: 当前有多少活跃 Vault？
系统: 此问题涉及实时数据，已转交数据查询处理。
      （Router 路由至 data_fact_query）
```

---

## 10. 不在本 Capability 范围内

- 实时数据查询（属于 DataFactQuery）
- 内容生成（属于 ContentGenerator）
- 外部知识库接入（P2+ 范围）

---

**契约版本**: v1.0 | **最后更新**: 2026-02-19
