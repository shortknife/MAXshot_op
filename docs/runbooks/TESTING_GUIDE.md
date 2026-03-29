**【严格 read-only】不写入数据 / 不触发 Execution / 无自动反馈**

# Testing Guide (MVP Loop Manual Verification)

> 目标：验证 MVP 小闭环 **Execution → Outcome Snapshot → Human Insight Review → Insight Candidate →（人工审批）Write-back/Weight**
> 强调：**严格 read-only（除人工审批写入），不自动触发 Execution**

---

## 1. 测试目标

必须同时满足：

- **Human Gate 强制**：所有写入均需手动确认（勾选 + operator_id）
- **Router 权威**：仅展示 confirmed 历史执行，无自动触发
- **Memory append-only**：所有写入为新增记录，不修改原记录
- **Audit 可回放**：关键事件完整可追踪
- **Insight Candidate 仅字段拼接**：无任何推理/总结

---

## 2. 环境准备

```bash
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os
PORT=3003 NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_READ_ONLY_DEMO=true npm run dev
```

访问：
```
http://localhost:3003
```

---

## 3. 端到端验证路径（6 步）

### Step 1 — Operations Console
**页面：** `/operations`

**输入数据：**
- demo execution 列表（来自 `admin-os/lib/demo-executions.json`）

**预期输出：**
- 红色警示条：**严格 read-only，不写入、不触发 Execution**
- 至少包含：`exec_demo_001`、`exec_demo_004`、`exec_demo_005`

**作用模块：**
- Admin UI 只读队列视图

---

### Step 2 — Audit
**页面：** `/audit?exec_id=exec_demo_001`

**输入数据：**
- `audit_log.events`

**预期输出：**
- Entry Fact 四元组：`entry_id / type / channel / idempotency_key`
- Router Path 顺序 + used_skills

**作用模块：**
- Execution Trace / Audit 可回放

---

### Step 3 — Outcome Snapshot
**页面：** `/outcome?exec_id=exec_demo_001`

**输入数据：**
- `payload` / `result` / `audit_log`

**预期输出：**
- 三段完整显示
- 无写入按钮

**作用模块：**
- Outcome Snapshot（执行结果快照）

---

### Step 4 — Insight Review
**页面：** `/insight-review?exec_id=exec_demo_004`

**输入数据：**
- `result.capability_outputs`
- `audit_log.events`

**预期输出：**
- Attribution（规则化）JSON
- Recommendation（结构化枚举）JSON
- 红色警示条

**作用模块：**
- Evolution Attribution / Recommendation（只读）

---

### Step 5 — Insight Candidate Export
**页面：** `/insight-candidate?exec_id=exec_demo_004`

**输入数据：**
- `payload` + `result` + `evidence.sources`

**预期输出：**
- JSON 只包含：
  - `source_execution_id`
  - `execution_fields.payload/result/evidence.sources`
  - `capability_path`
- 第一行注释：Draft Only

**作用模块：**
- Candidate Export（草稿、无推理）

---

### Step 6 — Write-back / Weight Adjustment（人工确认）
**页面：** `/insight-writeback?exec_id=exec_demo_005`

**输入数据：**
- memory_id（手动填）
- operator_id（手动填）
- attribution（自动计算）

**预期输出：**
- 计算 weight recommendation
- 只有勾选审批后才允许写入
- 成功后应写入新 memory（append-only）
- audit_log 追加三事件

**作用模块：**
- Write-back Human Gate
- Weight Recommendation + Manual Apply

---

## 4. 关键检查点（输出必须出现）

- **Read-only 警示条**
- **Entry Fact 四元组**
- **Router Path + used_skills**
- **Outcome Snapshot 完整字段**
- **Insight Candidate JSON 仅字段拼接**
- **Write-back / Weight Apply 必须人工确认**
- **audit_log 三事件：requested / approved / applied**

---

## 5. 异常场景验证

### A. 修改 demo 数据刷新
- 修改 `admin-os/lib/demo-executions.json`
- 刷新页面应立即更新

### B. 未审批写入
- 不勾选审批 / 不填 operator_id
- 应拒绝提交（按钮禁用）

---

## 6. Bug 报告模板

```
[Bug]
Title: 简述问题

Steps:
1) …
2) …
3) …

Expected:
- …

Actual:
- …

Environment:
- OS:
- Browser:
- Port:
- Commit/Branch:

Artifacts:
- Screenshot
- Console logs
```

---

## 7. 结论

通过以上步骤，应确认 MVP 小闭环已完成：

**Execution → Outcome Snapshot → Human Insight Review → Insight Candidate →（人工审批）Write-back / Weight**

如任一检查点失败，立即阻断 Demo。
