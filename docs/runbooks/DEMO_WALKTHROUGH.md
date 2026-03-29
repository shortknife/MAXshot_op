# Demo Walkthrough (Phase 1: Live + Auditable)

> 目标：用一条完整链路演示 MVP 的“入口 → Confirm → Run → Outcome → Audit”。
> 本脚本支持 **可执行演示**（非 read-only）。

---

## 0. Preconditions
1. Admin OS 已启动（写入允许）：
   - `NEXT_PUBLIC_READ_ONLY_DEMO=false`
   - `NEXT_PUBLIC_WRITE_ENABLE=true`
   - `WRITE_CONFIRM_TOKEN` 已设置
2. 登录 `/login`
3. 准备 `operator_id=admin` 与 `confirm_token=WRITE_CONFIRM_TOKEN`

---

## 1. Demo Path A — Ops Template Query（主流程）

### A1) Create Execution
- 打开 `/ops`
- 可选：Intent Demo 一键示例 → **Analyze Intent**
- 勾选 **Use SQL Template (Read-only)**
- 选择模板：`latest_executions`
- Slots：`{"limit":3}`
- 点击 **Create Execution**

### A2) Confirm
- 打开 `/confirmations`
- 找到刚创建的 execution
- 填写：
  - `operator_id=admin`
  - `confirm_token=WRITE_CONFIRM_TOKEN`
- 点击 **Confirm**

### A3) Run
- 打开 `/operations`
- 找到该 execution，点击 **Run**

### A4) Audit / Outcome
- 打开 `/audit?exec_id=...`
  - 观察：`entry_created` → `execution_confirmed` → `sql_template_*`
- 打开 `/outcome?exec_id=...`
  - 查看 payload / result / audit_log

---

## 2. Demo Path B — Replay / Compare（可选）

### B1) Replay
- `/operations` → **Replay**
- 预期：`execution_replay_requested`，若返回新 execution_id 会跳转到 `/audit`

### B2) Compare
- `/outcome?exec_id=...`
- 填 `counterpart_execution_id` → **Compare With**
- 预期：Compare Result 区块出现

---

## 3. Demo Path C — Writeback（可选，高阶演示）

### C1) Writeback
- 打开 `/insight-writeback?exec_id=...`
- 填：
  - `operator_id=admin`
  - `confirm_token=WRITE_CONFIRM_TOKEN`
- 勾选审批 → **Approve & Write**
- 预期：`memory_writeback_*` 事件

### C2) Weight Update
- 输入 `memory_id`
- **Compute Recommendation** → **Approve Weight Update**
- 预期：`memory_weight_adjustment_*` 事件

---

## 4. Audience Talking Points
- **Router 权威**：只有 Confirm 后才执行
- **Human Gate 强制**：写操作必须人工批准
- **Audit 可回放**：事件链可查询与复盘
- **Memory append-only**：历史不覆盖，只新增

---

## 5. Troubleshooting
- `write_blocked_invalid_token`：检查 `WRITE_CONFIRM_TOKEN`
- 没有 Run 按钮：先 Confirm
- 模板下拉为空：确认 `/api/sql-templates/list` 返回 `data.file`
