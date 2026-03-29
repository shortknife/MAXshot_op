# Phase 5 — Stabilization Checklist

> 目标：减少回归噪声、保证演示链路稳定、明确已知风险边界。

## 1) Demo Path 稳定性
- [x] `/ops` Intent Demo 可用（Analyze Intent 正常返回）
- [x] `/ops` SQL Template 模式可创建 execution
- [x] `/confirmations` 可确认
- [x] `/operations` Run/Replay/Retry/Expire 可触发
- [x] `/audit` 可加载事件链
- [x] `/outcome` 可展示结果 + Compare

## 2) Write Path 稳定性
- [x] `WRITE_CONFIRM_TOKEN` 一致并已重启服务
- [x] `write_blocked_*` 仅出现在预期失败场景
- [x] `/insight-writeback` 可写入并产生日志

## 3) Audit KPI & Failure Reasons
- [x] KPI 时间窗切换正常（7/30/90 days）
- [x] Refresh 能更新统计
- [x] Failure Reasons 不包含过期噪声（或已注明范围）

## 4) SQL Tier2 预检
- [x] `sql_template_explain_op` 可用
- [x] 超阈值失败路径可审计
- [x] `SQL_EXPLAIN_MAX_TOTAL_COST` 可配置

## 5) 兼容与回退
- [x] Turbopack 关闭模式可启动
- [x] 无痕窗口访问避免扩展注入报错

## 6) 输出记录
```
execution_id: <uuid>
outcome: success/failed
audit_events: entry_created / execution_confirmed / sql_template_executed
notes: <any issues>
```

## 7) Residual Notes
- Failure reasons may still include historical entries if old windows are selected.
- Replay is normalized as `in_place` by default and appends audit events to same execution.
