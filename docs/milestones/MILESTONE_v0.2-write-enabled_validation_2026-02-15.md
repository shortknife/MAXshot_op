# MILESTONE — v0.2-write-enabled 验证通过 (2026-02-15)

## 1) 里程碑验证报告
**Milestone:** v0.2-write-enabled 端到端写入链路验证  
**日期:** 2026-02-15  
**范围:** Entry → Confirm → Execution → Writeback → Weight Apply  

**验证要点与结果：**
1. **Entry 写入（tasks_op / task_executions_op）**
   - ✅ 写入成功（task_id / execution_id 生成）
   - ✅ 状态机约束已对齐（pending_confirmation → confirmed）
2. **Human Gate & Confirm**
   - ✅ confirm API 成功返回
   - ✅ confirmation_result 写入
3. **Writeback（Memory Append-only）**
   - ✅ 写入成功，返回 memory_id
   - ✅ 原 Memory 保留不变，新增记录插入
4. **Weight Adjustment**
   - ✅ 推荐生成
   - ✅ 审批后写入
   - ✅ 审计三事件完整
5. **审计链完整性**
   - ✅ writeback 三事件写入
   - ✅ weight adjustment 三事件写入

**结论:**
本轮验证确认 **write-enabled 模式下 Human Gate → 写入 → 审计链完整**，可作为 v0.2-write-enabled 基线通过。

---

## 2) DB 对齐与问题修复总结
**核心问题：**
- 初始 DB schema 与代码写入字段不一致，导致连续 23514 / PGRST204 错误。

**已完成对齐：**
1. **tasks_op**
   - 约束：`task_type` 允许值 `ad_hoc/scheduled/long_running`
   - 修复：写入时使用 `ad_hoc`，入口信息落 `schedule_config`

2. **task_executions_op**
   - 新增字段（云端确认已补齐）：
     `entry_type, requester_id, intent_name, idempotency_key, reason_for_pending, confirmation_request, confirmation_result`
   - 保留已有字段：`payload, result, audit_log, status, execution_id, task_id`

3. **状态机约束**
   - 扩展 `task_executions_op_status_check`
   - 允许：`pending_confirmation / confirmed / rejected / in_progress / completed / failed / expired`

**结果:**
当前 DB 结构已与 v5.0 执行路径保持一致，写入链路可稳定运行。

---

## 3) 经验教训 / 后续开发约束
1. **DB 必须真实对齐再开发**
   - 任何写入 API 实现前，必须先读取 `information_schema`，避免字段/约束偏差。
2. **约束清单必须本地化**
   - 每次 DB 变更后，应导出 schema snapshot 到本地文档，否则无法快速定位。
3. **避免“猜字段”**
   - 如果字段未确认，严禁直接写入；优先落 JSONB 或补齐 schema。
4. **生产链路先跑最小闭环**
   - Entry → Confirm → Writeback 先跑通，再逐步开启 Weight / Evolution。
5. **模块分层必须避免引用 server-actions**
   - UI/API 应引用 admin-os/lib 层，避免跨包路径失效。
