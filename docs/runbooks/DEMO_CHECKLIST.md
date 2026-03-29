# Demo Checklist (Phase 1)

> 目的：现场演示时快速逐步确认，确保链路可用、审计可见。

---

## ✅ 0. 环境检查
- [ ] Admin OS 已启动（非 read-only）
- [ ] `WRITE_CONFIRM_TOKEN` 可用
- [ ] 可登录 `/login`

---

## ✅ 1. Ops 模板执行（主流程）
**目标**：Create → Confirm → Run → Audit → Outcome

- [ ] `/ops` 可选：Intent Demo 一键示例 + Analyze Intent
- [ ] `/ops` 选择模板 `latest_executions`
- [ ] Slots 输入 `{ "limit": 3 }`
- [ ] 点击 **Create Execution**
- [ ] `/confirmations` → Confirm
- [ ] `/operations` → Run
- [ ] `/audit?exec_id=...` 验证事件链
- [ ] `/outcome?exec_id=...` 查看结果

---

## ✅ 2. 审计检查
- [ ] `entry_created`
- [ ] `execution_confirmed`
- [ ] `sql_template_*`

---

## ✅ 3. Replay / Compare（可选）
- [ ] `/operations` → Replay
- [ ] `/outcome` 输入 counterpart → Compare With

---

## ✅ 4. Writeback（可选）
- [ ] `/insight-writeback?exec_id=...`
- [ ] 填 `operator_id` + `confirm_token`
- [ ] Approve & Write
- [ ] 事件：`memory_writeback_*`

---

## ✅ 5. 收尾
- [ ] 演示结论：Router 权威 / Human Gate / Audit 可追溯
