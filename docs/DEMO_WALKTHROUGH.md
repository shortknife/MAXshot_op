**【严格 read-only】不写入数据 / 不触发 Execution / 无自动反馈**

# Demo Walkthrough (Read-only)

> **【严格 Read-only】本演示不写入数据、不触发 Execution、无自动反馈。所有动作均为人工确认后才可执行。**

## 1. Operations Console（人工确认后…）
- 打开 `/operations`
- 观察 Read-only 警示条与执行队列
- 选择 `exec_demo_001` / `exec_demo_004` / `exec_demo_005`

**说明**：此页面仅展示执行队列，不触发任何执行。

## 2. Audit（人工确认后…）
- 点击执行卡片进入 `/audit?exec_id=...`
- 查看 Entry Fact 与 Router Path

**说明**：仅展示审计日志，所有事件为历史记录。

## 3. Outcome Snapshot（人工确认后…）
- 进入 `/outcome?exec_id=...`
- 查看 payload / result / audit_log

**说明**：快照为只读视图，不会触发任何写入。

## 4. Insight Review（人工确认后…）
- 进入 `/insight-review?exec_id=...`
- 查看 Attribution（规则化）与 Recommendation（结构化枚举）

**说明**：推荐仅供人工参考，不自动生效。

## 5. Insight Candidate Export（人工确认后…）
- 进入 `/insight-candidate?exec_id=...`
- 复制 JSON / Markdown（Draft Only）

**说明**：导出为草稿，不写入系统。

## 6. Insight Write-back / Weight Adjustment（手动触发…）
- 进入 `/insight-writeback?exec_id=...`
- 填写 operator_id，勾选审批后可执行写回
- 权重调整需先计算推荐，再手动审批

**说明**：所有写回/权重调整均需人工审批，默认不触发。

---

### 演示重点（对外说明）
- Router 权威：只有 confirmed 才执行
- Human Gate 强制：所有写入必须人工审批
- Memory append-only：历史不改，只新增记录
- Audit 可回放：所有事件可追踪
