# CC-01 Router — 产品级契约

> **Owner**: LEO  
> **版本**: v1.0 | **阶段**: P0  
> **依据**: MAXshot_产品架构设计_v5.1 §2.2

---

## 1. 产品定义

Router 是 MAXshot 的请求调度中枢。它负责识别请求来源、判断意图类型，并将请求分发到对应的 Capability，全程不依赖 LLM 做决策。

**一句话**：确定性的意图→能力映射器，不猜测、不推断、不生成。

---

## 2. 入口分工

| 入口类型 | 来源 | 意图解析 | Grey Area | 典型场景 |
|---------|------|---------|-----------|---------|
| `raw_query` | TG Bot | 需要 Intent Parser | 完整走 | "最近 7 天 ETH 的 APY" |
| `structured` | Admin OS | 跳过（意图从操作直接获取） | 条件走 ① | 点击"查询市场指标"按钮 |
| `timeline` | Notion Cron | 跳过（意图固定） | 跳过 | 每周一自动生成周报 |

① `structured` 的 Grey Area 规则：只读查询直通；发布类操作仍需确认弹窗

---

## 3. 输入

```
entry_type: 'raw_query' | 'structured' | 'timeline'
user_query: string              // raw_query 时为自然语言
intent_name: string             // structured/timeline 时直接提供
session_id: string
user_id: string
```

---

## 4. 输出

```
capability: string              // 目标 Capability 名称
intent: string                  // 解析后的标准意图
entry_type: string              // 透传
status: 'dispatched' | 'pending_confirmation' | 'rejected'
reason: string                  // status 非 dispatched 时的原因
memory_refs: string[]           // 关联的 Memory 引用 ID 列表
```

---

## 5. Side Effect 规则

| 操作 | 是否 Side Effect | 处理方式 |
|------|----------------|---------|
| 只读查询 | ❌ | 直接 dispatch |
| 发布内容 | ✅ | 写入 `pending_confirmation`，等待用户在 Admin OS 确认 |
| 批量操作 | ✅ | 同上，必须确认 |
| Cron 定时任务 | ❌（配置时已确认） | 直接 dispatch |

---

## 6. 验收标准

- [ ] Router 不包含任何 LLM 节点或 LLM 调用
- [ ] 三种 `entry_type` 各自路由逻辑正确、互不混淆
- [ ] 发布类请求必须进入 `pending_confirmation`，不可直接执行
- [ ] `memory_refs` 字段在输出中存在（允许为空数组）
- [ ] `raw_query` 进 Intent Parser → Grey Area 完整走完
- [ ] `timeline` 跳过 Intent Parser 和 Grey Area，直接 dispatch

---

## 7. 不在本 Capability 范围内

- Intent Parser 的具体实现（属于 Intent Analyzer 模块）
- SQL 生成、内容生成等具体 Capability 的执行逻辑
- 用户认证与权限校验

---

**契约版本**: v1.0 | **最后更新**: 2026-02-19
