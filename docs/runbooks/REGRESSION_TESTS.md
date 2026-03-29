# Unified Regression Tests (All Themes)

> 目标：一次性完成完整链路回归，输出 execution_id / outcome / audit 事件列表。

## 0) Preconditions
1) Admin OS 启动（非 read-only）
2) `WRITE_CONFIRM_TOKEN` 已设置
3) 可登录 `/login`

### 一键命令（自动拉起 dev + 回归 + UAT）
```bash
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os
BASE_URL=http://127.0.0.1:3003 npm run test:all:with-dev
```

### 可选：前端 E2E（Playwright）
首次运行：
```bash
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os
npm run test:e2e:install
```

```bash
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os
E2E_BASE_URL=http://127.0.0.1:3003 npm run test:e2e:admin
```

说明：
- 当前 `test:e2e:admin` 指向 `e2e/mvp-smoke.spec.ts`
- 目标是做稳定的 MVP 路由可达与关键控件烟测，不依赖登录白名单数据库状态

### 发布前一键预检（推荐）
```bash
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os
BASE_URL=http://127.0.0.1:3003 npm run release:preflight
```

如需包含 E2E：
```bash
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os
BASE_URL=http://127.0.0.1:3003 RUN_E2E=true npm run release:preflight
```

> 说明：`uat:pack` 现在会校验 `PHASE_ALL_SMOKE_REPORT.md` 新鲜度（默认 180 分钟内），避免“历史 PASS 报告误判”。可用 `UAT_MAX_REPORT_AGE_MINUTES` 调整阈值。

## 1) Template Read Path (Ops → Confirm → Run)
1) `/ops`
2) 勾选 **Use SQL Template (Read-only)**
3) 模板 `latest_executions`，Slots: `{"limit":3}`
4) **Create Execution** → 记录 `execution_id`
5) `/confirmations` → Confirm
6) `/operations` → Run
7) `/audit?exec_id=...` 验证：
   - `entry_created`
   - `execution_confirmed`
   - `sql_template_*`

## 2) Audit KPI + Export
1) `/audit?exec_id=...`
2) 切换 KPI 时间窗（200/500）
3) 点击 **Refresh**
4) Export JSON / CSV
5) `GET /api/audit/metrics` 验证返回 `business_counts`（question_type / error_code 聚合）

## 3) Replay / Compare
1) `/operations` → Replay
2) 如果 `mode=in_place`：保持同一 execution_id，打开 `/audit?exec_id=原id`
3) 如果返回新 execution_id：打开 `/audit?exec_id=新id`
4) `/outcome?exec_id=...`
5) 填 counterpart → **Compare With**

## 4) Writeback (Optional)
1) `/insight-writeback?exec_id=...`
2) 填 `operator_id` + `confirm_token`
3) **Approve & Write**
4) 验证 `memory_writeback_*`

## 5) Intent Demo (Natural Language)
1) `/ops` → Intent Demo
2) 任意示例 → **Analyze Intent**
3) 记录 intent + slots + trace
4) 验证 trace 包含：
   - `prompt_slug`
   - `prompt_version`
  - `source`（`supabase` 或 `fallback_csv`）

### UI 快速路径（新增）
1) `/ops` 使用快捷按钮（Vault/APY/执行详情/状态汇总）验证输入填充
2) `/marketing` 使用 `Fill Create A/B` 与 `Fill Example A/B` 验证模板填充
3) `/operations` 点击 `Copy ID`，并确认 `last_action_at` 可见
4) `/outcome` 点击 `Copy execution_id / Open Audit / Open Operations`

## 6) Prompt Source Fallback
1) 正常场景先跑一次 `/api/intent/analyze`，确认 `trace.source=supabase`（若线上可连）
2) 临时断开 DB（或改错 Supabase Key）后再跑 `/api/intent/analyze`
3) 验证返回仍成功，且 `trace.source=fallback_csv`
4) 恢复配置后重启服务
5) 可选快速检查：`GET /api/prompt/resolve?slug=intent_analyzer`

### 可控演练方式（推荐）
- 启动前设置：`PROMPT_REGISTRY_FORCE_FALLBACK=true`
- 重新请求 `/api/intent/analyze`，应看到 `trace.source=fallback_csv`
- 演练后恢复：`PROMPT_REGISTRY_FORCE_FALLBACK=false`

## 7) 输出记录（统一格式）
```
execution_id: <uuid>
outcome: success/failed
audit_events:
  - entry_created
  - execution_confirmed
  - sql_template_requested
  - sql_template_rendered
  - sql_template_executed
compare:
  counterpart_execution_id: <uuid>
  delta_count: <number>
audit_kpi:
  window: 200/500
  days: 7/30/90
  failure_reasons:
    - reason: <string>
      count: <number>
action_responses:
  replay:
    mode: in_place|child_execution
    execution_id: <uuid>
  retry:
    mode: child_execution
    execution_id: <uuid>
  expire:
    mode: in_place
    execution_id: <uuid>
prompt_trace:
  slug: <string>
  version: <string>
  source: supabase|fallback_csv
```
