# CC-02 DataFactQuery — 产品级契约

> **Owner**: LEO  
> **版本**: v1.0 | **阶段**: P0  
> **依据**: MAXshot_产品架构设计_v5.1 §3.4 SQL Engine 三级策略  
> **位置**: FSD/02_Layer_Model/Capability_Contracts/

---

## 1. 产品定义

DataFactQuery 让用户用自然语言查询 DeFi 运营数据，并得到可信的、有来源支撑的答案。

**一句话**：把用户问题翻译成 SQL 并返回人话结果，准确率 ≥ 90%，不猜、不编造。

---

## 2. SQL Engine 三级策略

| 级别 | 触发条件 | 机制 | 说明 |
|------|---------|------|------|
| **Tier 1** | 意图匹配已有模板 | 参数化 SQL 模板直接执行 | 最快、最可靠；模板来自历史沉淀 |
| **Tier 2** | Tier 1 未命中 | LLM 生成 SQL + Schema/白名单校验 | 受控生成；校验不通过拒绝执行 |
| **Tier 3** | Tier 2 成功 N 次 | 人工审核后升级为 Tier 1 模板 | 沉淀机制；持续提升 Tier 1 覆盖率 |

### 2.1 Tier2 硬约束（v5.1 必守）

| 约束 | 说明 |
|------|------|
| **Schema 来源** | Tier2 的 Schema **必须**从 `admin-os/lib/sql-engine/schema_index.json` 动态生成（表/视图 + 列 + description_zh + query_patterns）。**禁止** Tier2 使用单表或硬编码 Schema；以保证「Tier1 不中时仍能基于 index 推演 SQL」。 |
| **用户可见话术** | Tier1 不中时，用户必须得到**答案**或**友好提示**（如「当前无法解析该问题，请换一种问法或指定金库/时间范围」）。**禁止**将「SQL Statistics 未匹配」等内部/调试话术直接暴露给用户。 |

### 2.2 回复合格标准（示例 Query，验收用）

以下为 data_fact_query **用户可见回复**的正式验收标准（示例：「现在有几个金库？分别部署在那几个链呢？」）。详细与兜底文案见 `4.Working/LEO_产品与研发对齐机制_Data_Query_2026-03.md`。

| 级别 | 说明 |
|------|------|
| **理想** | 一句话或一小段直接答全（如：「目前有 3 个金库在运行，分别部署在 Arbitrum、Ethereum、Base。」） |
| **可接受** | 金库数量与链信息分开给，但都给了 |
| **底线** | 至少答出其中一问且正确（如仅有「目前有 X 个金库」） |
| **不合格** | 出现内部话术且未给出任何金库数或链信息；或答非所问 |

**无实质答案时的兜底**：统一展示产品认可的兜底文案，不展示内部/调试话术。

---

## 3. 意图边界

**支持的查询类型（metric 白名单）**：
- DAU / TVL / APY / success_rate / vault_count / vault_status / allocation

**不支持的查询类型（转 graceful rejection）**：
- 产品设计目的、业务策略等概念性问题 → 拒绝，提示"请参阅产品文档或联系团队"
- 写入、更新、删除操作 → 拒绝，提示"此查询涉及数据修改，不被支持"

---

## 4. 输入

```
user_query: string              // 自然语言问题
session_id: string
context_snapshot: object        // 可选，上一轮对话上下文
entry_type: string              // 透传自 Router
```

**说明**：完整输入契约见 `4.Working/Capability_Contract_v1_落地版_Data_Query_2026-02.md` §3.1（与本文同属 Decision_Layer/4.Working）。

---

## 5. 输出

**硬约束（Contract authority）**：**输出字段语义以 Output Contract 为唯一真相**；前端与测试均以 Contract 为准。CC_02 本节仅作产品侧理解参考，**不再单独定义另一套输出结构**，避免双规范漂移。执行契约见落地版 §3.2 及 §2.3。

以下为与 Contract 的**概念对应**（非独立规范）：
- `answer` ← Contract `result.summary`
- `result_type` ← Contract 可选 `result_type` 或 status/error 推断
- `data` ← Contract `result.rows` / `result.row_count`
- `sql_tier_used` ← Contract `provider.name` / 可选 `sql_tier_used`
- `needs_clarification` / `clarification_message` ← Contract `error.code=missing_required_clarification` + `error.message`
- `rejection_reason` ← Contract `error.message`
- `evidence` ← Contract `evidence.sources` / `evidence_chain`

---

## 6. needs_clarification 规则

当以下情况出现时，**不执行 SQL**，返回 `needs_clarification: true`：
- 问题涉及 DAU 等需要时间范围但未指定的指标
- 问题涉及多个 Vault 但未指定目标
- 问题语义模糊，Tier 1/Tier 2 均无法可信解析

引导话术示例："请问您想查询的是哪个 Vault？" / "请确认查询时间范围（如：最近 7 天）"

**澄清时须带可选列表（导 slug）**：当缺 vault 时，除话术外，payload 须带现存 vault 列表（slug/name）供用户选或补充；具体字段见 Output Contract 扩展。

---

## 6.5 SQL Provider 边界（Vanna / 任意 Text-to-SQL）— 硬规则

**分工**：系统负责多轮澄清、vault 候选列表、理解声明、审计/Gate/重试/回退；Vanna 只负责「清晰问题 → SQL（+ 可执行结果）」；**Vanna 不是产品流程引擎，只是 SQL generation provider。**

| 规则 | 说明 |
|------|------|
| **R1** | **clarification_complete=true 前，禁止调用 Vanna（或任何 Text-to-SQL provider）生成 SQL。** |
| **R2** | **调用 Vanna 时输入必须是结构化槽位**（vault / time / metric_agg 等）。 |
| **R3** | **返回结果必须经 Gate 验收后，再由系统组装「我的理解是…」**。 |
| **R4** | **用户纠偏时只更新槽位并重新生成 SQL**，不重走全链路。 |

执行契约与平台接口见 v2 备忘录及落地版 §2.4。

---

## 7. Side Effect 规则

- DataFactQuery 是**纯只读**操作
- 允许写入：`ops_context_memory`（对话记录）、`audit_logs`（执行审计）
- 禁止对任何业务数据表执行写入、更新、删除

---

## 8. 验收标准

- [ ] 50+ 测试集问题准确率 ≥ 90%（语义等价或 Validator 通过）
- [ ] needs_clarification 分支正确触发（不执行 SQL）
- [ ] 产品概念性问题返回 `rejection`，不尝试 SQL 生成
- [ ] Tier 1 → Tier 2 fallback 逻辑正确（Tier2 使用 schema_index 动态 Schema，见 §2.1）
- [ ] Tier1 不中时用户仅见答案或友好提示，不见内部/调试话术（见 §2.1）
- [ ] Tier 3 沉淀触发条件明确（达到 N 次 + 人工审核）
- [ ] `evidence` 字段包含可追溯的数据来源

---

## 9. 场景对话示例（验收基线 & 跨角色共识）

> 以下对话示例同时服务于：用户理解产品能力、开发验收输出正确性、PM 核对产品体验。

**场景 A：简单数据查询（Happy Path）**
```
用户: 现在有几个金库？
系统: 目前有 3 个金库在运行。
```

**场景 B：多维度查询**
```
用户: 现在有几个金库？分别部署在哪几个链？
系统: 目前有 3 个金库在运行，分别部署在 Arbitrum。
```

**场景 C：指标查询**
```
用户: USDC 金库的 APY 是多少？
系统: dForce USDC 金库当前 24h 平均 APY 为 8.7%，数据来自链上快照。
```

**场景 D：需要澄清（Clarification）**
```
用户: 最近 DAU 怎么样？
系统: 请确认查询时间范围（如：最近 7 天、最近 30 天）。
```

**场景 E：边界外拒绝**
```
用户: 这个 Vault 的设计目的是什么？
系统: 此类产品概念问题暂不在数据查询范围内，请参阅产品文档或联系团队。
```

**场景 F：无数据时的兜底**
```
用户: BTC 金库的 TVL 是多少？
系统: 当前无法解析该问题，请换一种问法或指定金库/时间范围。
```

---

## 10. 不在本 Capability 范围内

- 产品文档问答（属于 ProductDocQnA）
- 内容生成建议（属于 ContentGenerator）
- 发布操作（属于 Publisher）

---

## 11. 执行契约与平台接口（v2）

本 Capability 的**平台级执行契约**（Input/Output Schema、Gate、重试阶梯、Provider 接口、分阶段改造）见（均在 `4.Working/` 下）：

- `4.Working/架构设计备忘录_Capability_Contract_v2_2026-02.md`
- `4.Working/Capability_Contract_v1_落地版_Data_Query_2026-02.md`（执行基线）
- `4.Working/开发调整_Capability_Contract_v2_Data_Query_2026-02.md`（开发改动清单）

CC_02 本文为**产品定义与验收**；接口与 Gate/Provider 以 v2 备忘录为准。

---

**契约版本**: v1.1 | **最后更新**: 2026-03（§2.1 Tier2 硬约束）
