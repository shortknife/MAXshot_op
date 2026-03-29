

# 📋 MAXshot 运营数据库终极优化方案 (v4.0)

**文档状态**：正式定稿版 (Ready for Implementation)
**核心哲学**：**SQL 存事实 (Fact Layer)，RAG 存因果 (Narrative Layer)。**

---

## 第一阶段：全局资产盘点与存储哲学 (Asset Inventory)

我们现有的数据库不是杂乱的堆砌，而是一套基于 **“星型模型 (Star Schema)”** 的演进体系。

### 1.1 核心事实表 (SQL Fact Tables)

| 表名 | 业务定位 (Why) | 状态 |
| --- | --- | --- |
| **`fact_execution_summary`** | **财务总账**：记录 TVL、AUM 和执行状态，用于生成日报/周报。 | Active |
| **`allocation_snapshots`** | **持仓分布**：记录资金在各个协议（Morpho, Aave）的即时分布。 | Active |
| **`rebalance_decisions`** | **决策记录**：记录调仓理由及是否触发再平衡，是逻辑审计的核心。 | **需优化** |
| **`market_metrics`** | **市场扫描**：记录 Agent 决策时看到的实时利率和备选市场环境。 | **需优化** |
| **`market_audit_snapshots`** | **风控审计**：外部爬虫数据比对，确保 Agent 认知数据与链上一致。 | **需重启** |

### 1.2 维度与归档 (Support & Dim)

* **`dim_markets`**：唯一事实字典，负责去冗余，所有表通过 `market_id` 关联。
* **`market_snapshots_archive`**：高精细度归档，存储流动性、利用率等“冷数据”。

### 1.3 语义记忆 (RAG Layer)

* **`execution_logs_rag`**：存储 Agent 的思考逻辑、巡逻日志和环境噪音。

---

## 第二阶段：三方数据审计与 Gap 分析 (Audit & Gap)

通过对比 **Cleaned JSON** 与 **RPC v3**，我们发现以下数据流失点，必须在 v4 版本中闭环：

### 2.1 决策链路流失

* **冷却期拦截**：`waitingPeriodBlocked` 字段在 JSON 中存在，但在 SQL 中被碎裂为长文本。
* **阈值达成情况**：`thresholdsMet` 数组未被结构化存储，导致无法量化“为何没动作”。

### 2.2 RAG 质量偏差

* **存量问题**：约 25% 的数据存在 `metadata` 为 null 的情况，导致“车牌丢失”。
* **职责重叠**：RAG 曾尝试存储数值指标（max_apy），导致 Agent 检索时产生路径模糊。

---

## 第三阶段：最终重整指令集 (Action Plan)

这是交给 **Alex (技术落地)** 和 **Mike (质量控制)** 的核心执行任务。

### 3.1 数据库“考古清理” (Priority: P0)

* **任务**：物理清理 `execution_logs_rag` 中的坏账数据。
* **SQL 脚本**：
```sql
DELETE FROM execution_logs_rag 
WHERE metadata->>'execution_id' IS NULL 
OR metadata->>'vault_name' IS NULL;

```


* **目标**：确保 AI 只检索修复后的、具有强索引的高质量记录。

### 3.2 SQL 事实层升级 (Priority: P0)

**任务：发布 RPC 函数 `process_log_data v4`。**

* **表结构变更**：在 `rebalance_decisions` 中新增字段：
* `is_blocked` (boolean): 记录冷却期拦截。
* `rebalance_needed` (boolean): 记录逻辑判定。
* `threshold_details` (jsonb): 记录偏差值等数值细节。


* **写入频率**：**心跳写入**（每分钟一次），作为财务曲线的唯一源。

### 3.3 RAG 叙事层升级 (Priority: P1)

**任务：调整 n8n Step 14 写入逻辑。**

* **写入频率**：**事件驱动**（只有决策变动、被拦截、或每小时例行采样时才写入）。
* **Metadata 瘦身 (8 维标签)**：
> `execution_id`, `vault_name`, `chain_name`, `asset`, `protocol_name`, `is_blocked`, `apy_level`, `created_at`


* **逻辑剔除**：不再将 `max_apy` 等纯数值存入 Metadata，Agent 若需数值必须路由至 SQL。

---

## 系统联动逻辑 (Agent Routing Logic)

为了让 Agent 在回答问题时不混淆“事实”与“叙事”，必须遵循以下路径：

1. **统计/数值问答** (如：“USDC 金库平均 APY 是多少？”)
* 👉 **工具路径**：SQL Tool -> `fact_execution_summary` / `market_metrics`。


2. **因果/追溯问答** (如：“上周三下午为何被拦截了？”)
* 👉 **工具路径**：RAG Tool -> 根据 `execution_id` 检索 `rebalance_reason`。



---

## 📅 落地 CheckList (Alex 专用)

* [ ] **清理**：执行 RAG 历史 null 数据清理。
* [ ] **建表**：执行 `rebalance_decisions` 字段新增 DDL。
* [ ] **RPC**：更新 `process_log_data` 至 v4，确保 Candidates 列表全量进入 `market_metrics`。
* [ ] **n8n**：修改 RAG 写入节点，改为事件触发，并映射 8 维 Metadata。
* [ ] **验证**：通过 Supabase Dashboard 确认 `market_audit_snapshots` 已恢复数据注入。

---
