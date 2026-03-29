# CC-03 Publisher — 产品级契约

> **Owner**: LEO  
> **版本**: v1.0 | **阶段**: P0  
> **依据**: MAXshot_产品架构设计_v5.1 §2.1 Side Effect 确认机制

---

## 1. 产品定义

Publisher 负责将内容发布到目标渠道（Twitter/X、Notion 等），并在发布后触发 Feedback Recorder 记录初始数据。所有发布操作都是 Side Effect，必须经过用户确认。

**一句话**：确认→发布→记录，缺一不可。

---

## 2. 发布流程（强制顺序）

```
1. 收到发布请求
2. 写入 task_executions，status = 'pending_confirmation'
3. 用户在 Admin OS 弹窗确认（Phase 1）
4. 确认后：执行发布 → status = 'executing'
5. 发布成功：status = 'completed' → 触发 Tagger + Feedback Recorder
6. 发布失败：status = 'failed'，记录 reason，不触发 Feedback
7. 用户拒绝：status = 'rejected'，不执行，不触发 Feedback
```

---

## 3. 输入

```
content_id: string              // 待发布内容 ID
channel: 'twitter' | 'notion' | string
publish_type: 'single_tweet' | 'thread' | 'notion_sync'
scheduled_at: string | null     // null 表示立即发布
execution_id: string            // 关联的 execution
user_id: string
```

---

## 4. 输出

```
status: 'pending_confirmation' | 'completed' | 'failed' | 'rejected'
task_execution_id: string
published_url: string | null    // 发布成功后的内容链接
channel: string
published_at: string | null
failure_reason: string | null
feedback_triggered: boolean     // 是否已触发 Feedback Recorder
```

---

## 5. Side Effect 规则（核心）

| 场景 | 处理方式 |
|------|---------|
| 所有发布请求 | 必须进入 `pending_confirmation`，等待用户在 Admin OS 确认 |
| Cron 定时发布 | 配置时已确认，执行时**不需要**每次确认 |
| 批量发布 | 每批次作为一个确认单元，不逐条确认 |
| 发布失败重试 | 需要用户重新触发，不自动重试 |

**禁止**：任何绕过 `pending_confirmation` 直接发布的路径

---

## 6. Feedback 触发规则

- 仅在 `status = 'completed'`（发布成功）时触发
- 触发内容：Tagger（打标签）+ Feedback Recorder（写初始内部数据）
- 初始 Feedback 数据来源：`execution_logs`（成功率）、`publishing_logs`（发布时间）
- 外部数据（阅读量、互动率）：Phase 2+ 接入，表结构已预留

---

## 7. 确认渠道规划

| Phase | 确认方式 |
|-------|---------|
| Phase 1（MVP）| Admin OS 弹窗确认 |
| Phase 2+ | 补充 TG Bot `/approve [execution_id]` 命令 |

---

## 8. 验收标准

- [ ] 所有非 Cron 发布请求必须经过 `pending_confirmation` 状态
- [ ] Admin OS 确认界面正确展示待确认内容（内容预览、渠道、发布时间）
- [ ] 发布成功后 Tagger 和 Feedback Recorder 被正确触发
- [ ] 发布失败时 `status = 'failed'`，且不触发 Feedback
- [ ] 用户拒绝时 `status = 'rejected'`，内容不被发布
- [ ] `task_execution_id` 在输出中存在，可追溯

---

## 9. 场景对话示例（验收基线 & 跨角色共识）

**场景 A：正常发布流程（Happy Path）**
```
[ContentGenerator 生成草稿完成]
Admin OS 显示: 待确认发布 — "Yield isn't luck—it's discipline..." → Twitter/X
用户点击: [确认发布]
系统: 发布成功 ✅ 链接: https://x.com/maxshot/status/...
      Tagger + Feedback Recorder 已触发
```

**场景 B：用户拒绝发布**
```
Admin OS 显示: 待确认发布 — "DeFi 金库 APY 暴涨..."
用户点击: [拒绝]
系统: 已取消发布，内容不会被发送。状态: rejected
```

**场景 C：发布失败**
```
用户点击: [确认发布]
系统: 发布失败 ❌ 原因: Twitter API 限流
      状态: failed / Feedback 未触发
      如需重试，请重新触发发布。
```

**场景 D：定时发布（Cron）**
```
[Notion 内容日历：2026-02-27 09:00 发布]
系统自动执行:（配置时已确认，无需每次确认）
      发布成功 ✅ → Tagger + Feedback 自动触发
```

---

## 10. 不在本 Capability 范围内

- 内容生成（属于 ContentGenerator）
- 内容选题与排队（属于 ContentGenerator 上游）
- 渠道 API 凭证管理（属于系统配置层）

---

**契约版本**: v1.0 | **最后更新**: 2026-02-19
