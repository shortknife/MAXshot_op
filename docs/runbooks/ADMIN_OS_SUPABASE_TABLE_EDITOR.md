# Admin OS — Supabase Table Editor 配置指引

## 1. RLS 确认步骤
1) 打开 Supabase → Table Editor → 选择 `_op` 表
2) 确认 RLS 已开启（Enabled）
3) 确认策略：
   - `service_role`: ALL
   - `authenticated`: SELECT

## 2. Table Editor 配置建议
- 固定显示列：`execution_id`, `status`, `intent_name`, `requester_id`, `created_at`
- 默认排序：`created_at DESC`
- 对 `status` 增加快速筛选
- 建议保存常用过滤器：
  - `status = pending_confirmation`
  - `status = failed`
  - `intent_name ILIKE '%ops%'`

## 3. 视图 / 筛选 / 权限配置步骤
- 建议创建视图：
  - `view_recent_executions`
  - `view_pending_confirmations`
- 只读视图设置：
  - 仅 `SELECT` 权限给 `authenticated`

## 4. Admin OS 环境变量确认
- `NEXT_PUBLIC_SUPABASE_URL` 已填写
- `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` 已填写
- `WRITE_CONFIRM_TOKEN` 已填写（用于写操作确认）

## 5. 截图占位（请你后续补）
- [ ] RLS 开关截图
- [ ] Table Editor 列配置截图
- [ ] 视图列表截图
