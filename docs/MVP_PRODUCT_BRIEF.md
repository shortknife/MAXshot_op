# MVP Product Brief (v0.1 Read‑only)

**【严格 read-only】不写入数据 / 不触发 Execution / 无自动反馈**

## 1. 产品定位与当前价值链总结
MAXshot v5.0 MVP 是一个 **可审计、可回放、可人工介入的执行中枢**。它提供从 Entry 到 Outcome 再到 Human Insight 的闭环路径，并在任何“写入/执行”前强制 Human Gate。

**当前价值链：**
- 透明：完整 Execution Trace & Audit
- 可控：Router 权威 + Human Gate
- 可审计：事件可回放
- 可迁移：Read‑only 保障低风险演示

---

## 2. 已实现核心闭环（MVP）
**闭环路径：**
**Entry → Human Gate → 双 Capability → Attribution → Recommendation → Write-back → Memory append-only 权重演化**

**说明：**
- Entry 仅在人工确认后进入执行
- Capability 输出标准化（result / evidence / audit）
- Attribution/Recommendation 规则化生成（无推理）
- Write-back 与 Weight 调整均需人工审批
- Memory 始终 append-only，不修改历史

---

## 3. 宪法关键约束重申
- **Router 权威**：仅在 confirmed 执行
- **Human Gate 强制**：所有写入须人工审批
- **Memory append-only**：只新增，不修改/删除
- **No Auto**：无自动执行、无自动写入、无隐式决策

---

## 4. 演示路径（简要 walkthrough）
1. `/operations` 观察执行队列（read-only）
2. `/audit?exec_id=...` 查看 Entry Fact + Router Path
3. `/outcome?exec_id=...` 查看 Outcome Snapshot
4. `/insight-review?exec_id=...` 查看 Attribution + Recommendation
5. `/insight-candidate?exec_id=...` 导出 Candidate（草稿）
6. `/insight-writeback?exec_id=...` 手动审批写回 / 权重调整

---

## 5. 当前局限与下一阶段方向
**当前局限：**
- 强制 read-only demo（写入仅用于审批演示）
- 数据源以 mock 为主，真实接入有限
- 规则化推荐缺乏策略学习

**下一阶段方向：**
- 逐步接入真实业务数据源（只读）
- 扩展 Capability 覆盖更多 Ops / Marketing 场景
- 提升审计视图可视化与合规模型

---

## 6. 技术栈与运行方式
- **Frontend**：Next.js + React
- **Backend**：Next.js API Routes
- **Data**：Supabase（_op 表）

**运行：**
```bash
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os
PORT=3003 NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_READ_ONLY_DEMO=true npm run dev
```

---

**【严格 read-only】不写入数据 / 不触发 Execution / 无自动反馈**
